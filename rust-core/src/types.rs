//! Data types shared across the NLP pipeline.
//!
//! Contains the core structures used to represent segmented Chinese text
//! and its corresponding pinyin annotations.

use serde::{Deserialize, Serialize};

/// A single word paired with its optional pinyin reading.
///
/// When `pinyin` is `Some`, the word contains Chinese characters and the
/// value holds space-separated tone-marked pinyin (e.g. `"nǐ hǎo"`).
/// When `pinyin` is `None`, the word is non-Chinese content (English,
/// punctuation, numbers) that passes through unannotated.
///
/// # Examples
///
/// ```
/// use rust_core::types::WordPinyin;
///
/// let annotated = WordPinyin {
///     word: "你好".to_string(),
///     pinyin: Some("nǐ hǎo".to_string()),
/// };
///
/// let passthrough = WordPinyin {
///     word: "Hello".to_string(),
///     pinyin: None,
/// };
/// ```
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WordPinyin {
    /// The original text segment (Chinese word or non-Chinese run).
    pub word: String,
    /// Tone-marked pinyin if the word is Chinese, `None` otherwise.
    pub pinyin: Option<String>,
}
