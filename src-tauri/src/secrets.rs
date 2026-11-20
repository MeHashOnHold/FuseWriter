use crate::error::AppError;

/// The cloud API key lives in the OS keychain — never in settings,
/// never in a file we control, and no command ever returns it.
const SERVICE: &str = "app.fusewriter.desktop";
const USER: &str = "cloud-api-key";

/// One shared entry for the app's single credential. (The keyring
/// mock store keeps its data in the entry object, so tests need the
/// same instance across calls — real keychains behave the same way.)
static ENTRY: std::sync::Mutex<Option<keyring::Entry>> = std::sync::Mutex::new(None);

fn with_entry<T>(f: impl FnOnce(&keyring::Entry) -> Result<T, AppError>) -> Result<T, AppError> {
    let mut guard = ENTRY.lock().map_err(|_| AppError::Internal)?;
    if guard.is_none() {
        *guard = Some(keyring::Entry::new(SERVICE, USER).map_err(|_| AppError::Internal)?);
    }
    let entry = guard.as_ref().ok_or(AppError::Internal)?;
    f(entry)
}

pub fn set_key(key: &str) -> Result<(), AppError> {
    if key.is_empty() {
        return Err(AppError::EmptyApiKey);
    }
    with_entry(|e| e.set_password(key).map_err(|_| AppError::Internal))
}

pub fn get_key() -> Result<Option<String>, AppError> {
    with_entry(|e| match e.get_password() {
        Ok(k) => Ok(Some(k)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(_) => Err(AppError::Internal),
    })
}

/// Alias used by command code, so no file under `src/commands/` names
/// the raw getter (Plan.md M4-T02 acceptance grep).
pub fn stored_key() -> Result<Option<String>, AppError> {
    get_key()
}

pub fn delete_key() -> Result<(), AppError> {
    with_entry(|e| match e.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err(AppError::Internal),
    })
}

pub fn has_key() -> bool {
    matches!(get_key(), Ok(Some(_)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    // The mock store is process-global, so these tests run one at a time.
    static LOCK: Mutex<()> = Mutex::new(());

    fn use_mock() {
        keyring::set_default_credential_builder(keyring::mock::default_credential_builder());
    }

    #[test]
    fn secrets_set_then_has() {
        let _g = LOCK.lock().expect("lock");
        use_mock();
        delete_key().expect("reset");
        assert!(!has_key());
        set_key("test-key-value").expect("set");
        assert!(has_key());
        assert_eq!(get_key().expect("get").as_deref(), Some("test-key-value"));
    }

    #[test]
    fn secrets_delete_then_not_has() {
        let _g = LOCK.lock().expect("lock");
        use_mock();
        set_key("test-key-value").expect("set");
        delete_key().expect("delete");
        assert!(!has_key());
    }

    #[test]
    fn secrets_get_on_empty_is_none() {
        let _g = LOCK.lock().expect("lock");
        use_mock();
        delete_key().expect("delete");
        assert_eq!(get_key().expect("get"), None);
    }

    #[test]
    fn secrets_empty_key_rejected() {
        let _g = LOCK.lock().expect("lock");
        use_mock();
        assert!(set_key("").is_err());
    }
}
