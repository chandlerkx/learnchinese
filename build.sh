#!/bin/bash
set -e

# Download jieba dictionary if not present (~5MB, simplified Chinese, 349K entries)
if [ ! -f rust-core/dict.txt ]; then
    echo "Downloading jieba dictionary..."
    curl -L -o rust-core/dict.txt https://github.com/fxsjy/jieba/raw/master/jieba/dict.txt
    echo "Dictionary downloaded."
else
    echo "Dictionary already exists, skipping download."
fi

echo "Building Rust Core..."
cd rust-core
wasm-pack build --target web --out-name rust_core --out-dir pkg
cd ..

echo "Copying files to extension directory..."
# Create extension directory if it doesn't exist (though it should)
mkdir -p extension

# Copy Wasm artifacts
cp rust-core/pkg/rust_core.js extension/
cp rust-core/pkg/rust_core_bg.wasm extension/

# Copy Offscreen files
cp offscreen/offscreen.html extension/
cp offscreen/offscreen.js extension/

echo "Build complete. Load the 'extension' folder in Chrome."
