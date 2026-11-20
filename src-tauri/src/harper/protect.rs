use std::sync::LazyLock;

use regex::Regex;

use crate::types::RawSuggestion;

// Fixed literal patterns, compiled once. `Option` keeps this free of
// `expect`/`unwrap` outside tests (plan rule 16); a pattern that somehow
// failed to compile would make `protected_ranges` return no ranges, and
// the fixture tests would fail loudly.
static FENCED: LazyLock<Option<Regex>> = LazyLock::new(|| Regex::new(r"(?s)```.*?```").ok());
static INLINE_CODE: LazyLock<Option<Regex>> = LazyLock::new(|| Regex::new(r"`[^`\n]+`").ok());
static URL: LazyLock<Option<Regex>> =
    LazyLock::new(|| Regex::new(r"(?i)\b(?:https?://|www\.)[^\s<>()\[\]{}]+").ok());
static EMAIL: LazyLock<Option<Regex>> =
    LazyLock::new(|| Regex::new(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b").ok());

/// UTF-16 length of `text[..byte]`.
fn utf16_upto(text: &str, byte: usize) -> usize {
    text[..byte].chars().map(|c| c.len_utf16()).sum()
}

fn push_range(text: &str, ranges: &mut Vec<(usize, usize)>, start_byte: usize, end_byte: usize) {
    ranges.push((utf16_upto(text, start_byte), utf16_upto(text, end_byte)));
}

/// Ranges of the text (UTF-16 offsets) where no marks may appear:
/// fenced code blocks, inline code, URLs, and email addresses.
pub fn protected_ranges(text: &str) -> Vec<(usize, usize)> {
    let (Some(fenced), Some(inline_code), Some(url), Some(email)) =
        (&*FENCED, &*INLINE_CODE, &*URL, &*EMAIL)
    else {
        return Vec::new();
    };
    let mut ranges: Vec<(usize, usize)> = Vec::new();

    // Fenced code blocks (closed).
    for m in fenced.find_iter(text) {
        push_range(text, &mut ranges, m.start(), m.end());
    }
    // A fence that is opened but never closed protects to the end of the text.
    for (byte_idx, _) in text.match_indices("```") {
        let start16 = utf16_upto(text, byte_idx);
        let covered = ranges.iter().any(|(s, e)| start16 >= *s && start16 < *e);
        if !covered {
            ranges.push((start16, text.chars().map(|c| c.len_utf16()).sum()));
        }
    }

    for m in inline_code.find_iter(text) {
        push_range(text, &mut ranges, m.start(), m.end());
    }
    for m in url.find_iter(text) {
        push_range(text, &mut ranges, m.start(), m.end());
    }
    for m in email.find_iter(text) {
        push_range(text, &mut ranges, m.start(), m.end());
    }

    ranges.sort_unstable();
    ranges
}

/// Remove any suggestion whose `[start, end)` overlaps a protected range.
pub fn drop_protected(items: Vec<RawSuggestion>, ranges: &[(usize, usize)]) -> Vec<RawSuggestion> {
    items
        .into_iter()
        .filter(|s| !ranges.iter().any(|(rs, re)| s.start < *re && *rs < s.end))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::harper::HarperEngine;
    use crate::harper::convert::lint_to_raw;
    use crate::harper::mapping::OffsetMap;
    use harper_core::Dialect;
    use serde::Deserialize;

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Case {
        name: String,
        text: String,
        #[serde(default)]
        must_include: Vec<Include>,
        #[serde(default)]
        must_not_mark_inside: Vec<String>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Include {
        original: String,
        replacement: String,
    }

    fn pipeline(text: &str) -> Vec<RawSuggestion> {
        let mut engine = HarperEngine::new(Dialect::American);
        let lints = engine.lint(text);
        let chars: Vec<char> = text.chars().collect();
        let map = OffsetMap::new(text);
        let raws: Vec<RawSuggestion> = lints
            .iter()
            .filter_map(|l| lint_to_raw(l, &chars, &map))
            .collect();
        drop_protected(raws, &protected_ranges(text))
    }

    /// UTF-16 range of the first occurrence of `needle` in `text`.
    fn utf16_range_of(text: &str, needle: &str) -> (usize, usize) {
        let byte = text.find(needle).expect("needle present in text");
        let start = utf16_upto(text, byte);
        let len16: usize = needle.chars().map(|c| c.len_utf16()).sum();
        (start, start + len16)
    }

    #[test]
    fn protect_fixture_cases() {
        let raw = include_str!("../../tests/fixtures/protect-cases.json");
        let cases: Vec<Case> = serde_json::from_str(raw).expect("protect fixtures parse");
        assert!(cases.len() >= 5);
        for case in &cases {
            let raws = pipeline(&case.text);
            for needle in &case.must_not_mark_inside {
                let (ns, ne) = utf16_range_of(&case.text, needle);
                for r in &raws {
                    assert!(
                        !(r.start < ne && ns < r.end),
                        "case {}: mark {:?} overlaps protected {:?}",
                        case.name,
                        r.original,
                        needle
                    );
                }
            }
            for inc in &case.must_include {
                assert!(
                    raws.iter()
                        .any(|r| r.original == inc.original && r.replacement == inc.replacement),
                    "case {}: expected {} -> {} in {:?}",
                    case.name,
                    inc.original,
                    inc.replacement,
                    raws
                );
            }
        }
    }

    #[test]
    fn protect_unclosed_fence_covers_to_end() {
        let text = "Clean start.\n```\nteh code";
        let ranges = protected_ranges(text);
        let total: usize = text.chars().map(|c| c.len_utf16()).sum();
        assert!(ranges.iter().any(|(s, e)| *e == total && *s < total));
    }
}
