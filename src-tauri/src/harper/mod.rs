pub mod convert;
pub mod mapping;
pub mod protect;
pub mod safety;

use harper_core::linting::{Lint, LintGroup, Linter};
use harper_core::spell::FstDictionary;
use harper_core::{Dialect, Document};

/// Owns the Harper lint group. The group is built once in `new`
/// (it is slow to build) and reused for every check.
pub struct HarperEngine {
    linter: LintGroup,
    dialect: Dialect,
}

impl HarperEngine {
    pub fn new(dialect: Dialect) -> Self {
        Self {
            linter: LintGroup::new_curated(FstDictionary::curated(), dialect),
            dialect,
        }
    }

    pub fn dialect(&self) -> Dialect {
        self.dialect
    }

    pub fn lint(&mut self, text: &str) -> Vec<Lint> {
        let doc = Document::new_plain_english_curated(text);
        let mut lints = self.linter.lint(&doc);
        harper_core::remove_overlaps(&mut lints);
        lints
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn harper_lints_an_test() {
        let mut engine = HarperEngine::new(Dialect::American);
        let lints = engine.lint("This is an test.");
        assert!(!lints.is_empty(), "expected at least 1 lint");
    }

    #[test]
    fn harper_core_version_is_pinned() {
        assert_eq!(harper_core::core_version(), "3.2.0");
    }

    #[test]
    fn harper_engine_is_send() {
        fn assert_send<T: Send>() {}
        assert_send::<HarperEngine>();
    }
}
