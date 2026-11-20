#![deny(clippy::print_stdout, clippy::print_stderr, clippy::dbg_macro)]

pub mod commands;
pub mod error;
pub mod harper;
pub mod local;
pub mod providers;
pub mod secrets;
pub mod settings;
pub mod state;
pub mod types;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let state = match settings::settings_path(app.handle()) {
                Ok(path) => {
                    let loaded = settings::load(&path);
                    state::AppState::with_settings(loaded, path)
                }
                Err(_) => state::AppState::new(),
            };
            app.manage(state);
            local::runtime::spawn_idle_watcher(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check::check_text,
            commands::files::read_text_file,
            commands::files::write_text_file,
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::secrets::set_api_key,
            commands::secrets::has_api_key,
            commands::secrets::delete_api_key,
            commands::ai::ai_complete,
            commands::ai::ai_cancel,
            commands::ai::ai_test_connection,
            commands::local::local_status,
            commands::local::local_install,
            commands::local::local_cancel_install,
            commands::local::local_stop,
            commands::local::local_remove,
            commands::local::local_remove_runtime,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");
    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            // Stop the llama-server child when the app exits (M6-T04).
            let state = app_handle.state::<state::AppState>();
            tauri::async_runtime::block_on(state.stop_local());
        }
    });
}
