use serde::Serialize;
use tauri::ipc::Channel;
use tauri::{AppHandle, State};
use tokio_util::sync::CancellationToken;

use crate::error::AppError;
use crate::local::download::download;
use crate::local::extract::{ArchiveKind, extract, find_server};
use crate::local::manifest::{Manifest, check_url_allowed, current_platform_key};
use crate::local::paths;
use crate::state::AppState;
use crate::types::AiErrorCode;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LocalModelStatus {
    pub id: String,
    pub label: String,
    pub installed: bool,
    pub size_bytes: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LocalStatus {
    pub runtime_installed: bool,
    pub models: Vec<LocalModelStatus>,
    pub running: bool,
    pub active_model_id: Option<String>,
    pub platform_supported: bool,
}

#[derive(Serialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum InstallEvent {
    #[serde(rename_all = "camelCase")]
    Progress {
        stage: String, // "runtime" | "model"
        downloaded: u64,
        total: u64,
    },
    Extracting,
    Done,
    #[serde(rename_all = "camelCase")]
    Error {
        code: String,
    },
}

fn runtime_installed(app: &AppHandle, manifest: &Manifest) -> bool {
    let Ok(dir) = paths::runtime_dir(app, &manifest.runtime.tag) else {
        return false;
    };
    find_server(&dir).is_some()
}

#[tauri::command]
pub async fn local_status(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<LocalStatus, AppError> {
    let manifest = Manifest::embedded()?;
    let platform_supported = current_platform_key()
        .map(|k| manifest.asset(k).is_some())
        .unwrap_or(false);
    let mut models = Vec::new();
    for m in &manifest.models {
        let installed = paths::model_path(&app, &m.file)
            .map(|p| p.exists())
            .unwrap_or(false);
        models.push(LocalModelStatus {
            id: m.id.clone(),
            label: m.label.clone(),
            installed,
            size_bytes: m.size_bytes,
        });
    }
    let guard = state.local.lock().await;
    Ok(LocalStatus {
        runtime_installed: runtime_installed(&app, &manifest),
        models,
        running: guard.is_some(),
        active_model_id: guard.as_ref().map(|rt| rt.model_id.clone()),
        platform_supported,
    })
}

/// Download + extract the runtime (if needed) and download the model.
/// Progress is reported through `on_event`; failures come back both as
/// an `error` event and the command's Err. (Known issue: the plan's
/// free-space pre-check is skipped — see Development Status.md; the
/// runtime exposes no portable free-space query without a new crate.)
#[tauri::command]
pub async fn local_install(
    app: AppHandle,
    state: State<'_, AppState>,
    model_id: String,
    on_event: Channel<InstallEvent>,
) -> Result<(), AppError> {
    let result = install_inner(&app, &state, &model_id, &on_event).await;
    if let Err(e) = &result {
        let _ = on_event.send(InstallEvent::Error {
            code: e.code().to_string(),
        });
    } else {
        let _ = on_event.send(InstallEvent::Done);
    }
    result
}

async fn install_inner(
    app: &AppHandle,
    state: &State<'_, AppState>,
    model_id: &str,
    on_event: &Channel<InstallEvent>,
) -> Result<(), AppError> {
    let manifest = Manifest::embedded()?;
    let platform = current_platform_key().ok_or(AppError::Ai(AiErrorCode::LocalNotInstalled))?;
    let asset = manifest
        .asset(platform)
        .ok_or(AppError::Ai(AiErrorCode::LocalNotInstalled))?;
    let model = manifest
        .model(model_id)
        .ok_or(AppError::Ai(AiErrorCode::LocalNotInstalled))?;
    check_url_allowed(&asset.url)?;
    check_url_allowed(&model.url)?;

    let token = CancellationToken::new();
    {
        let mut slot = state
            .install_cancel
            .lock()
            .map_err(|_| AppError::Internal)?;
        *slot = Some(token.clone());
    }
    let outcome = install_steps(app, asset, model, token, on_event).await;
    {
        let mut slot = state
            .install_cancel
            .lock()
            .map_err(|_| AppError::Internal)?;
        *slot = None;
    }
    outcome
}

async fn install_steps(
    app: &AppHandle,
    asset: &crate::local::manifest::AssetInfo,
    model: &crate::local::manifest::ModelInfo,
    token: CancellationToken,
    on_event: &Channel<InstallEvent>,
) -> Result<(), AppError> {
    let manifest = Manifest::embedded()?;
    // 1) Runtime archive -> extract.
    let rdir = paths::runtime_dir(app, &manifest.runtime.tag)?;
    if find_server(&rdir).is_none() {
        let archive_path = rdir.with_extension("download");
        let stage = "runtime".to_string();
        let ev = on_event.clone();
        download(
            &asset.url,
            &archive_path,
            &asset.sha256,
            asset.size_bytes,
            token.clone(),
            move |downloaded, total| {
                let _ = ev.send(InstallEvent::Progress {
                    stage: stage.clone(),
                    downloaded,
                    total,
                });
            },
        )
        .await?;
        let _ = on_event.send(InstallEvent::Extracting);
        let kind = ArchiveKind::from_manifest(&asset.archive).ok_or(AppError::BadArchive)?;
        let archive_copy = archive_path.clone();
        let dest_copy = rdir.clone();
        tokio::task::spawn_blocking(move || extract(&archive_copy, kind, &dest_copy))
            .await
            .map_err(|_| AppError::Internal)??;
        let _ = tokio::fs::remove_file(&archive_path).await;
        if find_server(&rdir).is_none() {
            return Err(AppError::BadArchive);
        }
    }
    // 2) Model file.
    let mpath = paths::model_path(app, &model.file)?;
    let stage = "model".to_string();
    let ev = on_event.clone();
    download(
        &model.url,
        &mpath,
        &model.sha256,
        model.size_bytes,
        token,
        move |downloaded, total| {
            let _ = ev.send(InstallEvent::Progress {
                stage: stage.clone(),
                downloaded,
                total,
            });
        },
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub fn local_cancel_install(state: State<'_, AppState>) -> Result<(), AppError> {
    let slot = state
        .install_cancel
        .lock()
        .map_err(|_| AppError::Internal)?;
    if let Some(token) = slot.as_ref() {
        token.cancel();
    }
    Ok(())
}

#[tauri::command]
pub async fn local_stop(state: State<'_, AppState>) -> Result<(), AppError> {
    state.stop_local().await;
    Ok(())
}

#[tauri::command]
pub async fn local_remove(
    app: AppHandle,
    state: State<'_, AppState>,
    model_id: String,
) -> Result<(), AppError> {
    let manifest = Manifest::embedded()?;
    let model = manifest
        .model(&model_id)
        .ok_or(AppError::Ai(AiErrorCode::LocalNotInstalled))?;
    // Stop first if the running model is the one being removed.
    let is_active = {
        let guard = state.local.lock().await;
        guard
            .as_ref()
            .map(|rt| rt.model_id == model_id)
            .unwrap_or(false)
    };
    if is_active {
        state.stop_local().await;
    }
    let path = paths::model_path(&app, &model.file)?;
    if path.exists() {
        tokio::fs::remove_file(&path)
            .await
            .map_err(|_| AppError::Internal)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn local_remove_runtime(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.stop_local().await;
    let manifest = Manifest::embedded()?;
    let dir = paths::runtime_dir(&app, &manifest.runtime.tag)?;
    if dir.exists() {
        tokio::fs::remove_dir_all(&dir)
            .await
            .map_err(|_| AppError::Internal)?;
    }
    Ok(())
}
