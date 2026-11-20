//! Document file IO (Plan.md M8-T01). Paths come only from the
//! open/save dialogs. UTF-8 only, max 5 MB, writes go through a
//! temporary file in the same folder plus rename, so a crash cannot
//! leave a half-written document.

use std::path::PathBuf;

use crate::error::AppError;

const MAX_BYTES: u64 = 5 * 1024 * 1024;

fn read_file(path: &str) -> Result<String, AppError> {
    let meta = std::fs::metadata(path).map_err(|_| AppError::Internal)?;
    if meta.len() > MAX_BYTES {
        return Err(AppError::FileTooLarge);
    }
    let bytes = std::fs::read(path).map_err(|_| AppError::Internal)?;
    String::from_utf8(bytes).map_err(|_| AppError::NotUtf8)
}

fn write_file(path: &str, text: &str) -> Result<(), AppError> {
    if text.len() as u64 > MAX_BYTES {
        return Err(AppError::FileTooLarge);
    }
    let target = PathBuf::from(path);
    let dir = target.parent().ok_or(AppError::Internal)?;
    let tmp = dir.join(format!(
        ".fusewriter-write-{}.tmp",
        uuid::Uuid::new_v4().simple()
    ));
    std::fs::write(&tmp, text.as_bytes()).map_err(|_| AppError::Internal)?;
    std::fs::rename(&tmp, &target).map_err(|_| {
        let _ = std::fs::remove_file(&tmp);
        AppError::Internal
    })
}

#[tauri::command]
pub async fn read_text_file(path: String) -> Result<String, AppError> {
    tokio::task::spawn_blocking(move || read_file(&path))
        .await
        .map_err(|_| AppError::Internal)?
}

#[tauri::command]
pub async fn write_text_file(path: String, text: String) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || write_file(&path, &text))
        .await
        .map_err(|_| AppError::Internal)?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir() -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("fw-files-test-{}", uuid::Uuid::new_v4().simple()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn write_then_read_roundtrips() {
        let dir = temp_dir();
        let path = dir.join("note.md");
        write_file(path.to_str().unwrap(), "Hello — wörld.\n").unwrap();
        assert_eq!(
            read_file(path.to_str().unwrap()).unwrap(),
            "Hello — wörld.\n"
        );
        // No temp file is left behind.
        let leftovers: Vec<_> = std::fs::read_dir(&dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_name().to_string_lossy().contains(".tmp"))
            .collect();
        assert!(leftovers.is_empty());
    }

    #[test]
    fn non_utf8_is_rejected() {
        let dir = temp_dir();
        let path = dir.join("bin.dat");
        std::fs::write(&path, [0xff, 0xfe, 0x00, 0x61]).unwrap();
        assert_eq!(
            read_file(path.to_str().unwrap()).unwrap_err().code(),
            "not_utf8"
        );
    }

    #[test]
    fn oversized_write_is_rejected() {
        let dir = temp_dir();
        let path = dir.join("big.txt");
        let text = "a".repeat((MAX_BYTES + 1) as usize);
        assert_eq!(
            write_file(path.to_str().unwrap(), &text)
                .unwrap_err()
                .code(),
            "file_too_large"
        );
    }
}
