use futures_util::StreamExt;
use serde_json::{Value, json};
use tokio_util::sync::CancellationToken;

use crate::error::AppError;
use crate::providers::AiProvider;
use crate::providers::sse::{SseEvent, SseParser, delta_text};
use crate::types::AiErrorCode;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kind {
    Local,
    Cloud,
}

/// One OpenAI-compatible chat-completions client serving both the
/// local llama-server and any cloud API. Only the config differs.
pub struct OpenAiCompatProvider {
    client: reqwest::Client,
    base_url: String,
    api_key: Option<String>,
    model: String,
    kind: Kind,
    temperature: Option<f32>,
    local_extras: bool,
}

impl OpenAiCompatProvider {
    pub fn new(
        base_url: String,
        api_key: Option<String>,
        model: String,
        kind: Kind,
        temperature: Option<f32>,
    ) -> Result<Self, AppError> {
        let client = reqwest::Client::builder()
            .connect_timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|_| AppError::Ai(AiErrorCode::Network))?;
        Ok(Self {
            client,
            base_url,
            api_key,
            model,
            kind,
            temperature,
            local_extras: kind == Kind::Local,
        })
    }

    pub fn endpoint(&self) -> String {
        format!("{}/chat/completions", self.base_url.trim_end_matches('/'))
    }

    /// Request body per Plan.md Section 7. Local requests always carry
    /// temperature 0.2 and thinking off; cloud requests carry a
    /// temperature only when one is configured.
    pub fn build_body(&self, prompt: &str, max_tokens: u32, stream: bool) -> Value {
        let mut body = json!({
            "model": self.model,
            "messages": [{ "role": "user", "content": prompt }],
            "stream": stream,
            "max_tokens": max_tokens,
        });
        if self.local_extras {
            body["temperature"] = json!(0.2);
            body["chat_template_kwargs"] = json!({ "enable_thinking": false });
        } else if let Some(t) = self.temperature {
            body["temperature"] = json!(t);
        }
        body
    }

    pub fn map_status(status: u16) -> AiErrorCode {
        match status {
            401 | 403 => AiErrorCode::Unauthorized,
            404 => AiErrorCode::NotFound,
            429 => AiErrorCode::RateLimited,
            500..=599 => AiErrorCode::Server,
            _ => AiErrorCode::Server,
        }
    }

    fn request(&self, prompt: &str, max_tokens: u32, stream: bool) -> reqwest::RequestBuilder {
        let mut req = self
            .client
            .post(self.endpoint())
            .json(&self.build_body(prompt, max_tokens, stream));
        if let Some(key) = &self.api_key {
            req = req.bearer_auth(key);
        }
        req
    }

    /// Non-streaming completion: returns `choices[0].message.content`.
    pub async fn complete_once(&self, prompt: &str, max_tokens: u32) -> Result<String, AppError> {
        let resp = self
            .request(prompt, max_tokens, false)
            .send()
            .await
            .map_err(map_reqwest_error)?;
        let status = resp.status();
        if !status.is_success() {
            return Err(AppError::Ai(Self::map_status(status.as_u16())));
        }
        let v: Value = resp
            .json()
            .await
            .map_err(|_| AppError::Ai(AiErrorCode::Server))?;
        let content = v["choices"][0]["message"]["content"]
            .as_str()
            .ok_or(AppError::Ai(AiErrorCode::Empty))?;
        Ok(content.to_string())
    }
}

fn map_reqwest_error(e: reqwest::Error) -> AppError {
    if e.is_timeout() {
        AppError::Ai(AiErrorCode::Timeout)
    } else {
        // Connect failures and everything else: no details leak out.
        AppError::Ai(AiErrorCode::Network)
    }
}

impl AiProvider for OpenAiCompatProvider {
    fn sends_text_off_device(&self) -> bool {
        self.kind == Kind::Cloud
    }

    async fn chat_stream(
        &self,
        prompt: &str,
        max_tokens: u32,
        cancel: CancellationToken,
        mut on_token: impl FnMut(&str) + Send,
    ) -> Result<String, AppError> {
        let req = self.request(prompt, max_tokens, true);
        let resp = tokio::select! {
            _ = cancel.cancelled() => return Err(AppError::Ai(AiErrorCode::Cancelled)),
            r = req.send() => r.map_err(map_reqwest_error)?,
        };
        let status = resp.status();
        if !status.is_success() {
            return Err(AppError::Ai(Self::map_status(status.as_u16())));
        }
        let mut stream = resp.bytes_stream();
        let mut parser = SseParser::new();
        let mut full = String::new();
        loop {
            let next = tokio::select! {
                _ = cancel.cancelled() => return Err(AppError::Ai(AiErrorCode::Cancelled)),
                n = tokio::time::timeout(std::time::Duration::from_secs(30), stream.next()) => n,
            };
            let chunk = match next {
                Ok(Some(Ok(bytes))) => bytes,
                Ok(Some(Err(_))) => return Err(AppError::Ai(AiErrorCode::Network)),
                Ok(None) => break,
                Err(_) => return Err(AppError::Ai(AiErrorCode::Timeout)),
            };
            for ev in parser.push(&chunk) {
                match ev {
                    SseEvent::Done => {
                        if full.trim().is_empty() {
                            return Err(AppError::Ai(AiErrorCode::Empty));
                        }
                        return Ok(full);
                    }
                    SseEvent::Data(data) => {
                        if let Some(delta) = delta_text(&data) {
                            full.push_str(&delta);
                            on_token(&delta);
                        }
                    }
                }
            }
        }
        if full.trim().is_empty() {
            return Err(AppError::Ai(AiErrorCode::Empty));
        }
        Ok(full)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn provider(
        base: String,
        key: Option<String>,
        kind: Kind,
        temp: Option<f32>,
    ) -> OpenAiCompatProvider {
        OpenAiCompatProvider::new(base, key, "test-model".to_string(), kind, temp)
            .expect("provider")
    }

    #[test]
    fn openai_map_status() {
        assert_eq!(
            OpenAiCompatProvider::map_status(401),
            AiErrorCode::Unauthorized
        );
        assert_eq!(
            OpenAiCompatProvider::map_status(403),
            AiErrorCode::Unauthorized
        );
        assert_eq!(OpenAiCompatProvider::map_status(404), AiErrorCode::NotFound);
        assert_eq!(
            OpenAiCompatProvider::map_status(429),
            AiErrorCode::RateLimited
        );
        assert_eq!(OpenAiCompatProvider::map_status(500), AiErrorCode::Server);
    }

    #[test]
    fn openai_build_body_local_extras() {
        let p = provider("http://localhost:1/v1".into(), None, Kind::Local, None);
        let b = p.build_body("hi", 10, true);
        assert_eq!(b["temperature"], json!(0.2));
        assert_eq!(b["chat_template_kwargs"]["enable_thinking"], json!(false));
        assert_eq!(b["stream"], json!(true));
    }

    #[test]
    fn openai_build_body_cloud_no_temperature_by_default() {
        let p = provider("https://x.example/v1".into(), None, Kind::Cloud, None);
        let b = p.build_body("hi", 10, false);
        assert!(b.get("temperature").is_none());
        assert!(b.get("chat_template_kwargs").is_none());
    }

    #[test]
    fn openai_build_body_cloud_with_temperature() {
        let p = provider("https://x.example/v1".into(), None, Kind::Cloud, Some(0.7));
        let b = p.build_body("hi", 10, false);
        // f32 0.7 widens to a slightly different f64; compare with tolerance.
        let t = b["temperature"].as_f64().expect("temperature present");
        assert!((t - 0.7).abs() < 0.001);
        assert!(b.get("chat_template_kwargs").is_none());
    }

    #[tokio::test]
    async fn openai_complete_once_success_and_auth_header() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .and(header("authorization", "Bearer k123"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(json!({"choices":[{"message":{"content":"ok"}}]})),
            )
            .mount(&server)
            .await;
        let p = provider(server.uri(), Some("k123".into()), Kind::Cloud, None);
        let out = p.complete_once("say ok", 8).await.expect("complete");
        assert_eq!(out, "ok");
    }

    #[tokio::test]
    async fn openai_complete_once_no_auth_header_without_key() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(json!({"choices":[{"message":{"content":"ok"}}]})),
            )
            .mount(&server)
            .await;
        let p = provider(server.uri(), None, Kind::Cloud, None);
        p.complete_once("say ok", 8).await.expect("complete");
        let reqs = server.received_requests().await.expect("recorded");
        assert_eq!(reqs.len(), 1);
        assert!(reqs[0].headers.get("authorization").is_none());
    }

    #[tokio::test]
    async fn openai_complete_once_401_is_unauthorized() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&server)
            .await;
        let p = provider(server.uri(), Some("bad".into()), Kind::Cloud, None);
        let err = p.complete_once("x", 8).await.expect_err("should fail");
        assert_eq!(err.ai_code(), Some(AiErrorCode::Unauthorized));
    }

    #[tokio::test]
    async fn openai_stream_tokens_in_order() {
        let server = MockServer::start().await;
        let body = concat!(
            "data: {\"choices\":[{\"delta\":{\"content\":\"Hel\"}}]}\n\n",
            "data: {\"choices\":[{\"delta\":{\"content\":\"lo\"}}]}\n\n",
            "data: [DONE]\n\n"
        );
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_string(body)
                    .insert_header("content-type", "text/event-stream"),
            )
            .mount(&server)
            .await;
        let p = provider(server.uri(), None, Kind::Cloud, None);
        let mut tokens: Vec<String> = Vec::new();
        let full = p
            .chat_stream("x", 16, CancellationToken::new(), |t| {
                tokens.push(t.to_string())
            })
            .await
            .expect("stream");
        assert_eq!(full, "Hello");
        assert_eq!(tokens, vec!["Hel".to_string(), "lo".to_string()]);
    }

    #[tokio::test]
    async fn openai_stream_cancel_stops() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_string("data: [DONE]\n\n")
                    .set_delay(std::time::Duration::from_secs(5)),
            )
            .mount(&server)
            .await;
        let p = provider(server.uri(), None, Kind::Cloud, None);
        let token = CancellationToken::new();
        let canceller = token.clone();
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(150)).await;
            canceller.cancel();
        });
        let started = std::time::Instant::now();
        let err = p
            .chat_stream("x", 16, token, |_| {})
            .await
            .expect_err("should cancel");
        assert_eq!(err.ai_code(), Some(AiErrorCode::Cancelled));
        assert!(started.elapsed() < std::time::Duration::from_secs(3));
    }
}
