pub mod openai_compat;
pub mod sse;

use tokio_util::sync::CancellationToken;

use crate::error::AppError;
use crate::harper::HarperEngine;
use crate::types::RawSuggestion;

/// Synchronous-style grammar checking (always local: Harper).
pub trait GrammarProvider {
    fn check(&mut self, text: &str) -> Vec<RawSuggestion>;
}

impl GrammarProvider for HarperEngine {
    fn check(&mut self, text: &str) -> Vec<RawSuggestion> {
        crate::commands::check::run_check(self, text)
    }
}

/// Streaming AI completion. One concrete type implements this
/// (`OpenAiCompatProvider`); local and cloud differ only in config.
/// Static dispatch only — async trait methods are not object-safe,
/// and Send bounds are handled at the call site (Plan.md Section 7).
#[allow(async_fn_in_trait)]
pub trait AiProvider {
    fn sends_text_off_device(&self) -> bool;
    async fn chat_stream(
        &self,
        prompt: &str,
        max_tokens: u32,
        cancel: CancellationToken,
        on_token: impl FnMut(&str) + Send,
    ) -> Result<String, AppError>;
}
