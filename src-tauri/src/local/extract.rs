use std::fs::File;
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};

use crate::error::AppError;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ArchiveKind {
    Zip,
    TarGz,
}

impl ArchiveKind {
    pub fn from_manifest(name: &str) -> Option<ArchiveKind> {
        match name {
            "zip" => Some(ArchiveKind::Zip),
            "tar.gz" => Some(ArchiveKind::TarGz),
            _ => None,
        }
    }
}

/// Mark llama-* binaries and shared libraries executable (unix only).
fn fix_permissions(path: &Path) {
    #[cfg(unix)]
    {
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        let is_lib = name.contains(".so") || name.contains(".dylib");
        let is_bin = name.starts_with("llama") && !name.contains('.');
        if is_lib || is_bin {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o755));
        }
    }
    #[cfg(not(unix))]
    {
        let _ = path;
    }
}

fn ensure_inside(dest: &Path, out: &Path) -> Result<(), AppError> {
    if out.starts_with(dest) {
        Ok(())
    } else {
        Err(AppError::BadArchive)
    }
}

/// Extract an archive into `dest`, refusing anything that would escape
/// `dest` and skipping symlinks (Plan.md M6-T03). Symlinks and absolute
/// or parent-escaping paths REJECT the whole archive.
pub fn extract(archive: &Path, kind: ArchiveKind, dest: &Path) -> Result<(), AppError> {
    std::fs::create_dir_all(dest).map_err(|_| AppError::Internal)?;
    match kind {
        ArchiveKind::Zip => extract_zip(archive, dest),
        ArchiveKind::TarGz => extract_tar_gz(archive, dest),
    }
}

fn extract_zip(archive: &Path, dest: &Path) -> Result<(), AppError> {
    let file = File::open(archive).map_err(|_| AppError::BadArchive)?;
    let mut zip = zip::ZipArchive::new(file).map_err(|_| AppError::BadArchive)?;
    for i in 0..zip.len() {
        let mut entry = zip.by_index(i).map_err(|_| AppError::BadArchive)?;
        // Symlink entries (unix mode file-type bits 0o120000) are refused.
        if let Some(mode) = entry.unix_mode()
            && mode & 0o170000 == 0o120000
        {
            return Err(AppError::BadArchive);
        }
        let Some(rel) = entry.enclosed_name() else {
            return Err(AppError::BadArchive);
        };
        let out = dest.join(rel);
        ensure_inside(dest, &out)?;
        if entry.is_dir() {
            std::fs::create_dir_all(&out).map_err(|_| AppError::Internal)?;
        } else {
            if let Some(parent) = out.parent() {
                std::fs::create_dir_all(parent).map_err(|_| AppError::Internal)?;
            }
            let mut buf: Vec<u8> = Vec::new();
            entry
                .read_to_end(&mut buf)
                .map_err(|_| AppError::BadArchive)?;
            let mut f = File::create(&out).map_err(|_| AppError::Internal)?;
            f.write_all(&buf).map_err(|_| AppError::Internal)?;
            fix_permissions(&out);
        }
    }
    Ok(())
}

fn extract_tar_gz(archive: &Path, dest: &Path) -> Result<(), AppError> {
    let file = File::open(archive).map_err(|_| AppError::BadArchive)?;
    let gz = flate2::read::GzDecoder::new(file);
    let mut ar = tar::Archive::new(gz);
    let entries = ar.entries().map_err(|_| AppError::BadArchive)?;
    for entry in entries {
        let mut entry = entry.map_err(|_| AppError::BadArchive)?;
        let entry_type = entry.header().entry_type();
        if entry_type == tar::EntryType::Symlink || entry_type == tar::EntryType::Link {
            return Err(AppError::BadArchive);
        }
        let rel = entry.path().map_err(|_| AppError::BadArchive)?.into_owned();
        if rel.is_absolute()
            || rel
                .components()
                .any(|c| matches!(c, Component::ParentDir | Component::RootDir))
        {
            return Err(AppError::BadArchive);
        }
        let out = dest.join(&rel);
        ensure_inside(dest, &out)?;
        if entry_type == tar::EntryType::Directory {
            std::fs::create_dir_all(&out).map_err(|_| AppError::Internal)?;
        } else {
            if let Some(parent) = out.parent() {
                std::fs::create_dir_all(parent).map_err(|_| AppError::Internal)?;
            }
            let mut f = File::create(&out).map_err(|_| AppError::Internal)?;
            std::io::copy(&mut entry, &mut f).map_err(|_| AppError::BadArchive)?;
            fix_permissions(&out);
        }
    }
    Ok(())
}

/// Find llama-server (or llama-server.exe) anywhere under `dir`.
pub fn find_server(dir: &Path) -> Option<PathBuf> {
    let mut stack = vec![dir.to_path_buf()];
    while let Some(d) = stack.pop() {
        let Ok(rd) = std::fs::read_dir(&d) else {
            continue;
        };
        for e in rd.flatten() {
            let p = e.path();
            if p.is_dir() {
                stack.push(p);
            } else if let Some(name) = p.file_name().and_then(|n| n.to_str())
                && (name == "llama-server" || name == "llama-server.exe")
            {
                return Some(p);
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_dir(tag: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("fw-ex-{tag}-{}", uuid::Uuid::new_v4().simple()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn make_zip(entries: &[(&str, &[u8])], path: &Path) {
        let f = File::create(path).unwrap();
        let mut w = zip::ZipWriter::new(f);
        let opts = zip::write::SimpleFileOptions::default();
        for (name, bytes) in entries {
            w.start_file(*name, opts).unwrap();
            w.write_all(bytes).unwrap();
        }
        w.finish().unwrap();
    }

    fn make_tar_gz(entries: &[(&str, &[u8])], path: &Path) {
        let f = File::create(path).unwrap();
        let enc = flate2::write::GzEncoder::new(f, flate2::Compression::default());
        let mut b = tar::Builder::new(enc);
        for (name, bytes) in entries {
            let mut header = tar::Header::new_gnu();
            header.set_size(bytes.len() as u64);
            header.set_mode(0o644);
            b.append_data(&mut header, name, *bytes).unwrap();
        }
        b.into_inner().unwrap().finish().unwrap();
    }

    #[test]
    fn zip_extracts_files() {
        let dir = test_dir("zipok");
        let archive = dir.join("a.zip");
        make_zip(
            &[("bin/llama-server", b"bin"), ("bin/readme.txt", b"hi")],
            &archive,
        );
        let dest = dir.join("out");
        extract(&archive, ArchiveKind::Zip, &dest).unwrap();
        assert_eq!(std::fs::read(dest.join("bin/readme.txt")).unwrap(), b"hi");
        assert!(find_server(&dest).is_some());
    }

    #[test]
    fn zip_parent_escape_is_rejected() {
        let dir = test_dir("zipescape");
        let archive = dir.join("a.zip");
        make_zip(&[("../evil.txt", b"no")], &archive);
        let dest = dir.join("out");
        let err = extract(&archive, ArchiveKind::Zip, &dest).unwrap_err();
        assert_eq!(err.code(), "bad_archive");
        assert!(!dir.join("evil.txt").exists());
    }

    #[test]
    fn tar_gz_extracts_files() {
        let dir = test_dir("tarok");
        let archive = dir.join("a.tar.gz");
        make_tar_gz(&[("llama-b1/llama-server", b"bin")], &archive);
        let dest = dir.join("out");
        extract(&archive, ArchiveKind::TarGz, &dest).unwrap();
        assert_eq!(
            std::fs::read(dest.join("llama-b1/llama-server")).unwrap(),
            b"bin"
        );
        assert_eq!(
            find_server(&dest).unwrap(),
            dest.join("llama-b1/llama-server")
        );
    }

    /// Build a tar.gz by hand: the tar crate's writer API refuses `..`
    /// paths, so a hostile archive has to be crafted at the byte level.
    fn make_raw_tar_gz(name: &str, bytes: &[u8], path: &Path) {
        let mut header = [0u8; 512];
        header[..name.len()].copy_from_slice(name.as_bytes());
        header[100..108].copy_from_slice(b"0000644\0");
        header[108..116].copy_from_slice(b"0000000\0");
        header[116..124].copy_from_slice(b"0000000\0");
        header[124..136].copy_from_slice(format!("{:011o}\0", bytes.len()).as_bytes());
        header[136..148].copy_from_slice(b"00000000000\0");
        header[156] = b'0';
        header[257..263].copy_from_slice(b"ustar\0");
        header[263..265].copy_from_slice(b"00");
        for b in &mut header[148..156] {
            *b = b' ';
        }
        let sum: u32 = header.iter().map(|&b| b as u32).sum();
        header[148..156].copy_from_slice(format!("{sum:06o}\0 ").as_bytes());
        let mut tar = header.to_vec();
        tar.extend_from_slice(bytes);
        let pad = (512 - (bytes.len() % 512)) % 512;
        tar.extend(std::iter::repeat_n(0u8, pad));
        tar.extend(std::iter::repeat_n(0u8, 1024));
        let f = File::create(path).unwrap();
        let mut enc = flate2::write::GzEncoder::new(f, flate2::Compression::default());
        enc.write_all(&tar).unwrap();
        enc.finish().unwrap();
    }

    #[test]
    fn tar_gz_parent_escape_is_rejected() {
        let dir = test_dir("tarescape");
        let archive = dir.join("a.tar.gz");
        make_raw_tar_gz("../evil.txt", b"no", &archive);
        let dest = dir.join("out");
        let err = extract(&archive, ArchiveKind::TarGz, &dest).unwrap_err();
        assert_eq!(err.code(), "bad_archive");
        assert!(!dir.join("evil.txt").exists());
    }

    #[test]
    fn find_server_missing_returns_none() {
        let dir = test_dir("none");
        assert!(find_server(&dir).is_none());
    }
}
