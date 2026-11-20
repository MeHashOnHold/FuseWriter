use std::io::Read as _;
use std::path::{Path, PathBuf};
use std::time::Instant;

use futures_util::StreamExt;
use sha2::{Digest, Sha256};
use tokio::io::AsyncWriteExt;
use tokio_util::sync::CancellationToken;

use crate::error::AppError;
use crate::types::AiErrorCode;

fn part_path(dest: &Path) -> PathBuf {
    let mut os = dest.as_os_str().to_owned();
    os.push(".part");
    PathBuf::from(os)
}

/// SHA-256 hex of an existing file, streamed (files can be gigabytes).
pub fn hash_file(path: &Path) -> Option<String> {
    let mut f = std::fs::File::open(path).ok()?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 1 << 20];
    loop {
        match f.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => hasher.update(&buf[..n]),
            Err(_) => return None,
        }
    }
    Some(hex::encode(hasher.finalize()))
}

/// Download `url` to `dest`, verifying size and SHA-256 (Plan.md M6-T02).
/// - Skips the network entirely if `dest` already hashes correctly.
/// - Streams to `dest.part`; the partial file is deleted on cancel or
///   checksum failure and renamed into place only on success.
/// - `on_progress(downloaded, total)` fires at most every 200 ms.
pub async fn download(
    url: &str,
    dest: &Path,
    expected_sha256: &str,
    expected_size: u64,
    cancel: CancellationToken,
    on_progress: impl FnMut(u64, u64) + Send,
) -> Result<(), AppError> {
    if dest.exists()
        && hash_file(dest).map(|h| h.eq_ignore_ascii_case(expected_sha256)) == Some(true)
    {
        return Ok(());
    }
    if let Some(parent) = dest.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|_| AppError::Internal)?;
    }
    let part = part_path(dest);
    let client = reqwest::Client::new();
    let resp = tokio::select! {
        biased;
        _ = cancel.cancelled() => {
            return Err(AppError::Ai(AiErrorCode::Cancelled));
        }
        r = client.get(url).send() => {
            r.map_err(|_| AppError::Ai(AiErrorCode::Network))?
        }
    };
    if !resp.status().is_success() {
        return Err(AppError::Ai(AiErrorCode::Server));
    }
    let total = if expected_size > 0 {
        expected_size
    } else {
        resp.content_length().unwrap_or(0)
    };
    let mut file = tokio::fs::File::create(&part)
        .await
        .map_err(|_| AppError::Internal)?;
    let mut stream = resp.bytes_stream();
    let mut hasher = Sha256::new();
    let mut downloaded: u64 = 0;
    let mut on_progress = on_progress;
    let mut last = Instant::now() - std::time::Duration::from_millis(201);
    let outcome: Result<(), AppError> = async {
        loop {
            let next = tokio::select! {
                biased;
                _ = cancel.cancelled() => {
                    return Err(AppError::Ai(AiErrorCode::Cancelled));
                }
                chunk = stream.next() => chunk,
            };
            let Some(chunk) = next else { break };
            let chunk = chunk.map_err(|_| AppError::Ai(AiErrorCode::Network))?;
            file.write_all(&chunk)
                .await
                .map_err(|_| AppError::Internal)?;
            hasher.update(&chunk);
            downloaded += chunk.len() as u64;
            if last.elapsed() >= std::time::Duration::from_millis(200) {
                last = Instant::now();
                on_progress(downloaded, total);
            }
        }
        Ok(())
    }
    .await;
    let _ = file.flush().await;
    drop(file);
    if let Err(e) = outcome {
        let _ = tokio::fs::remove_file(&part).await;
        return Err(e);
    }
    let digest = hex::encode(hasher.finalize());
    if !digest.eq_ignore_ascii_case(expected_sha256) {
        let _ = tokio::fs::remove_file(&part).await;
        return Err(AppError::ChecksumMismatch);
    }
    on_progress(downloaded, total);
    tokio::fs::rename(&part, dest)
        .await
        .map_err(|_| AppError::Internal)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn sha_of(bytes: &[u8]) -> String {
        hex::encode(Sha256::digest(bytes))
    }

    #[tokio::test]
    async fn downloads_and_verifies() {
        let server = MockServer::start().await;
        let body = b"hello fusewriter runtime".to_vec();
        Mock::given(method("GET"))
            .and(path("/file.bin"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes(body.clone()))
            .mount(&server)
            .await;
        let dir = tempfile_dir();
        let dest = dir.join("file.bin");
        let mut progress: Vec<(u64, u64)> = Vec::new();
        download(
            &format!("{}/file.bin", server.uri()),
            &dest,
            &sha_of(&body),
            body.len() as u64,
            CancellationToken::new(),
            |d, t| progress.push((d, t)),
        )
        .await
        .unwrap();
        assert_eq!(std::fs::read(&dest).unwrap(), body);
        assert_eq!(
            progress.last().copied(),
            Some((body.len() as u64, body.len() as u64))
        );
    }

    #[tokio::test]
    async fn wrong_hash_is_rejected_and_partial_removed() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/file.bin"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes(b"some bytes".to_vec()))
            .mount(&server)
            .await;
        let dir = tempfile_dir();
        let dest = dir.join("file.bin");
        let err = download(
            &format!("{}/file.bin", server.uri()),
            &dest,
            &sha_of(b"different bytes"),
            10,
            CancellationToken::new(),
            |_, _| {},
        )
        .await
        .unwrap_err();
        assert_eq!(err.code(), "checksum_mismatch");
        assert!(!dest.exists());
        assert!(!part_path(&dest).exists());
    }

    #[tokio::test]
    async fn existing_good_file_skips_network() {
        let dir = tempfile_dir();
        let dest = dir.join("file.bin");
        let body = b"already here".to_vec();
        std::fs::write(&dest, &body).unwrap();
        // URL is unreachable; a network attempt would fail the test.
        download(
            "http://127.0.0.1:1/file.bin",
            &dest,
            &sha_of(&body),
            body.len() as u64,
            CancellationToken::new(),
            |_, _| {},
        )
        .await
        .unwrap();
    }

    #[tokio::test]
    async fn cancel_stops_a_slow_download() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/slow.bin"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_bytes(vec![7u8; 1024])
                    .set_delay(std::time::Duration::from_secs(10)),
            )
            .mount(&server)
            .await;
        let dir = tempfile_dir();
        let dest = dir.join("slow.bin");
        let token = CancellationToken::new();
        let t2 = token.clone();
        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            t2.cancel();
        });
        let err = download(
            &format!("{}/slow.bin", server.uri()),
            &dest,
            &sha_of(b"x"),
            1024,
            token,
            |_, _| {},
        )
        .await
        .unwrap_err();
        assert_eq!(err.code(), "cancelled");
        assert!(!dest.exists());
        assert!(!part_path(&dest).exists());
    }

    fn tempfile_dir() -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("fw-dl-test-{}", uuid::Uuid::new_v4().simple()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }
}
