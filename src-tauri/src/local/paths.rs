use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::error::AppError;

// Pure helpers (unit-testable without an AppHandle).

pub fn runtime_dir_in(base: &std::path::Path, tag: &str) -> PathBuf {
    base.join("runtime").join(tag)
}

pub fn models_dir_in(base: &std::path::Path) -> PathBuf {
    base.join("models")
}

pub fn model_path_in(base: &std::path::Path, file: &str) -> PathBuf {
    models_dir_in(base).join(file)
}

fn app_data(app: &AppHandle) -> Result<PathBuf, AppError> {
    app.path().app_data_dir().map_err(|_| AppError::Internal)
}

pub fn runtime_dir(app: &AppHandle, tag: &str) -> Result<PathBuf, AppError> {
    Ok(runtime_dir_in(&app_data(app)?, tag))
}

pub fn models_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    Ok(models_dir_in(&app_data(app)?))
}

pub fn model_path(app: &AppHandle, file: &str) -> Result<PathBuf, AppError> {
    Ok(model_path_in(&app_data(app)?, file))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn paths_compose_under_app_data() {
        let base = Path::new("/data/app");
        assert_eq!(
            runtime_dir_in(base, "b12556"),
            PathBuf::from("/data/app/runtime/b12556")
        );
        assert_eq!(models_dir_in(base), PathBuf::from("/data/app/models"));
        assert_eq!(
            model_path_in(base, "gemma-4-E2B-it-Q4_0.gguf"),
            PathBuf::from("/data/app/models/gemma-4-E2B-it-Q4_0.gguf")
        );
    }
}
