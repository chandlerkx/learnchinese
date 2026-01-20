#!/bin/bash
set -e

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
