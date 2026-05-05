//! Unicode utilities for CJK character detection and mixed-content splitting.
//!
//! This module provides low-level character classification for Chinese text
//! and a splitter that partitions mixed Chinese/non-Chinese strings into
//! homogeneous runs, preserving the original character order.

/// Returns `true` if the character falls within a CJK Unified Ideographs range.
///
/// Covers the following Unicode blocks:
/// - CJK Unified Ideographs (U+4E00..U+9FFF) — most common Chinese characters
/// - CJK Extension A (U+3400..U+4DBF) — rare/historical characters
/// - CJK Compatibility Ideographs (U+F900..U+FAFF) — duplicate mappings
///
/// # Examples
///
/// ```
/// use rust_core::unicode::is_chinese_char;
///
/// assert!(is_chinese_char('你'));
/// assert!(!is_chinese_char('A'));
/// assert!(!is_chinese_char('！')); // fullwidth punctuation is NOT CJK
/// ```
pub fn is_chinese_char(c: char) -> bool {
    matches!(c,
        '\u{4e00}'..='\u{9fff}'  |  // CJK Unified Ideographs
        '\u{3400}'..='\u{4dbf}'  |  // CJK Extension A
        '\u{f900}'..='\u{faff}'     // CJK Compatibility Ideographs
    )
}

/// Returns `true` if the string contains at least one Chinese character.
///
/// # Examples
///
/// ```
/// use rust_core::unicode::contains_chinese;
///
/// assert!(contains_chinese("Hello你好"));
/// assert!(!contains_chinese("Hello world"));
/// assert!(!contains_chinese(""));
/// ```
pub fn contains_chinese(s: &str) -> bool {
    s.chars().any(is_chinese_char)
}

/// Splits a mixed-content string into alternating runs of Chinese and
/// non-Chinese characters, preserving all original characters and ordering.
///
/// This is the first stage of the NLP pipeline: before we can run word
/// segmentation, we need to isolate the Chinese portions of the text so
/// that non-Chinese content (English words, punctuation, numbers) is not
/// fed into the segmenter.
///
/// # Examples
///
/// ```
/// use rust_core::unicode::split_mixed_content;
///
/// let result = split_mixed_content("Hello你好world世界!");
/// assert_eq!(result, vec!["Hello", "你好", "world", "世界", "!"]);
/// ```
///
/// ```
/// use rust_core::unicode::split_mixed_content;
///
/// let result = split_mixed_content("纯中文");
/// assert_eq!(result, vec!["纯中文"]);
/// ```
pub fn split_mixed_content(text: &str) -> Vec<String> {
    let mut segments: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut in_chinese = false;
    let mut first = true;

    for c in text.chars() {
        let char_is_chinese = is_chinese_char(c);

        if first {
            in_chinese = char_is_chinese;
            first = false;
        }

        if char_is_chinese != in_chinese {
            if !current.is_empty() {
                segments.push(std::mem::take(&mut current));
            }
            in_chinese = char_is_chinese;
        }

        current.push(c);
    }

    if !current.is_empty() {
        segments.push(current);
    }

    segments
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pure_chinese_stays_as_single_segment() {
        let result = split_mixed_content("你好世界");
        assert_eq!(result, vec!["你好世界"]);
    }

    #[test]
    fn mixed_content_splits_at_boundaries() {
        let result = split_mixed_content("Hello你好world");
        assert_eq!(result, vec!["Hello", "你好", "world"]);
    }

    #[test]
    fn punctuation_splits_from_chinese() {
        let result = split_mixed_content("你好，世界！");
        assert_eq!(result, vec!["你好", "，", "世界", "！"]);
    }

    #[test]
    fn pure_english_stays_as_single_segment() {
        let result = split_mixed_content("Hello world");
        assert_eq!(result, vec!["Hello world"]);
    }

    #[test]
    fn empty_input_returns_empty() {
        let result = split_mixed_content("");
        assert!(result.is_empty());
    }

    #[test]
    fn is_chinese_char_detects_cjk() {
        assert!(is_chinese_char('你'));
        assert!(is_chinese_char('好'));
        assert!(!is_chinese_char('A'));
        assert!(!is_chinese_char('1'));
        assert!(!is_chinese_char('，')); // fullwidth comma is punctuation, not CJK
    }

    #[test]
    fn contains_chinese_mixed_and_pure() {
        assert!(contains_chinese("你好"));
        assert!(contains_chinese("Hello你好"));
        assert!(!contains_chinese("Hello world"));
        assert!(!contains_chinese(""));
    }
}
