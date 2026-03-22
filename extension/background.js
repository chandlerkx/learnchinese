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
    } else if (request.type === 'FETCH_DEFINITION') {
        fetchDefinition(request.word).then(sendResponse);
        return true; // Keep channel open for async fetch
    } else if (request.type === 'SPEAK_TEXT') {
        chrome.storage.local.get({ ttsSpeed: 0.85 }, (result) => {
            chrome.tts.getVoices((voices) => {
                let chosenVoiceName = undefined;
                
                const zhVoices = voices.filter(v => v.lang && v.lang.toLowerCase().includes('zh'));
                
                // Identify a female voice (Ting-Ting is the standard macOS female Chinese voice)
                const femaleVoice = zhVoices.find(v => {
                    const name = v.voiceName.toLowerCase();
                    return name.includes('ting') || name.includes('google 普通话') || name.includes('female');
                });

                if (femaleVoice) {
                    chosenVoiceName = femaleVoice.voiceName;
                }

                const cleanText = request.text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
                
                if (cleanText) {
                    chrome.tts.stop(); // Stop any currently playing audio so it doesn't overlap
                    chrome.tts.speak(cleanText, { 
                        lang: 'zh-CN', 
                        rate: parseFloat(result.ttsSpeed),
                        pitch: 1.2,
                        voiceName: chosenVoiceName
                    });
                }
            });
        });
        return false;
    }
});

// Simple cache to prevent spamming the translation API for the same words
const definitionCache = new Map();

async function fetchDefinition(word) {
    if (definitionCache.has(word)) {
        return { definition: definitionCache.get(word) };
    }

    try {
        // Use Google Translate's free backend API (used natively by Chrome)
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=${encodeURIComponent(word)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        const englishTranslation = data[0][0][0]; // Deep pluck the translated string
        
        definitionCache.set(word, englishTranslation);
        return { definition: englishTranslation };
    } catch (error) {
        console.error("Translation error:", error);
        return { error: error.toString() };
    }
}

// Self-test / Verification Log
console.log("Background service worker loaded.");
setTimeout(() => {
    console.log("Attempting Ping Test...");
    chrome.runtime.sendMessage({ type: 'PING_OFFSCREEN' }, (response) => {
        console.log("Ping Test Result:", response);
    });
}, 2000);
