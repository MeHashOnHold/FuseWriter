use serde::Serialize;

/// Application errors. Messages and codes never contain user text.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Text is too long to check.")]
    TextTooLong,
    #[error("Unknown dialect.")]
    UnknownDialect,
    #[error("Internal error.")]
    Internal,
}

impl AppError {
    /// Stable machine-readable code, sent to the webview.
    pub fn code(&self) -> &'static str {
        match self {
            AppError::TextTooLong => "text_too_long",
            AppError::UnknownDialect => "unknown_dialect",
            AppError::Internal => "internal",
        }
    }
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.code())
    }
}
