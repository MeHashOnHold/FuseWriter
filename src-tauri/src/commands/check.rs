use std::time::Instant;

use harper_core::Dialect;
use tauri::State;

use crate::error::AppError;
use crate::harper::HarperEngine;
use crate::harper::convert::lint_to_raw;
use crate::harper::mapping::OffsetMap;
use crate::harper::protect::{drop_protected, protected_ranges};
use crate::state::AppState;
use crate::types::{CheckResult, RawSuggestion};

/// The whole Harper pipeline as a pure function: lint -> convert ->
/// drop marks in protected ranges -> sort by start.
pub fn run_check(engine: &mut HarperEngine, text: &str) -> Vec<RawSuggestion> {
    // Plan.md Section 9.3 case 11: empty or whitespace-only input gives no
    // marks. (Harper itself flags three spaces as a Formatting lint,
    // "French spaces are generally not recommended.")
    if text.trim().is_empty() {
        return Vec::new();
    }
    let lints = engine.lint(text);
    let chars: Vec<char> = text.chars().collect();
    let map = OffsetMap::new(text);
    let raws: Vec<RawSuggestion> = lints
        .iter()
        .filter_map(|l| lint_to_raw(l, &chars, &map))
        .collect();
    let mut kept = drop_protected(raws, &protected_ranges(text));
    kept.sort_by_key(|r| r.start);
    kept
}

fn parse_dialect(s: &str) -> Result<Dialect, AppError> {
    match s {
        "american" => Ok(Dialect::American),
        "british" => Ok(Dialect::British),
        "canadian" => Ok(Dialect::Canadian),
        "australian" => Ok(Dialect::Australian),
        _ => Err(AppError::UnknownDialect),
    }
}

#[tauri::command]
pub async fn check_text(
    state: State<'_, AppState>,
    text: String,
    dialect: String,
) -> Result<CheckResult, AppError> {
    if text.chars().count() > 20_000 {
        return Err(AppError::TextTooLong);
    }
    let dialect = parse_dialect(&dialect)?;
    let started = Instant::now();
    let harper = state.harper.clone();
    let suggestions = tauri::async_runtime::spawn_blocking(move || {
        let mut guard = harper.lock().map_err(|_| AppError::Internal)?;
        if guard.dialect() != dialect {
            *guard = HarperEngine::new(dialect);
        }
        Ok::<Vec<RawSuggestion>, AppError>(run_check(&mut guard, &text))
    })
    .await
    .map_err(|_| AppError::Internal)??;
    Ok(CheckResult {
        suggestions,
        elapsed_ms: u64::try_from(started.elapsed().as_millis()).unwrap_or(u64::MAX),
    })
}
