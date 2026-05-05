# 📖 LearnChinese

A Chrome extension that overlays **pinyin annotations** on any Chinese webpage, powered by a **Rust/WebAssembly NLP engine** for intelligent word segmentation.

🌐 **Website:** [trylearnchinese.vercel.app](https://trylearnchinese.vercel.app)

---

## Features

- **Pinyin Overlay** — Automatically annotates Chinese characters with tone-marked pinyin (e.g. 你好 → nǐ hǎo) using ruby tags
- **Smart Word Segmentation** — A Rust-based NLP engine segments Chinese text into meaningful words, not individual characters
- **English Definitions** — Hold `Ctrl+E` to toggle English translations via Google Translate
- **Text-to-Speech** — Hold `Ctrl+S` and hover over words to hear native pronunciation
- **Hover Mode** — Toggle with `Ctrl+H` to show pinyin only on hover
- **Customizable** — Adjust font size, toggle pinyin/definitions via the popup UI

## How It Works

Chinese text has **no spaces between words**, making word boundary detection a non-trivial NLP problem. LearnChinese solves this with a three-stage pipeline:

```
Webpage: "今天天气真好"  (no spaces — where do words start and end?)

┌─────────────────────────────────────────────────────────────────┐
│  Stage 1: Mixed-Content Split                                   │
│  Separates Chinese characters from English/punctuation          │
│  "Hello你好" → ["Hello", "你好"]                                │
│                                                                 │
│  Stage 2: Jieba Word Segmentation                               │
│  Dictionary (349K words) + HMM statistical model                │
│  "今天天气真好" → ["今天", "天气", "真", "好"]                    │
│                                                                 │
│  Stage 3: Pinyin Generation                                     │
│  Character-level lookup with tone marks                         │
│  "今天" → "jīn tiān"                                            │
└─────────────────────────────────────────────────────────────────┘

Output: [{word:"今天", pinyin:"jīn tiān"}, {word:"天气", pinyin:"tiān qì"}, ...]
        → Injected as <ruby> tags into the webpage DOM
```

### Segmentation Algorithm

The [jieba algorithm](https://github.com/fxsjy/jieba) works in three steps:

1. **DAG Construction** — Builds a directed acyclic graph of all possible word combinations from the dictionary
2. **Dynamic Programming** — Finds the highest-probability segmentation path using word frequencies
3. **HMM Fallback** — Unknown words (names, slang) are segmented using a Hidden Markov Model trained on character position probabilities

## Architecture

```
┌──────────┐     ┌────────────┐     ┌──────────────┐     ┌────────────────────────┐
│ Webpage  │────▶│ content.js │────▶│ background.js│────▶│    offscreen.js        │
│ DOM      │     │ (Content   │     │ (Service     │     │    (Wasm Bridge)       │
│          │◀────│  Script)   │◀────│  Worker)     │◀────│                        │
└──────────┘     └────────────┘     └──────────────┘     └──────────┬─────────────┘
  Inject                                                            │
  <ruby> tags                                                       ▼
                                                         ┌────────────────────────┐
                                                         │  Rust/Wasm NLP Engine  │
                                                         │  ┌──────────────────┐  │
                                                         │  │ split_mixed_     │  │
                                                         │  │ content()        │  │
                                                         │  └───────┬──────────┘  │
                                                         │          ▼             │
                                                         │  ┌──────────────────┐  │
                                                         │  │ jieba.cut()      │  │
                                                         │  │ (349K dict + HMM)│  │
                                                         │  └───────┬──────────┘  │
                                                         │          ▼             │
                                                         │  ┌──────────────────┐  │
                                                         │  │ ToPinyin         │  │
                                                         │  │ (tone marks)     │  │
                                                         │  └──────────────────┘  │
                                                         └────────────────────────┘
```

> **Why Offscreen Document?** Chrome Manifest V3 service workers cannot execute WebAssembly. The offscreen document provides a hidden DOM context where the Wasm binary can be loaded.

## Project Structure

```
learnchinese/
├── extension/                  # Chrome Extension (MV3)
│   ├── manifest.json           # Extension config & permissions
│   ├── content.js              # DOM walker + pinyin injection
│   ├── background.js           # Message router + Google Translate API
│   ├── popup.html/js           # Settings UI (font size, modes)
│   ├── offscreen.html/js       # Wasm bridge (loads Rust engine)
│   ├── rust_core.js            # Generated Wasm bindings
│   └── rust_core_bg.wasm       # Compiled NLP engine (~7MB)
│
├── rust-core/                  # Rust NLP Engine (compiles to Wasm)
│   ├── src/
│   │   ├── lib.rs              # Wasm API surface
│   │   ├── types.rs            # WordPinyin data type
│   │   ├── unicode.rs          # CJK detection & mixed-content splitting
│   │   └── segmenter.rs        # Jieba init & NLP pipeline
│   ├── tests/
│   │   └── integration_test.rs # End-to-end pipeline tests
│   └── Cargo.toml              # Rust dependencies
│
├── offscreen/                  # Offscreen document source
├── webapp/                     # Landing page (trylearnchinese.vercel.app)
└── build.sh                    # Build script (downloads dict + compiles Wasm)
```

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) — `cargo install wasm-pack`
- Wasm target — `rustup target add wasm32-unknown-unknown`

### Build

```bash
git clone https://github.com/chandlerkx/learnchinese.git
cd learnchinese
./build.sh
```

The build script will:
1. Download the jieba dictionary (~5MB, simplified Chinese, 349K entries)
2. Compile Rust to WebAssembly via `wasm-pack`
3. Copy the Wasm artifacts into `extension/`

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `extension/` folder
4. Navigate to any Chinese webpage

### Run Tests

```bash
cd rust-core
cargo test
```

Runs 14 unit tests, 5 integration tests, and 7 doc-tests.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+E` | Switch to English definitions mode |
| `Ctrl+Shift+H` | Toggle hover-only mode |
| `Ctrl+S` + hover | Text-to-speech (hold Ctrl+S, hover over a word) |

## Tech Stack

| Component | Technology |
|---|---|
| NLP Engine | Rust → WebAssembly ([jieba-rs](https://github.com/messense/jieba-rs)) |
| Extension | Chrome Manifest V3, vanilla JavaScript |
| Translation | Google Translate API |
| TTS | Chrome TTS API |
| Landing Page | Vite + React (hosted on Vercel) |

## Limitations

- **Simplified Chinese only** — The dictionary covers simplified characters (简体字). Traditional Chinese (繁體字) falls back to character-by-character splitting.
- **No polyphone disambiguation** — Characters with multiple readings (多音字) use their most common pronunciation.

## License

[MIT](LICENSE)
