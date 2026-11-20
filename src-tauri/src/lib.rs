#![deny(clippy::print_stdout, clippy::print_stderr, clippy::dbg_macro)]

pub mod commands;
pub mod error;
pub mod harper;
pub mod state;
pub mod types;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(state::AppState::new())
        .invoke_handler(tauri::generate_handler![commands::check::check_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
