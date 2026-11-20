use crate::error::AppError;
use crate::secrets;

#[tauri::command]
pub fn set_api_key(key: String) -> Result<(), AppError> {
    secrets::set_key(&key)
}

#[tauri::command]
pub fn has_api_key() -> bool {
    secrets::has_key()
}

#[tauri::command]
pub fn delete_api_key() -> Result<(), AppError> {
    secrets::delete_key()
}
