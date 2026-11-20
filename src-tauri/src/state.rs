use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use harper_core::Dialect;
use tokio_util::sync::CancellationToken;

use crate::harper::HarperEngine;
use crate::settings::Settings;

/// Shared app state. The Harper engine sits behind a mutex because
/// `LintGroup::lint` needs `&mut self`. The `Arc` lets the blocking
/// check task own a handle (plan M2-T06 step 4).
pub struct AppState {
    pub harper: Arc<Mutex<HarperEngine>>,
    pub settings: Mutex<Settings>,
    pub settings_file: PathBuf,
    pub cancels: Mutex<HashMap<String, CancellationToken>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            harper: Arc::new(Mutex::new(HarperEngine::new(Dialect::American))),
            settings: Mutex::new(Settings::default()),
            settings_file: PathBuf::new(),
            cancels: Mutex::new(HashMap::new()),
        }
    }

    pub fn with_settings(settings: Settings, settings_file: PathBuf) -> Self {
        Self {
            settings: Mutex::new(settings),
            settings_file,
            ..Self::new()
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
