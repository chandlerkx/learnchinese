// offscreen.js

// Import the WASM init function and the other functions
// We assume the wasm file and generated JS are accessible here.
// In the final build, they should be copied to the root or a known path in the extension.
// Usually wasm-pack generates a default export init and named exports.
import init, { rust_ping, get_pinyin_for_text } from './rust_core.js';

let wasmLoaded = false;

async function loadWasm() {
    try {
        await init();
        wasmLoaded = true;
        console.log("Wasm loaded successfully in offscreen.");
    } catch (e) {
        console.error("Failed to load Wasm:", e);
    }
}

loadWasm();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!wasmLoaded) {
        sendResponse({ error: "Wasm not loaded yet" });
        return;
    }

    if (request.type === 'PING_OFFSCREEN') {
        const result = rust_ping();
        sendResponse({ result: result });
    } else if (request.type === 'ANALYZE_OFFSCREEN') {
        try {
            const result = get_pinyin_for_text(request.text);
            sendResponse({ result: result });
        } catch (error) {
            sendResponse({ error: error.toString() });
        }
    }
});
