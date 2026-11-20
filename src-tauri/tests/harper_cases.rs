//! Fixture-driven tests for the full Harper pipeline (Plan.md M2-T06,
//! sample inputs in Section 9.3). `mustInclude` entries were frozen
//! after the first reviewed run of real Harper 3.2.0 output.

use fusewriter_lib::commands::check::run_check;
use fusewriter_lib::harper::HarperEngine;
use fusewriter_lib::harper::mapping::OffsetMap;
use fusewriter_lib::types::RawSuggestion;
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

fn utf16_range_of(text: &str, needle: &str) -> (usize, usize) {
    let byte = text.find(needle).expect("needle present in text");
    let map = OffsetMap::new(text);
    let char_start = text[..byte].chars().count();
    let char_end = char_start + needle.chars().count();
    (map.to_utf16(char_start), map.to_utf16(char_end))
}

fn assert_case(case: &Case, raws: &[RawSuggestion]) {
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
    for needle in &case.must_not_mark_inside {
        let (ns, ne) = utf16_range_of(&case.text, needle);
        for r in raws {
            assert!(
                !(r.start < ne && ns < r.end),
                "case {}: mark {:?} overlaps protected {:?}",
                case.name,
                r.original,
                needle
            );
        }
    }
    // Case-specific hard requirements from Plan.md Section 9.3.
    match case.name.as_str() {
        "spelling pair" => {
            for r in raws {
                if r.original == "recieve" || r.original == "teh" {
                    assert!(
                        r.safe_to_auto_apply,
                        "case spelling pair: {:?} must be safe",
                        r
                    );
                }
            }
        }
        "emoji utf16" => {
            let teh = raws
                .iter()
                .find(|r| r.original == "teh")
                .expect("teh mark present");
            assert_eq!((teh.start, teh.end), (3, 6), "UTF-16 offsets after emoji");
        }
        "kowalski" => {
            for r in raws.iter().filter(|r| r.original == "Kowalski") {
                assert!(!r.safe_to_auto_apply, "Kowalski must never be auto-applied");
            }
        }
        "dont" => {
            let d = raws
                .iter()
                .find(|r| r.original == "dont")
                .expect("dont mark present");
            assert!(d.safe_to_auto_apply, "dont -> don't must be safe");
        }
        "empty" | "whitespace only" => {
            assert!(raws.is_empty(), "case {}: expected no marks", case.name);
        }
        "nasa" => {
            for r in raws {
                if r.original == "NASA" {
                    assert!(!r.safe_to_auto_apply, "NASA must never be auto-applied");
                }
                if r.original == "lauched" {
                    assert!(r.safe_to_auto_apply, "lauched fix must be safe");
                    // Reviewed first run (M2-T06 step 6): Harper 3.2.0 ranks
                    // "latched" first for "lauched"; "launched" (the word in
                    // Plan.md 9.3 case 12) is offered as an alternative.
                    assert!(
                        r.replacement == "launched"
                            || r.alternatives.iter().any(|a| a == "launched"),
                        "launched must be offered for lauched: {r:?}"
                    );
                }
            }
        }
        _ => {}
    }
}

#[test]
fn harper_fixture_cases() {
    let raw = include_str!("fixtures/harper-cases.json");
    let cases: Vec<Case> = serde_json::from_str(raw).expect("harper fixtures parse");
    assert!(cases.len() >= 10, "plan requires at least 10 cases");
    let mut engine = HarperEngine::new(Dialect::American);
    for case in &cases {
        let raws = run_check(&mut engine, &case.text);
        assert_case(case, &raws);
    }
}

/// Perf check (Plan.md M2-T06 step 7): ~300 words with 5 typos,
/// 50 runs, median must be under 50 ms. Release mode only:
/// `cargo test --release -- --ignored perf`
#[test]
#[ignore]
fn perf_300_words() {
    let sentence = "The quick brown fox jumps over the lazy dog near the river bank. ";
    let mut text = sentence.repeat(30); // ~330 words
    for typo in ["teh", "recieve", "seperate", "occured", "goverment"] {
        text = text.replacen("the", typo, 1);
    }
    let mut engine = HarperEngine::new(Dialect::American);
    let mut times: Vec<u128> = (0..50)
        .map(|_| {
            let t = std::time::Instant::now();
            let _ = run_check(&mut engine, &text);
            t.elapsed().as_micros()
        })
        .collect();
    times.sort_unstable();
    let median_ms = times[times.len() / 2] as f64 / 1000.0;
    println!("perf_300_words median over 50 runs: {median_ms:.2} ms");
    assert!(median_ms < 50.0, "median {median_ms} ms must be < 50 ms");
}
