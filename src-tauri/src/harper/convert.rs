use harper_core::linting::{Lint, LintKind, Suggestion};

use crate::types::{RawKind, RawSuggestion};

use super::mapping::OffsetMap;
use super::safety::safe_to_auto_apply;

/// Map a Harper lint kind to the app's two display kinds.
/// Variant list verified against harper-core 3.2.0 (see Development Status).
fn kind_of(lk: &LintKind) -> RawKind {
    match lk {
        LintKind::Spelling | LintKind::Typo => RawKind::Spelling,
        _ => RawKind::Grammar,
    }
}

/// Turn one Harper suggestion into replacement text for `original`.
fn suggestion_text(s: &Suggestion, original: &str) -> String {
    match s {
        Suggestion::ReplaceWith(chars) => chars.iter().collect(),
        Suggestion::Remove => String::new(),
        Suggestion::InsertAfter(chars) => {
            let mut out = String::from(original);
            out.extend(chars.iter());
            out
        }
    }
}

/// Plain one-line reason: first line of the message, no backticks or `*`,
/// at most 140 chars (cut at a char boundary, `…` added when cut).
fn clean_reason(message: &str) -> String {
    let first_line = message.split('\n').next().unwrap_or("");
    let cleaned: String = first_line
        .chars()
        .filter(|c| *c != '`' && *c != '*')
        .collect();
    let trimmed = cleaned.trim();
    if trimmed.chars().count() > 140 {
        let cut: String = trimmed.chars().take(139).collect();
        format!("{}…", cut.trim_end())
    } else {
        trimmed.to_string()
    }
}

/// True when the span starts a sentence: the nearest non-space char before
/// it is missing, or is one of `. ! ? \n`.
fn at_sentence_start(chars: &[char], start: usize) -> bool {
    let mut i = start;
    while i > 0 {
        i -= 1;
        let c = chars[i];
        if c == ' ' {
            continue;
        }
        return matches!(c, '.' | '!' | '?' | '\n');
    }
    true
}

/// Convert one Harper lint into a `RawSuggestion`, or `None` when the lint
/// has no usable suggestion or its span is out of range.
pub fn lint_to_raw(lint: &Lint, chars: &[char], map: &OffsetMap) -> Option<RawSuggestion> {
    let span = lint.span;
    if span.start > span.end || span.end > chars.len() {
        return None;
    }
    let original: String = chars[span.start..span.end].iter().collect();

    let mut texts: Vec<String> = lint
        .suggestions
        .iter()
        .map(|s| suggestion_text(s, &original))
        .collect();
    let replacement = texts.first()?.clone();
    if replacement == original {
        return None;
    }
    let mut alternatives: Vec<String> = Vec::new();
    for t in texts.drain(1..) {
        if t != replacement && !alternatives.contains(&t) && t != original {
            alternatives.push(t);
        }
        if alternatives.len() == 3 {
            break;
        }
    }

    let kind = kind_of(&lint.lint_kind);
    let suggestion_count = lint.suggestions.len();
    let safe = safe_to_auto_apply(
        kind,
        &format!("{:?}", lint.lint_kind),
        &original,
        &replacement,
        at_sentence_start(chars, span.start),
        suggestion_count,
    );

    Some(RawSuggestion {
        start: map.to_utf16(span.start),
        end: map.to_utf16(span.end),
        original,
        replacement,
        alternatives,
        kind,
        reason: clean_reason(&lint.message),
        safe_to_auto_apply: safe,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::harper::HarperEngine;
    use harper_core::Dialect;

    fn raws_for(text: &str) -> Vec<RawSuggestion> {
        let mut engine = HarperEngine::new(Dialect::American);
        let lints = engine.lint(text);
        let chars: Vec<char> = text.chars().collect();
        let map = OffsetMap::new(text);
        lints
            .iter()
            .filter_map(|l| lint_to_raw(l, &chars, &map))
            .collect()
    }

    #[test]
    fn convert_an_test() {
        let text = "This is an test.";
        let raws = raws_for(text);
        assert!(!raws.is_empty());
        for r in &raws {
            assert!(r.start < r.end);
            assert_eq!(r.original, text[r.start..r.end]);
            assert!(!r.reason.contains('`'));
            assert!(!r.reason.contains('\n'));
        }
        assert!(
            raws.iter()
                .any(|r| r.original == "an" && r.replacement == "a"),
            "expected an -> a in {raws:?}"
        );
    }

    #[test]
    fn convert_spelling_pair() {
        let text = "I recieve teh package.";
        let raws = raws_for(text);
        assert!(!raws.is_empty());
        for r in &raws {
            assert!(r.start < r.end);
            assert_eq!(r.original, text[r.start..r.end]);
            assert!(!r.reason.contains('`'));
            assert!(!r.reason.contains('\n'));
        }
        assert!(
            raws.iter()
                .any(|r| r.original == "teh" && r.replacement == "the")
        );
        assert!(
            raws.iter()
                .any(|r| r.original == "recieve" && r.replacement == "receive")
        );
    }
}
