use std::path::Path;
use std::process::Stdio;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager};

use crate::error::AppError;
use crate::state::AppState;
use crate::types::AiErrorCode;

/// llama-server arguments (Plan.md M6-T04). `--no-webui` and `--jinja`
/// were confirmed present in the pinned build's `--help` output
/// (M6-T01 step 5, b12556).
pub fn build_args(model: &Path, port: u16, api_key: &str) -> Vec<String> {
    vec![
        "-m".into(),
        model.to_string_lossy().into_owned(),
        "--host".into(),
        "127.0.0.1".into(),
        "--port".into(),
        port.to_string(),
        "--api-key".into(),
        api_key.into(),
        "-c".into(),
        "4096".into(),
        "-np".into(),
        "1".into(),
        "--no-webui".into(),
        "--jinja".into(),
    ]
}

/// Ask the OS for a free loopback port.
pub fn free_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .and_then(|l| l.local_addr())
        .map(|a| a.port())
        .unwrap_or(0)
}

pub struct LocalRuntime {
    pub child: tokio::process::Child,
    pub port: u16,
    pub api_key: String,
    pub last_used: Instant,
    pub model_id: String,
}

impl LocalRuntime {
    pub fn base_url(&self) -> String {
        format!("http://127.0.0.1:{}/v1", self.port)
    }
}

/// Start llama-server and wait until /health answers (Plan.md M6-T04).
/// Stdout/stderr go to null: server logs may contain user text and are
/// never kept. `/health` is probed without the key first (llama.cpp
/// exempts it); if the build answers 401/403 the probe retries with
/// the key.
pub async fn start(
    server_exe: &Path,
    model_path: &Path,
    model_id: &str,
) -> Result<LocalRuntime, AppError> {
    let port = free_port();
    if port == 0 {
        return Err(AppError::Ai(AiErrorCode::LocalStartFailed));
    }
    let api_key = uuid::Uuid::new_v4().simple().to_string();
    let args = build_args(model_path, port, &api_key);
    let mut cmd = tokio::process::Command::new(server_exe);
    cmd.args(&args)
        .kill_on_drop(true)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    let mut child = cmd
        .spawn()
        .map_err(|_| AppError::Ai(AiErrorCode::LocalStartFailed))?;

    let client = reqwest::Client::new();
    let health_url = format!("http://127.0.0.1:{port}/health");
    let deadline = Instant::now() + Duration::from_secs(120);
    loop {
        if let Ok(Some(_)) = child.try_wait() {
            return Err(AppError::Ai(AiErrorCode::LocalStartFailed));
        }
        if Instant::now() > deadline {
            let _ = child.kill().await;
            return Err(AppError::Ai(AiErrorCode::LocalStartFailed));
        }
        let resp = client.get(&health_url).send().await;
        if let Ok(r) = resp {
            if r.status().is_success() {
                break;
            }
            if r.status().as_u16() == 401 || r.status().as_u16() == 403 {
                let authed = client.get(&health_url).bearer_auth(&api_key).send().await;
                if let Ok(r2) = authed
                    && r2.status().is_success()
                {
                    break;
                }
            }
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }

    Ok(LocalRuntime {
        child,
        port,
        api_key,
        last_used: Instant::now(),
        model_id: model_id.to_string(),
    })
}

/// Spawn a long-lived background task on Tauri's managed async runtime.
/// `tokio::spawn` must NOT be used here: this is called from `Builder::setup`
/// on a thread that has no Tokio runtime yet, where it panics with
/// "there is no reactor running".
pub fn spawn_background<F>(future: F)
where
    F: std::future::Future<Output = ()> + Send + 'static,
{
    tauri::async_runtime::spawn(future);
}

/// Idle watchdog (Plan.md M6-T04 step 7): every 30 s, stop the runtime
/// when it has been idle longer than the settings allow.
pub fn spawn_idle_watcher(app: AppHandle) {
    spawn_background(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(30)).await;
            let state = app.state::<AppState>();
            let idle_minutes = {
                let Ok(s) = state.settings.lock() else {
                    continue;
                };
                s.local.idle_stop_minutes
            };
            let should_stop = {
                let guard = state.local.lock().await;
                match guard.as_ref() {
                    Some(rt) => {
                        rt.last_used.elapsed() > Duration::from_secs(idle_minutes as u64 * 60)
                    }
                    None => false,
                }
            };
            if should_stop {
                state.stop_local().await;
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn args_bind_loopback_only() {
        let args = build_args(Path::new("/m/model.gguf"), 8080, "key123");
        let joined = args.join(" ");
        assert!(joined.contains("--host 127.0.0.1"), "args: {joined}");
        assert!(!joined.contains("0.0.0.0"));
        assert!(joined.contains("-m /m/model.gguf"));
        assert!(joined.contains("--api-key key123"));
        assert!(joined.contains("-c 4096"));
        assert!(joined.contains("-np 1"));
        assert!(joined.contains("--no-webui"));
        assert!(joined.contains("--jinja"));
    }

    #[test]
    fn free_port_returns_nonzero() {
        assert_ne!(free_port(), 0);
    }

    #[test]
    fn background_spawn_works_without_a_tokio_runtime() {
        // A plain #[test] has no Tokio runtime, just like `Builder::setup`.
        // The old `tokio::spawn` panicked here with "there is no reactor
        // running" and crashed the app at startup.
        spawn_background(async {});
    }
}
