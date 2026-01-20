// background.js

let creating; // A global promise to avoid concurrency issues

async function setupOffscreenDocument(path) {
  // Check all windows controlled by the service worker to see if one 
  // of them is the offscreen document with the given path
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // create offscreen document
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['BLOBS'], // Using BLOBS as a generic reason since we are doing WASM/Processing
      justification: 'WASM execution for NLP',
    });
    await creating;
    creating = null;
  }
}

// Ensure offscreen document is setup
setupOffscreenDocument('offscreen.html');

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'PING_TEST') {
        // Forward ping to offscreen
        chrome.runtime.sendMessage({ type: 'PING_OFFSCREEN' }, (response) => {
            sendResponse(response);
        });
        return true; // Keep channel open
    } else if (request.type === 'ANALYZE_TEXT') {
        chrome.runtime.sendMessage({ type: 'ANALYZE_OFFSCREEN', text: request.text }, (response) => {
            sendResponse(response);
        });
        return true;
    }
});

// Self-test / Verification Log
console.log("Background service worker loaded.");
setTimeout(() => {
    console.log("Attempting Ping Test...");
    chrome.runtime.sendMessage({ type: 'PING_OFFSCREEN' }, (response) => {
        console.log("Ping Test Result:", response);
    });
}, 2000);
