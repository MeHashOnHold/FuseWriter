/// Maps Harper char indexes to JavaScript (UTF-16) string offsets.
pub struct OffsetMap {
    utf16_at_char: Vec<usize>, // length = char count + 1
}

impl OffsetMap {
    pub fn new(text: &str) -> Self {
        let mut v = Vec::with_capacity(text.len() + 1);
        let mut acc = 0usize;
        for c in text.chars() {
            v.push(acc);
            acc += c.len_utf16();
        }
        v.push(acc);
        Self { utf16_at_char: v }
    }

    pub fn to_utf16(&self, char_idx: usize) -> usize {
        let last = self.utf16_at_char.len() - 1;
        self.utf16_at_char[char_idx.min(last)]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mapping_ascii() {
        let m = OffsetMap::new("abc");
        assert_eq!(m.to_utf16(0), 0);
        assert_eq!(m.to_utf16(3), 3);
    }

    #[test]
    fn mapping_emoji() {
        // 😀 is 1 char but 2 UTF-16 units.
        let m = OffsetMap::new("😀 teh");
        assert_eq!(m.to_utf16(2), 3);
        assert_eq!(m.to_utf16(5), 6);
    }

    #[test]
    fn mapping_combining_accent() {
        // "é" written as e + combining accent U+0301: 2 chars, 2 UTF-16 units.
        let m = OffsetMap::new("e\u{301}");
        assert_eq!(m.to_utf16(2), 2);
    }

    #[test]
    fn mapping_empty() {
        let m = OffsetMap::new("");
        assert_eq!(m.to_utf16(0), 0);
    }

    #[test]
    fn mapping_out_of_range_clamps() {
        let m = OffsetMap::new("abc");
        assert_eq!(m.to_utf16(999), 3);
    }
}
