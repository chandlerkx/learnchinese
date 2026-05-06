//! Chinese word segmentation and pinyin annotation engine.
//!
//! This module is the core of the NLP pipeline. It initializes the jieba
//! segmenter with a compile-time-embedded dictionary and provides the main
//! [`segment_and_annotate`] function that converts mixed Chinese/English text
//! into annotated [`WordPinyin`] pairs.
//!
//! # Architecture
//!
//! The jieba dictionary (~349K entries) is embedded at compile time via
//! `include_str!` rather than using `jieba-rs`'s `default-dict` feature.
//! This avoids the `zstd` C-library dependency that prevents compilation
//! to `wasm32-unknown-unknown`.

use jieba_rs::Jieba;
use once_cell::sync::Lazy;
use pinyin::ToPinyin;
use std::io::Cursor;

use crate::types::WordPinyin;
use crate::unicode::{contains_chinese, split_mixed_content};

/// The raw jieba dictionary, embedded at compile time.

/// Format: one entry per line — `word | frequency | part_of_speech (noun, verb, measurement/numeral, etc)`.
static DICT: &str = include_str!("../dict.txt");

/// Lazily-initialized jieba segmenter instance.
///
/// Constructed on first access by loading [`DICT`] into an empty `Jieba`.
/// Subsequent calls reuse the same instance (thread-safe via `Lazy`).
pub(crate) static JIEBA: Lazy<Jieba> = Lazy::new(|| {
    let mut jieba = Jieba::empty();
    let mut cursor = Cursor::new(DICT);
    jieba
        .load_dict(&mut cursor)
        .expect("Failed to load jieba dictionary");
    jieba
});

/// Segments mixed Chinese/English text and generates pinyin annotations.
///
/// This is the main NLP pipeline function. It:
/// 1. Splits input into runs of Chinese vs non-Chinese characters
/// 2. Feeds Chinese runs through `jieba.cut()` for word segmentation
/// 3. Generates tone-marked pinyin for each segmented word
/// 4. Passes non-Chinese runs through with `pinyin: None`
///
/// # Arguments
///
/// * `text` — Input text, which may contain any mix of Chinese characters,
///   English words, punctuation, and numbers.
///
/// # Returns
///
/// A `Vec<WordPinyin>` preserving the original text order, where each
/// element is either an annotated Chinese word or a non-Chinese passthrough.
///
/// # Examples
///
/// ```
/// use rust_core::segmenter::segment_and_annotate;
///
/// let result = segment_and_annotate("Hello你好");
/// assert_eq!(result.len(), 2);
/// assert_eq!(result[0].word, "Hello");
/// assert!(result[0].pinyin.is_none());
/// assert_eq!(result[1].word, "你好");
/// assert!(result[1].pinyin.is_some());
/// ```
pub fn segment_and_annotate(text: &str) -> Vec<WordPinyin> {
    let segments = split_mixed_content(text); // stage 1: split mixed content
    let mut result: Vec<WordPinyin> = Vec::new();

    for segment in segments {
        if contains_chinese(&segment) {
            let words = JIEBA.cut(&segment, false); // stage 2: segment Chinese words 
            for word in words { // stage 3: generate pinyin for each word
                let pinyin_str = generate_pinyin(word); 
                result.push(WordPinyin {
                    word: word.to_string(),
                    pinyin: Some(pinyin_str),
                });
            }
        } else {
            result.push(WordPinyin {
                word: segment,
                pinyin: None,
            });
        }
    }

    result
}

/// Converts a string of Chinese characters into space-separated tone-marked pinyin.
///
/// Non-Chinese characters within the string are preserved as-is in the output.
///
/// # Examples
///
/// ```
/// use rust_core::segmenter::generate_pinyin;
///
/// let result = generate_pinyin("你好");
/// assert_eq!(result, "nǐ hǎo");
/// ```
pub fn generate_pinyin(word: &str) -> String {
    word.chars()
        .map(|c| match c.to_pinyin() { // converts character to pinyin object e.g. {syllable: "ni", tone: 3}
            Some(p) => p.with_tone().to_string(), 
            None => c.to_string(),
        })
        .collect::<Vec<String>>()
        .join(" ")
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn segmentation_produces_multiple_words() {
        let words = JIEBA.cut("我们中出了一个叛徒", false);
        assert!(words.len() > 1, "Should segment into multiple words");
        assert!(words.contains(&"我们"), "Should contain '我们' as a word");
    }

    #[test]
    fn segmentation_common_phrase() {
        let words = JIEBA.cut("我喜欢学习中文", false);
        assert!(
            words.len() > 2,
            "Should segment into multiple words, got: {:?}",
            words
        );
        assert!(
            words.contains(&"学习"),
            "Should contain '学习', got: {:?}",
            words
        );
        assert!(
            words.contains(&"中文"),
            "Should contain '中文', got: {:?}",
            words
        );
    }

    #[test]
    fn pinyin_generation_basic() {
        let result = generate_pinyin("你好");
        assert_eq!(result, "nǐ hǎo");
    }

    #[test]
    fn pinyin_generation_single_char() {
        let result = generate_pinyin("我");
        assert_eq!(result, "wǒ");
    }

    #[test]
    fn annotate_mixed_content() {
        let result = segment_and_annotate("Hello你好");
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].word, "Hello");
        assert!(result[0].pinyin.is_none());
        assert_eq!(result[1].word, "你好");
        assert!(result[1].pinyin.is_some());
    }

    #[test]
    fn annotate_pure_chinese() {
        let result = segment_and_annotate("今天天气真好");
        assert!(!result.is_empty());
        assert!(
            result.iter().all(|wp| wp.pinyin.is_some()),
            "All Chinese words should have pinyin"
        );
    }

    #[test]
    fn annotate_empty_input() {
        let result = segment_and_annotate("");
        assert!(result.is_empty());
    }
}
