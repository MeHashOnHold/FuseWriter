#![deny(clippy::print_stdout, clippy::print_stderr, clippy::dbg_macro)]

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
