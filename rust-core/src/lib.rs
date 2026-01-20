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
    let jieba = jieba_rs::Jieba::new();
    let words = jieba.cut(text, false);
    
    let mut result: Vec<WordPinyin> = Vec::new();
    
    for word in words {
        let py: Option<String> = word.chars().next().and_then(|c| {
            c.to_pinyin().map(|p| p.with_tone())
        }).map(|_| {
             // For simplicity in this demo, we might want to convert the whole word to pinyin.
             // The pinyin crate works per character. Let's map each char to pinyin and join them.
             word.chars()
                .map(|c| c.to_pinyin().map(|p| p.with_tone()).unwrap_or_else(|| c.to_string()))
                .collect::<Vec<String>>()
                .join(" ")
        });
        
        // Refined logic: If it's chinese, it has pinyin. If not, it might not.
        // We will just attempt to convert. If the string remains the same as input (and isn't chinese), 
        // we might want to handle it differently, but for now:
        
        let pinyin_str = word.chars()
            .map(|c| {
                if let Some(p) = c.to_pinyin() {
                    p.with_tone()
                } else {
                    c.to_string()
                }
            })
            .collect::<Vec<String>>()
            .join("");
            
        // Check if it was actually pinyin-able (simple check: if it contains tones or is different from original?)
        // The user requirement is just "get_pinyin_for_text".
        // Let's stick to a simple strategy:
        // map each char to pinyin. join with space if multiple chars? 
        // usually pinyin is joined. "ni hao".
        
         let pinyin_converted = word.chars()
            .map(|c| {
                if let Some(p) = c.to_pinyin() {
                    p.with_tone()
                } else {
                    c.to_string() // keep punctuation/english
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
