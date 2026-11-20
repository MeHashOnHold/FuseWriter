use tauri::State;
use tauri::ipc::Channel;
use tokio_util::sync::CancellationToken;

use crate::error::AppError;
use crate::providers::AiProvider;
use crate::providers::openai_compat::{Kind, OpenAiCompatProvider};
use crate::secrets;
use crate::settings::{Settings, host_of, is_loopback_host};
use crate::state::AppState;
use crate::types::{AiErrorCode, AiEvent, AiRequest};

/// Cloud privacy policy, checked before any cloud request.
/// Pure function so it is unit-testable (Plan.md M4-T05 step 6).
pub fn check_cloud_policy(
    settings: &Settings,
    has_key: bool,
    origin: &str,
) -> Result<(), AppError> {
    if settings.cloud.base_url.is_empty() || settings.cloud.model.is_empty() {
        return Err(AiErrorCode::BadUrl.into());
    }
    let host = host_of(&settings.cloud.base_url);
    if !has_key && !is_loopback_host(&host) {
        return Err(AiErrorCode::NoApiKey.into());
    }
    if !settings.cloud.consent_hosts.iter().any(|h| h == &host) {
        return Err(AiErrorCode::ConsentRequired.into());
    }
    if origin == "auto" && !settings.auto_check.allow_cloud {
        return Err(AiErrorCode::AutoCloudBlocked.into());
    }
    Ok(())
}

#[tauri::command]
pub async fn ai_complete(
    state: State<'_, AppState>,
    request_id: String,
    request: AiRequest,
    on_event: Channel<AiEvent>,
) -> Result<(), AppError> {
    let settings = {
        let guard = state.settings.lock().map_err(|_| AppError::Internal)?;
        guard.clone()
    };
    if request.engine != settings.engine {
        return Err(AiErrorCode::NoEngine.into());
    }
    if request.engine == "local" {
        // Replaced by the real local provider in M6.
        return Err(AiErrorCode::LocalNotInstalled.into());
    }
    if request.engine != "cloud" {
        return Err(AiErrorCode::NoEngine.into());
    }
    let key = secrets::stored_key()?;
    check_cloud_policy(
        &settings,
        key.as_deref().is_some_and(|k| !k.is_empty()),
        &request.origin,
    )?;
    let provider = OpenAiCompatProvider::new(
        settings.cloud.base_url.clone(),
        key,
        settings.cloud.model.clone(),
        Kind::Cloud,
        settings.cloud.temperature,
    )?;
    let token = CancellationToken::new();
    {
        let mut guard = state.cancels.lock().map_err(|_| AppError::Internal)?;
        guard.insert(request_id.clone(), token.clone());
    }
    let result = provider
        .chat_stream(&request.prompt, request.max_tokens, token, |t| {
            let _ = on_event.send(AiEvent::Token {
                text: t.to_string(),
            });
        })
        .await;
    {
        let mut guard = state.cancels.lock().map_err(|_| AppError::Internal)?;
        guard.remove(&request_id);
    }
    match result {
        Ok(text) => {
            let _ = on_event.send(AiEvent::Done { text });
            Ok(())
        }
        Err(e) => {
            let code = e.ai_code().unwrap_or(AiErrorCode::Server);
            let _ = on_event.send(AiEvent::Error {
                code,
                message: code.message().to_string(),
            });
            Err(e)
        }
    }
}

#[tauri::command]
pub fn ai_cancel(state: State<'_, AppState>, request_id: String) -> Result<(), AppError> {
    let guard = state.cancels.lock().map_err(|_| AppError::Internal)?;
    if let Some(token) = guard.get(&request_id) {
        token.cancel();
    }
    Ok(())
}

/// Inner test-connection logic (the command wraps this).
pub async fn test_connection(
    base_url: &str,
    model: &str,
    api_key: Option<String>,
) -> Result<(), AppError> {
    let provider = OpenAiCompatProvider::new(
        base_url.to_string(),
        api_key,
        model.to_string(),
        Kind::Cloud,
        None,
    )?;
    provider
        .complete_once("Reply with the single word: ok", 8)
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn ai_test_connection(
    base_url: String,
    model: String,
    api_key: Option<String>,
) -> Result<(), AppError> {
    // No consent check here: the human is clicking a Test button.
    let key = match api_key {
        Some(k) if !k.is_empty() => Some(k),
        _ => secrets::stored_key()?,
    };
    test_connection(&base_url, &model, key).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn cloud_settings() -> Settings {
        Settings {
            engine: "cloud".to_string(),
            cloud: crate::settings::Cloud {
                base_url: "https://api.example.com/v1".to_string(),
                model: "some-model".to_string(),
                consent_hosts: vec!["api.example.com".to_string()],
                ..Default::default()
            },
            ..Default::default()
        }
    }

    #[test]
    fn ai_policy_ok_for_user_origin() {
        let s = cloud_settings();
        assert!(check_cloud_policy(&s, true, "user").is_ok());
    }

    #[test]
    fn ai_policy_consent_required() {
        let mut s = cloud_settings();
        s.cloud.consent_hosts = vec![];
        let err = check_cloud_policy(&s, true, "user").expect_err("must block");
        assert_eq!(err.ai_code(), Some(AiErrorCode::ConsentRequired));
    }

    #[test]
    fn ai_policy_no_api_key() {
        let s = cloud_settings();
        let err = check_cloud_policy(&s, false, "user").expect_err("must block");
        assert_eq!(err.ai_code(), Some(AiErrorCode::NoApiKey));
    }

    #[test]
    fn ai_policy_auto_cloud_blocked() {
        let s = cloud_settings();
        let err = check_cloud_policy(&s, true, "auto").expect_err("must block");
        assert_eq!(err.ai_code(), Some(AiErrorCode::AutoCloudBlocked));
        let mut s2 = cloud_settings();
        s2.auto_check.allow_cloud = true;
        assert!(check_cloud_policy(&s2, true, "auto").is_ok());
    }

    #[test]
    fn ai_policy_loopback_needs_no_key() {
        let mut s = cloud_settings();
        s.cloud.base_url = "http://localhost:1234/v1".to_string();
        s.cloud.consent_hosts = vec!["localhost".to_string()];
        assert!(check_cloud_policy(&s, false, "user").is_ok());
    }

    #[test]
    fn ai_policy_bad_url_when_unconfigured() {
        let mut s = cloud_settings();
        s.cloud.model = String::new();
        let err = check_cloud_policy(&s, true, "user").expect_err("must block");
        assert_eq!(err.ai_code(), Some(AiErrorCode::BadUrl));
    }

    #[tokio::test]
    async fn ai_test_connection_ok() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(json!({"choices":[{"message":{"content":"ok"}}]})),
            )
            .mount(&server)
            .await;
        let r = test_connection(&server.uri(), "m", Some("k".to_string())).await;
        assert!(r.is_ok());
    }

    #[tokio::test]
    async fn ai_test_connection_401() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/chat/completions"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&server)
            .await;
        let err = test_connection(&server.uri(), "m", Some("bad".to_string()))
            .await
            .expect_err("must fail");
        assert_eq!(err.ai_code(), Some(AiErrorCode::Unauthorized));
    }
}
