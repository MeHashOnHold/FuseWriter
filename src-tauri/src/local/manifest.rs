use serde::Deserialize;
use std::collections::HashMap;

use crate::error::AppError;

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub schema_version: u32,
    pub runtime: RuntimeInfo,
    pub models: Vec<ModelInfo>,
}

#[derive(Deserialize, Clone, Debug)]
pub struct RuntimeInfo {
    pub tag: String,
    pub assets: HashMap<String, AssetInfo>,
}

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AssetInfo {
    pub url: String,
    pub sha256: String,
    pub archive: String, // "zip" | "tar.gz"
    pub size_bytes: u64,
}

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub label: String,
    #[serde(default)]
    pub default: bool,
    pub url: String,
    pub file: String,
    pub sha256: String,
    pub size_bytes: u64,
}

impl Manifest {
    pub fn embedded() -> Result<Manifest, AppError> {
        serde_json::from_str(include_str!("../../resources/runtime-manifest.json"))
            .map_err(|_| AppError::Internal)
    }

    pub fn model(&self, id: &str) -> Option<&ModelInfo> {
        self.models.iter().find(|m| m.id == id)
    }

    pub fn asset(&self, platform: &str) -> Option<&AssetInfo> {
        self.runtime.assets.get(platform)
    }
}

/// Platform key for the current build target (Plan.md M6-T02).
pub fn current_platform_key() -> Option<&'static str> {
    if cfg!(target_os = "windows") && cfg!(target_arch = "x86_64") {
        Some("windows-x86_64")
    } else if cfg!(target_os = "macos") && cfg!(target_arch = "aarch64") {
        Some("macos-aarch64")
    } else if cfg!(target_os = "macos") && cfg!(target_arch = "x86_64") {
        Some("macos-x86_64")
    } else if cfg!(target_os = "linux") && cfg!(target_arch = "x86_64") {
        Some("linux-x86_64")
    } else {
        None
    }
}

/// Only https URLs on the two pinned hosts may be downloaded.
pub fn check_url_allowed(url: &str) -> Result<(), AppError> {
    if !url.starts_with("https://") {
        return Err(AppError::BadUrl);
    }
    let host = crate::settings::host_of(url);
    if host == "github.com" || host == "huggingface.co" {
        Ok(())
    } else {
        Err(AppError::BadUrl)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_manifest_parses_with_real_values() {
        let m = Manifest::embedded().unwrap();
        assert_eq!(m.schema_version, 1);
        assert_eq!(m.runtime.tag, "b12556");
        assert_eq!(m.models.len(), 2);
        let e2b = m.model("gemma-4-e2b").unwrap();
        assert!(e2b.default);
        assert_eq!(e2b.sha256.len(), 64);
        assert!(m.model("gemma-4-e4b").is_some());
        for key in [
            "windows-x86_64",
            "macos-aarch64",
            "macos-x86_64",
            "linux-x86_64",
        ] {
            let a = m.asset(key).unwrap();
            assert_eq!(a.sha256.len(), 64);
            check_url_allowed(&a.url).unwrap();
        }
        for model in &m.models {
            check_url_allowed(&model.url).unwrap();
        }
    }

    #[test]
    fn platform_key_matches_this_build() {
        // This build runs on linux x86_64 in CI.
        assert_eq!(current_platform_key(), Some("linux-x86_64"));
    }

    #[test]
    fn rejects_untrusted_urls() {
        assert!(check_url_allowed("https://evil.example/x.zip").is_err());
        assert!(check_url_allowed("http://github.com/x.zip").is_err());
        assert!(check_url_allowed("https://github.com/x.zip").is_ok());
        assert!(check_url_allowed("https://huggingface.co/x.gguf").is_ok());
    }
}
