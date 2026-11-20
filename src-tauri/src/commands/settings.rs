use tauri::State;

use crate::error::AppError;
use crate::settings::{self, Settings};
use crate::state::AppState;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<Settings, AppError> {
    let guard = state.settings.lock().map_err(|_| AppError::Internal)?;
    Ok(guard.clone())
}

#[tauri::command]
pub fn save_settings(state: State<'_, AppState>, settings: Settings) -> Result<(), AppError> {
    let mut next = settings;
    settings::validate(&mut next)?;
    settings::save(&state.settings_file, &next)?;
    let mut guard = state.settings.lock().map_err(|_| AppError::Internal)?;
    *guard = next;
    Ok(())
}
