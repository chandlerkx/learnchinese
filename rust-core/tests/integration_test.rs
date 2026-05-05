//! Integration tests for the full NLP pipeline.
//!
//! These tests exercise the public API as a consumer would,
//! verifying end-to-end behavior across module boundaries.

use rust_core::segmenter::{generate_pinyin, segment_and_annotate};
use rust_core::unicode::{contains_chinese, is_chinese_char, split_mixed_content};

#[test]
fn end_to_end_mixed_chinese_english() {
    let result = segment_and_annotate("I love 学习中文!");

    // Should produce: "I love " (non-Chinese), segmented Chinese words, "!" (non-Chinese)
    assert!(result.len() >= 3, "Expected at least 3 segments, got: {:?}", result);

    // First segment should be non-Chinese
    assert!(result[0].pinyin.is_none(), "English prefix should have no pinyin");

    // Middle segments should be annotated Chinese
    let chinese_segments: Vec<_> = result.iter().filter(|wp| wp.pinyin.is_some()).collect();
    assert!(
        !chinese_segments.is_empty(),
        "Should have at least one annotated Chinese word"
    );

    // Last segment should be non-Chinese punctuation
    let last = result.last().unwrap();
    assert_eq!(last.word, "!");
    assert!(last.pinyin.is_none());
}

#[test]
fn end_to_end_pure_chinese_sentence() {
    let result = segment_and_annotate("我们都是好朋友");

    // Every segment should have pinyin
    for wp in &result {
        assert!(
            wp.pinyin.is_some(),
            "'{}' should have pinyin annotation",
            wp.word
        );
    }

    // Should be segmented into multiple words (not one big chunk)
    assert!(
        result.len() > 1,
        "Sentence should be segmented into multiple words, got: {:?}",
        result
    );
}

#[test]
fn end_to_end_no_chinese() {
    let result = segment_and_annotate("Hello world! 123");

    assert_eq!(result.len(), 1);
    assert!(result[0].pinyin.is_none());
    assert_eq!(result[0].word, "Hello world! 123");
}

#[test]
fn pinyin_accuracy_common_words() {
    assert_eq!(generate_pinyin("中文"), "zhōng wén");
    assert_eq!(generate_pinyin("你好"), "nǐ hǎo");
    assert_eq!(generate_pinyin("世界"), "shì jiè");
}

#[test]
fn unicode_utilities_are_consistent() {
    // split_mixed_content should agree with is_chinese_char
    let segments = split_mixed_content("A你B好C");
    assert_eq!(segments, vec!["A", "你", "B", "好", "C"]);

    for seg in &segments {
        let has_chinese = contains_chinese(seg);
        let first_char = seg.chars().next().unwrap();
        assert_eq!(
            has_chinese,
            is_chinese_char(first_char),
            "contains_chinese and is_chinese_char should agree for '{}'",
            seg
        );
    }
}
