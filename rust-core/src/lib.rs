//! # rust-core — Chinese NLP Engine (Wasm)
//!
//! A WebAssembly-compiled Chinese text processing engine that provides
//! word segmentation and pinyin annotation for the LearnChinese Chrome Extension.
//!
//! ## Architecture
//!
//! The crate is structured as follows:
//!
//! - [`types`] — Shared data types (`WordPinyin`)
//! - [`unicode`] — CJK character detection and mixed-content splitting
//! - [`segmenter`] — Jieba-based word segmentation and pinyin generation
//!
//! ## Wasm API
//!
//! Two functions are exported to JavaScript via `wasm-bindgen`:
//!
//! - [`rust_ping`] — Health check (returns `"pong"`)
//! - [`get_pinyin_for_text`] — Main NLP entry point

pub mod types;
pub mod unicode;
pub mod segmenter;

use wasm_bindgen::prelude::*;
use crate::segmenter::segment_and_annotate;

/// Health-check endpoint for verifying the Wasm bridge is operational.
///
/// Called by `offscreen.js` during extension startup to confirm the
/// Service Worker → Offscreen Document → Wasm pipeline is functional.
///
/// # Returns
///
/// The string `"pong"`.
#[wasm_bindgen]
pub fn rust_ping() -> String {
    "pong".to_string()
}

/// Main NLP entry point: segments Chinese text and returns pinyin annotations.
///
/// Accepts mixed Chinese/English/punctuation input and returns a serialized
/// `Vec<WordPinyin>` as a `JsValue` for consumption by JavaScript.
///
/// # Pipeline
///
/// 1. **Split** — Partitions input into Chinese vs non-Chinese runs
/// 2. **Segment** — Feeds Chinese runs through jieba (349K-word dictionary + HMM)
/// 3. **Annotate** — Generates tone-marked pinyin for each segmented word
/// 4. **Passthrough** — Non-Chinese runs receive `pinyin: null`
///
/// # Panics
///
/// Panics if `serde_wasm_bindgen` serialization fails (should not occur
/// with valid `WordPinyin` data).
#[wasm_bindgen]
pub fn get_pinyin_for_text(text: &str) -> JsValue {
    let result = segment_and_annotate(text);
    serde_wasm_bindgen::to_value(&result).expect("Failed to serialize WordPinyin result")
}
