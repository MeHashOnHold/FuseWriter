use serde::Serialize;

/// What the checker returns for one mark. Offsets are UTF-16 code units,
/// relative to the text that was sent. Mirrors Section 6 of the plan.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RawSuggestion {
    pub start: usize,
    pub end: usize,
    pub original: String,
    pub replacement: String,
    pub alternatives: Vec<String>,
    pub kind: RawKind,
    pub reason: String,
    pub safe_to_auto_apply: bool,
}

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RawKind {
    Spelling,
    Grammar,
}

/// Result of the `check_text` command.
#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CheckResult {
    pub suggestions: Vec<RawSuggestion>,
    pub elapsed_ms: u64,
}

/// AI error codes, mirroring the TypeScript `AiErrorCode` union (Section 6).
#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AiErrorCode {
    NoEngine,
    NoApiKey,
    BadUrl,
    ConsentRequired,
    AutoCloudBlocked,
    Unauthorized,
    NotFound,
    RateLimited,
    Network,
    Timeout,
    Server,
    Cancelled,
    Empty,
    LocalNotInstalled,
    LocalStartFailed,
}

impl AiErrorCode {
    pub fn as_str(&self) -> &'static str {
        match self {
            AiErrorCode::NoEngine => "no_engine",
            AiErrorCode::NoApiKey => "no_api_key",
            AiErrorCode::BadUrl => "bad_url",
            AiErrorCode::ConsentRequired => "consent_required",
            AiErrorCode::AutoCloudBlocked => "auto_cloud_blocked",
            AiErrorCode::Unauthorized => "unauthorized",
            AiErrorCode::NotFound => "not_found",
            AiErrorCode::RateLimited => "rate_limited",
            AiErrorCode::Network => "network",
            AiErrorCode::Timeout => "timeout",
            AiErrorCode::Server => "server",
            AiErrorCode::Cancelled => "cancelled",
            AiErrorCode::Empty => "empty",
            AiErrorCode::LocalNotInstalled => "local_not_installed",
            AiErrorCode::LocalStartFailed => "local_start_failed",
        }
    }

    /// Short user-facing message. Never contains user text or secrets.
    pub fn message(&self) -> &'static str {
        match self {
            AiErrorCode::NoEngine => "No AI engine is configured.",
            AiErrorCode::NoApiKey => "No API key is saved.",
            AiErrorCode::BadUrl => "The server URL is not valid.",
            AiErrorCode::ConsentRequired => {
                "Permission is needed before sending text to this server."
            }
            AiErrorCode::AutoCloudBlocked => "Automatic cloud checks are not allowed in settings.",
            AiErrorCode::Unauthorized => "The server rejected the API key.",
            AiErrorCode::NotFound => "The server or model was not found.",
            AiErrorCode::RateLimited => "The server is rate limiting requests.",
            AiErrorCode::Network => "Could not reach the server.",
            AiErrorCode::Timeout => "The server took too long to respond.",
            AiErrorCode::Server => "The server returned an error.",
            AiErrorCode::Cancelled => "Cancelled.",
            AiErrorCode::Empty => "The server returned an empty response.",
            AiErrorCode::LocalNotInstalled => "The local model is not installed yet.",
            AiErrorCode::LocalStartFailed => "The local model failed to start.",
        }
    }
}

/// One AI request from the webview (Section 6).
#[derive(serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AiRequest {
    pub engine: String, // "local" | "cloud"
    pub origin: String, // "user" | "auto"
    pub task: String,   // "check" | "rewrite" | "summarize"
    pub prompt: String,
    pub max_tokens: u32,
}

/// Events streamed to the webview during `ai_complete` (Section 6).
#[derive(Serialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AiEvent {
    Token { text: String },
    Done { text: String },
    Error { code: AiErrorCode, message: String },
}
