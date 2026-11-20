/// Server-Sent Events parsing for streamed chat completions.

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SseEvent {
    Data(String),
    Done,
}

/// Incremental SSE parser: feed it byte chunks, get completed events.
pub struct SseParser {
    buf: Vec<u8>,
    data: Vec<String>,
}

impl SseParser {
    pub fn new() -> Self {
        Self {
            buf: Vec::new(),
            data: Vec::new(),
        }
    }

    pub fn push(&mut self, chunk: &[u8]) -> Vec<SseEvent> {
        self.buf.extend_from_slice(chunk);
        let mut events = Vec::new();
        while let Some(pos) = self.buf.iter().position(|b| *b == b'\n') {
            let line_bytes: Vec<u8> = self.buf.drain(..=pos).collect();
            // Decode only once the full line is available, so multi-byte
            // characters split across chunks survive.
            let mut line = String::from_utf8_lossy(&line_bytes).into_owned();
            if line.ends_with('\n') {
                line.pop();
            }
            if line.ends_with('\r') {
                line.pop();
            }
            self.handle_line(&line, &mut events);
        }
        events
    }

    fn handle_line(&mut self, line: &str, events: &mut Vec<SseEvent>) {
        if line.is_empty() {
            if !self.data.is_empty() {
                let joined = self.data.join("\n");
                self.data.clear();
                if joined == "[DONE]" {
                    events.push(SseEvent::Done);
                } else {
                    events.push(SseEvent::Data(joined));
                }
            }
            return;
        }
        if line.starts_with(':') {
            return; // comment / keepalive
        }
        if let Some(rest) = line.strip_prefix("data:") {
            let text = rest.strip_prefix(' ').unwrap_or(rest);
            self.data.push(text.to_string());
        }
        // Other fields (event:, id:, retry:) are ignored.
    }
}

impl Default for SseParser {
    fn default() -> Self {
        Self::new()
    }
}

/// The streamed text of one SSE data payload: `choices[0].delta.content`
/// when it is a non-empty string. `reasoning_content` is ignored.
pub fn delta_text(json: &str) -> Option<String> {
    let v: serde_json::Value = serde_json::from_str(json).ok()?;
    let content = v["choices"][0]["delta"]["content"].as_str()?;
    if content.is_empty() {
        None
    } else {
        Some(content.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ev(json_content: &str) -> String {
        format!("data: {{\"choices\":[{{\"delta\":{{\"content\":\"{json_content}\"}}}}]}}\n\n")
    }

    #[test]
    fn sse_one_event_one_chunk() {
        let mut p = SseParser::new();
        let out = p.push(ev("hi").as_bytes());
        assert_eq!(out.len(), 1);
        assert!(matches!(out[0], SseEvent::Data(_)));
    }

    #[test]
    fn sse_event_split_across_chunks() {
        let mut p = SseParser::new();
        let full = ev("hello");
        let bytes = full.as_bytes();
        assert!(p.push(&bytes[..5]).is_empty());
        assert!(p.push(&bytes[5..12]).is_empty());
        let out = p.push(&bytes[12..]);
        assert_eq!(out.len(), 1);
    }

    #[test]
    fn sse_two_events_one_chunk() {
        let mut p = SseParser::new();
        let out = p.push(format!("{}{}", ev("a"), ev("b")).as_bytes());
        assert_eq!(out.len(), 2);
    }

    #[test]
    fn sse_crlf_endings() {
        let mut p = SseParser::new();
        let out = p.push(b"data: x\r\n\r\n");
        assert_eq!(out, vec![SseEvent::Data("x".to_string())]);
    }

    #[test]
    fn sse_comment_lines_ignored() {
        let mut p = SseParser::new();
        let out = p.push(b": keepalive\n\ndata: y\n\n");
        assert_eq!(out, vec![SseEvent::Data("y".to_string())]);
    }

    #[test]
    fn sse_done_marker() {
        let mut p = SseParser::new();
        let out = p.push(b"data: [DONE]\n\n");
        assert_eq!(out, vec![SseEvent::Done]);
    }

    #[test]
    fn sse_multibyte_char_split_across_chunks() {
        let mut p = SseParser::new();
        let full = "data: café\n\n";
        let bytes = full.as_bytes();
        // Split inside the 2-byte é (bytes 8..10 of the line).
        let split = full.find('é').expect("é present") + 1;
        assert!(p.push(&bytes[..split]).is_empty());
        let out = p.push(&bytes[split..]);
        assert_eq!(out, vec![SseEvent::Data("café".to_string())]);
        let _ = bytes;
    }

    #[test]
    fn sse_delta_text_cases() {
        assert_eq!(
            delta_text(r#"{"choices":[{"delta":{"content":"word"}}]}"#),
            Some("word".to_string())
        );
        assert_eq!(
            delta_text(r#"{"choices":[{"delta":{"content":""}}]}"#),
            None
        );
        assert_eq!(
            delta_text(r#"{"choices":[{"delta":{"reasoning_content":"thinking"}}]}"#),
            None
        );
        assert_eq!(delta_text("not json"), None);
    }
}
