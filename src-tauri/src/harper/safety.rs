use crate::types::RawKind;

/// Standard two-row dynamic-programming Levenshtein distance, on chars.
pub fn levenshtein(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    if a.is_empty() {
        return b.len();
    }
    if b.is_empty() {
        return a.len();
    }
    let mut prev: Vec<usize> = (0..=b.len()).collect();
    let mut cur: Vec<usize> = vec![0; b.len() + 1];
    for i in 1..=a.len() {
        cur[0] = i;
        for j in 1..=b.len() {
            let cost = if a[i - 1] == b[j - 1] { 0 } else { 1 };
            cur[j] = (prev[j] + 1).min(cur[j - 1] + 1).min(prev[j - 1] + cost);
        }
        std::mem::swap(&mut prev, &mut cur);
    }
    prev[b.len()]
}

/// Grammar lint kinds whose single suggestion Tab may apply automatically.
/// Verified against the harper-core 3.2.0 `LintKind` variant list (M2-T03).
const SAFE_GRAMMAR_KINDS: [&str; 3] = ["Capitalization", "Repetition", "Formatting"];

/// Decide whether Tab (fix-all) may apply this fix without asking.
/// Rules are in Plan.md M2-T05.
pub fn safe_to_auto_apply(
    kind: RawKind,
    lint_kind_name: &str,
    original: &str,
    replacement: &str,
    at_sentence_start: bool,
    suggestion_count: usize,
) -> bool {
    match kind {
        RawKind::Spelling => {
            if replacement.is_empty() {
                return false;
            }
            let lower_o = original.to_lowercase();
            let lower_r = replacement.to_lowercase();
            if levenshtein(&lower_o, &lower_r) > 2 {
                return false;
            }
            if original.chars().any(|c| c.is_ascii_digit()) {
                return false;
            }
            // Capitalized mid-sentence: likely a name.
            let first_upper = original.chars().next().is_some_and(|c| c.is_uppercase());
            if first_upper && !at_sentence_start {
                return false;
            }
            // All-caps longer than one letter: likely an acronym.
            let letters: Vec<char> = original.chars().filter(|c| c.is_alphabetic()).collect();
            !(original.chars().count() > 1
                && !letters.is_empty()
                && letters.iter().all(|c| c.is_uppercase()))
        }
        RawKind::Grammar => {
            SAFE_GRAMMAR_KINDS.contains(&lint_kind_name)
                && suggestion_count == 1
                && replacement != original
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn safety_levenshtein_values() {
        assert_eq!(levenshtein("teh", "the"), 2);
        assert_eq!(levenshtein("recieve", "receive"), 2);
        assert_eq!(levenshtein("cat", "cat"), 0);
        assert_eq!(levenshtein("", "abc"), 3);
    }

    #[test]
    fn safety_teh_is_safe() {
        assert!(safe_to_auto_apply(
            RawKind::Spelling,
            "Spelling",
            "teh",
            "the",
            false,
            1
        ));
    }

    #[test]
    fn safety_recieve_is_safe() {
        assert!(safe_to_auto_apply(
            RawKind::Spelling,
            "Spelling",
            "recieve",
            "receive",
            false,
            1
        ));
    }

    #[test]
    fn safety_capitalized_name_not_safe() {
        assert!(!safe_to_auto_apply(
            RawKind::Spelling,
            "Spelling",
            "Kowalski",
            "Kowalsky",
            false,
            1
        ));
    }

    #[test]
    fn safety_acronym_not_safe() {
        assert!(!safe_to_auto_apply(
            RawKind::Spelling,
            "Spelling",
            "NASA",
            "NASAA",
            true,
            1
        ));
    }

    #[test]
    fn safety_digits_not_safe() {
        assert!(!safe_to_auto_apply(
            RawKind::Spelling,
            "Spelling",
            "abc123",
            "abc",
            false,
            1
        ));
    }

    #[test]
    fn safety_repetition_is_safe() {
        assert!(safe_to_auto_apply(
            RawKind::Grammar,
            "Repetition",
            "the the",
            "the",
            false,
            1
        ));
    }

    #[test]
    fn safety_other_grammar_not_safe() {
        assert!(!safe_to_auto_apply(
            RawKind::Grammar,
            "Agreement",
            "an",
            "a",
            false,
            1
        ));
    }
}
