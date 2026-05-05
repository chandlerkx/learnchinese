# rust-core — Chinese NLP Engine (Wasm)

A WebAssembly-compiled Chinese text segmentation and pinyin annotation engine, built in Rust for the [LearnChinese](https://github.com/chandlerkx/learnchinese) Chrome Extension.

## Overview

Chinese text has no spaces between words, making word boundary detection a non-trivial NLP problem. This engine uses the **jieba segmentation algorithm** — a dictionary + HMM (Hidden Markov Model) approach — to split continuous Chinese text into meaningful words and generate tone-marked pinyin annotations.

### How It Works

```
Input:  "Hello你好世界test"

Step 1: Mixed-Content Split
         → ["Hello", "你好世界", "test"]

Step 2: Jieba Segmentation (Chinese runs only)
         → ["Hello", "你好", "世界", "test"]

Step 3: Pinyin Generation
         → [{word:"Hello", pinyin:null},
            {word:"你好",  pinyin:"nǐ hǎo"},
            {word:"世界",  pinyin:"shì jiè"},
            {word:"test",  pinyin:null}]
```

### Segmentation Algorithm

1. **Dictionary Lookup** — A 349K-entry simplified Chinese dictionary is embedded at compile time. Jieba builds a directed acyclic graph (DAG) of all possible word combinations.
2. **Dynamic Programming** — Finds the highest-probability segmentation path using word frequencies.
3. **HMM Fallback** — Unknown words (slang, names) are handled by a Hidden Markov Model trained on character position probabilities.

## Project Structure

```
rust-core/
├── Cargo.toml              # Dependencies (jieba-rs, pinyin, wasm-bindgen)
├── dict.txt                # Jieba dictionary (349K entries, ~5MB)
├── src/
│   ├── lib.rs              # Wasm API surface (rust_ping, get_pinyin_for_text)
│   ├── types.rs            # Data types (WordPinyin)
│   ├── unicode.rs          # CJK character detection & mixed-content splitting
│   └── segmenter.rs        # Jieba initialization & NLP pipeline
└── tests/
    └── integration_test.rs # End-to-end pipeline tests
```

## Building

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) (`cargo install wasm-pack`)
- `wasm32-unknown-unknown` target (`rustup target add wasm32-unknown-unknown`)

### Compile to Wasm

From the project root (not `rust-core/`):

```bash
./build.sh
```

This compiles the Rust code to WebAssembly and copies the artifacts (`rust_core.js`, `rust_core_bg.wasm`) into the `extension/` directory.

### Run Tests

```bash
cd rust-core
cargo test
```

This runs:
- **14 unit tests** (segmentation, unicode utilities, pinyin generation)
- **5 integration tests** (end-to-end pipeline)
- **7 doc-tests** (code examples in documentation)

## Architecture

The engine runs inside a Chrome Extension **Offscreen Document** because Manifest V3 service workers cannot execute WebAssembly directly.

```
Webpage DOM → content.js → background.js → offscreen.js → Rust/Wasm Engine → Pinyin Overlay
```

## Wasm API

Two functions are exported via `wasm-bindgen`:

| Function | Description |
|---|---|
| `rust_ping() → String` | Health check — returns `"pong"` |
| `get_pinyin_for_text(text: &str) → JsValue` | Main NLP entry point — returns serialized `Vec<WordPinyin>` |

## Limitations

- **Simplified Chinese only** — The embedded dictionary covers simplified characters (简体字). Traditional Chinese (繁體字) will fall back to character-by-character splitting.
- **No polyphone disambiguation** — Characters with multiple readings (多音字) use their most common pronunciation (e.g. 了 always renders as "le", not "liǎo" in 了解).

## Dependencies

| Crate | Purpose |
|---|---|
| `jieba-rs` | Chinese word segmentation (dictionary + HMM) |
| `pinyin` | Character-to-pinyin conversion with tone marks |
| `wasm-bindgen` | Rust ↔ JavaScript interop for WebAssembly |
| `serde` / `serde-wasm-bindgen` | Serialization across the Wasm boundary |
| `once_cell` | Lazy static initialization of the Jieba instance |

> **Note:** `jieba-rs` is used with `default-features = false` to disable the embedded zstd-compressed dictionary, which requires C compilation incompatible with `wasm32-unknown-unknown`. Instead, the dictionary is embedded as plain text via `include_str!`.
