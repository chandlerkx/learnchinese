use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use pinyin::ToPinyin;

#[derive(Serialize, Deserialize)]
pub struct WordPinyin {
    pub word: String,
    pub pinyin: Option<String>,
}

#[wasm_bindgen]
pub fn rust_ping() -> String {
    "pong".to_string()
}

#[wasm_bindgen]
pub fn get_pinyin_for_text(text: &str) -> JsValue {
    // Fallback: simple segmentation by spaces or characters since jieba-rs failed to compile for wasm
    // The user can choose a different segmentation strategy later.
    let words = text.split_whitespace(); // Simple split
    
    let mut result: Vec<WordPinyin> = Vec::new();
    
    for word in words {
         let pinyin_converted = word.chars()
            .map(|c| {
                if let Some(p) = c.to_pinyin() {
                    p.with_tone().to_string()
                } else {
                    c.to_string()
                }
            })
            .collect::<Vec<String>>()
            .join(" ");

        result.push(WordPinyin {
            word: word.to_string(),
            pinyin: Some(pinyin_converted),
        });
    }

    serde_wasm_bindgen::to_value(&result).unwrap()
}
