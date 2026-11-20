use std::sync::{Arc, Mutex};

use harper_core::Dialect;

use crate::harper::HarperEngine;

/// Shared app state. The Harper engine sits behind a mutex because
/// `LintGroup::lint` needs `&mut self`. The `Arc` lets the blocking
/// check task own a handle (plan M2-T06 step 4).
pub struct AppState {
    pub harper: Arc<Mutex<HarperEngine>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            harper: Arc::new(Mutex::new(HarperEngine::new(Dialect::American))),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
