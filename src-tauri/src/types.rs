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
