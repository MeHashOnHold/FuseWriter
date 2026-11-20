use serde::Serialize;

use crate::types::AiErrorCode;

/// Application errors. Messages and codes never contain user text.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Text is too long to check.")]
    TextTooLong,
    #[error("Unknown dialect.")]
    UnknownDialect,
    #[error("The server URL is not valid.")]
    BadUrl,
    #[error("The API key is empty.")]
    EmptyApiKey,
    #[error("The download did not match its checksum.")]
    ChecksumMismatch,
    #[error("The archive could not be read safely.")]
    BadArchive,
    #[error("Not enough free disk space.")]
    DiskSpace,
    #[error("The file is not valid UTF-8 text.")]
    NotUtf8,
    #[error("The file is larger than 5 MB.")]
    FileTooLarge,
    #[error("Internal error.")]
    Internal,
    #[error("{}", .0.message())]
    Ai(AiErrorCode),
}

impl AppError {
    /// Stable machine-readable code, sent to the webview.
    pub fn code(&self) -> &'static str {
        match self {
            AppError::TextTooLong => "text_too_long",
            AppError::UnknownDialect => "unknown_dialect",
            AppError::BadUrl => "bad_url",
            AppError::EmptyApiKey => "empty_api_key",
            AppError::ChecksumMismatch => "checksum_mismatch",
            AppError::BadArchive => "bad_archive",
            AppError::DiskSpace => "disk_space",
            AppError::NotUtf8 => "not_utf8",
            AppError::FileTooLarge => "file_too_large",
            AppError::Internal => "internal",
            AppError::Ai(code) => code.as_str(),
        }
    }

    pub fn ai_code(&self) -> Option<AiErrorCode> {
        match self {
            AppError::Ai(code) => Some(*code),
            _ => None,
        }
    }
}

impl From<AiErrorCode> for AppError {
    fn from(code: AiErrorCode) -> Self {
        AppError::Ai(code)
    }
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.code())
    }
}
