use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::error::AppError;

/// App settings, mirroring Section 6 of the plan. Every struct has
/// serde defaults so old or partial settings files still load.

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub schema_version: u32,
    pub engine: String, // "off" | "local" | "cloud"
    pub auto_check: AutoCheck,
    pub dialect: String,
    pub cloud: Cloud,
    pub local: Local,
    pub rewrite: Rewrite,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            schema_version: 1,
            engine: "off".to_string(),
            auto_check: AutoCheck::default(),
            dialect: "american".to_string(),
            cloud: Cloud::default(),
            local: Local::default(),
            rewrite: Rewrite::default(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct AutoCheck {
    pub enabled: bool,
    pub allow_cloud: bool,
    pub pause_ms: u32,
}

impl Default for AutoCheck {
    fn default() -> Self {
        Self {
            enabled: true,
            allow_cloud: false,
            pause_ms: 700,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Cloud {
    pub base_url: String,
    pub model: String,
    pub temperature: Option<f32>,
    pub consent_hosts: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Local {
    pub model_id: String, // "gemma-4-e2b" | "gemma-4-e4b"
    pub idle_stop_minutes: u32,
}

impl Default for Local {
    fn default() -> Self {
        Self {
            model_id: "gemma-4-e2b".to_string(),
            idle_stop_minutes: 10,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Rewrite {
    pub active_preset_id: String,
    pub custom_presets: Vec<RewritePreset>,
}

impl Default for Rewrite {
    fn default() -> Self {
        Self {
            active_preset_id: "fluent".to_string(),
            custom_presets: Vec::new(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct RewritePreset {
    pub id: String,
    pub name: String,
    pub built_in: bool,
    pub instruction: String,
    pub frozen_words: Vec<String>,
}

pub fn settings_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|_| AppError::Internal)?;
    Ok(dir.join("settings.json"))
}

/// Load settings from `path`. A missing file or invalid JSON gives
/// defaults — never a panic, never an error.
pub fn load(path: &Path) -> Settings {
    let Ok(text) = std::fs::read_to_string(path) else {
        return Settings::default();
    };
    serde_json::from_str(&text).unwrap_or_default()
}

/// Save via a temp file + rename, so a crash cannot half-write settings.
pub fn save(path: &Path, settings: &Settings) -> Result<(), AppError> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|_| AppError::Internal)?;
    }
    let text = serde_json::to_string_pretty(settings).map_err(|_| AppError::Internal)?;
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, text).map_err(|_| AppError::Internal)?;
    std::fs::rename(&tmp, path).map_err(|_| AppError::Internal)?;
    Ok(())
}

/// The host part of a URL (without scheme, port, or path).
pub fn host_of(url: &str) -> String {
    let rest = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .unwrap_or(url);
    if let Some(stripped) = rest.strip_prefix('[') {
        // IPv6 literal: host is up to ']'
        if let Some(end) = stripped.find(']') {
            return stripped[..end].to_string();
        }
    }
    rest.split(['/', ':']).next().unwrap_or("").to_string()
}

pub fn is_loopback_host(host: &str) -> bool {
    matches!(host, "localhost" | "127.0.0.1" | "::1")
}

/// Validate and normalize. Cloud base URL must be empty, https, or
/// http on a loopback host. Numeric fields are clamped.
pub fn validate(settings: &mut Settings) -> Result<(), AppError> {
    let url = settings.cloud.base_url.trim().to_string();
    if !url.is_empty() {
        let ok = url.starts_with("https://")
            || (url.starts_with("http://") && is_loopback_host(&host_of(&url)));
        if !ok {
            return Err(AppError::BadUrl);
        }
        settings.cloud.base_url = url.trim_end_matches('/').to_string();
    } else {
        settings.cloud.base_url = url;
    }
    settings.auto_check.pause_ms = settings.auto_check.pause_ms.clamp(300, 3000);
    settings.local.idle_stop_minutes = settings.local.idle_stop_minutes.clamp(1, 120);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_path(name: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("fusewriter-test-{}-{}", std::process::id(), name));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("create temp dir");
        dir.join("settings.json")
    }

    #[test]
    fn settings_defaults() {
        let s = Settings::default();
        assert_eq!(s.schema_version, 1);
        assert_eq!(s.engine, "off");
        assert!(s.auto_check.enabled);
        assert!(!s.auto_check.allow_cloud);
        assert_eq!(s.auto_check.pause_ms, 700);
        assert_eq!(s.dialect, "american");
        assert_eq!(s.local.model_id, "gemma-4-e2b");
        assert_eq!(s.local.idle_stop_minutes, 10);
        assert_eq!(s.rewrite.active_preset_id, "fluent");
    }

    #[test]
    fn settings_round_trip() {
        let path = temp_path("roundtrip");
        let s = Settings {
            engine: "cloud".to_string(),
            cloud: Cloud {
                base_url: "https://api.example.com/v1".to_string(),
                consent_hosts: vec!["api.example.com".to_string()],
                ..Default::default()
            },
            ..Default::default()
        };
        save(&path, &s).expect("save");
        assert_eq!(load(&path), s);
    }

    #[test]
    fn settings_missing_file_gives_defaults() {
        let path = temp_path("missing").join("nope.json");
        assert_eq!(load(&path), Settings::default());
    }

    #[test]
    fn settings_broken_json_gives_defaults() {
        let path = temp_path("broken");
        std::fs::write(&path, "{not json").expect("write");
        assert_eq!(load(&path), Settings::default());
    }

    #[test]
    fn settings_unknown_fields_ignored() {
        let path = temp_path("unknown");
        std::fs::write(&path, r#"{"engine":"local","futureField":42}"#).expect("write");
        let s = load(&path);
        assert_eq!(s.engine, "local");
        assert_eq!(s.dialect, "american");
    }

    #[test]
    fn settings_validate_rejects_plain_http_remote() {
        let mut s = Settings::default();
        s.cloud.base_url = "http://example.com/v1".to_string();
        assert!(validate(&mut s).is_err());
    }

    #[test]
    fn settings_validate_accepts_loopback_and_https() {
        let mut s = Settings::default();
        s.cloud.base_url = "http://localhost:1234/v1/".to_string();
        validate(&mut s).expect("loopback ok");
        assert_eq!(s.cloud.base_url, "http://localhost:1234/v1");
        let mut s2 = Settings::default();
        s2.cloud.base_url = "https://api.example.com/v1".to_string();
        validate(&mut s2).expect("https ok");
        let mut s3 = Settings::default();
        s3.cloud.base_url = "http://127.0.0.1:8080".to_string();
        validate(&mut s3).expect("127.0.0.1 ok");
        let mut s4 = Settings::default();
        s4.cloud.base_url = "http://[::1]:8080/v1".to_string();
        validate(&mut s4).expect("[::1] ok");
    }

    #[test]
    fn settings_validate_clamps() {
        let mut s = Settings::default();
        s.auto_check.pause_ms = 50;
        s.local.idle_stop_minutes = 999;
        validate(&mut s).expect("ok");
        assert_eq!(s.auto_check.pause_ms, 300);
        assert_eq!(s.local.idle_stop_minutes, 120);
    }
}
