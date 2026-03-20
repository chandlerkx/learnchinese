// content.js
console.log("Pinyin NLP Content script loaded.");

// Inject custom CSS to style the Pinyin
const style = document.createElement('style');

function updateStyle(fontSize, enabled, hoverMode) {
    const displayStyle = enabled ? 'ruby-text' : 'none';
    
    // Core styling for the Ruby text
    let rubyCss = `
        ruby rt {
            font-size: ${fontSize}px;
            color: #ef4444; /* Give it a nice pop matching the UI */
            font-weight: 500;
            user-select: none;
            display: ${displayStyle};
            transition: opacity 0.25s ease-in-out, transform 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
        }
    `;

    // If hover mode is enabled, we hide the rt tags initially, and only show them on ruby:hover
    if (hoverMode && enabled) {
        rubyCss += `
            ruby {
                cursor: pointer;
            }
            ruby rt {
                opacity: 0;
                transform: translateY(5px); /* Start slightly below final position */
                pointer-events: none; /* Prevent the pinyin from stealing hover state */
            }
            ruby:hover rt {
                opacity: 1;
                transform: translateY(0);
            }
        `;
    }

    style.textContent = rubyCss;
}

// Initial load
let currentFontSize = 14;
let isPinyinEnabled = true;
let isHoverMode = false;
let isEnglishMode = false;
let isEnglishHoldPressed = false;
let currentlyHoveredWord = null;

// Track which ruby element we are hovering over for TTS
document.addEventListener('mouseover', (e) => {
    const ruby = e.target.closest('ruby.learnchinese-ruby');
    if (ruby) {
        currentlyHoveredWord = ruby.dataset.word;
    }
});

document.addEventListener('mouseout', (e) => {
    const ruby = e.target.closest('ruby.learnchinese-ruby');
    if (ruby && currentlyHoveredWord === ruby.dataset.word) {
        currentlyHoveredWord = null;
    }
});

chrome.storage.local.get(['pinyinFontSize', 'pinyinEnabled', 'pinyinHover', 'englishMode'], (result) => {
    currentFontSize = result.pinyinFontSize || 14;
    isPinyinEnabled = result.pinyinEnabled !== false;
    isHoverMode = result.pinyinHover === true;
    isEnglishMode = result.englishMode === true;
    
    updateStyle(currentFontSize, isPinyinEnabled, isHoverMode);
    if (isEnglishMode) toggleAllEnglish(true);
});
document.head.appendChild(style);

// Listen for live updates from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'UPDATE_FONT_SIZE') {
        currentFontSize = request.size;
        updateStyle(currentFontSize, isPinyinEnabled, isHoverMode);
    } else if (request.type === 'TOGGLE_PINYIN') {
        isPinyinEnabled = request.enabled;
        updateStyle(currentFontSize, isPinyinEnabled, isHoverMode);
    } else if (request.type === 'TOGGLE_HOVER') {
        isHoverMode = request.hover;
        updateStyle(currentFontSize, isPinyinEnabled, isHoverMode);
    } else if (request.type === 'TOGGLE_ENGLISH') {
        isEnglishMode = request.english;
        toggleAllEnglish(isEnglishMode);
    }
});

// --- English Translation Logic ---

async function fetchEnglishDefinition(word, rtElement) {
    if (rtElement.dataset.english) {
        rtElement.textContent = rtElement.dataset.english;
        return;
    }

    // Set a loading state
    const originalPinyin = rtElement.dataset.pinyin;
    rtElement.textContent = "...";

    chrome.runtime.sendMessage({ type: 'FETCH_DEFINITION', word: word }, (response) => {
        if (response && response.definition) {
            rtElement.dataset.english = response.definition;
            // Only swap the text if we are STILL in english mode after the fetch returns
            if (isEnglishMode || isEnglishHoldPressed) { 
                rtElement.textContent = response.definition;
            }
        } else {
            rtElement.textContent = originalPinyin; // Revert on error
        }
    });
}

function toggleAllEnglish(forceEnglish) {
    const rubys = document.querySelectorAll('ruby.learnchinese-ruby');
    rubys.forEach(ruby => {
        const rt = ruby.querySelector('rt');
        if (!rt) return;

        if (forceEnglish) {
            const word = ruby.dataset.word;
            fetchEnglishDefinition(word, rt);
        } else {
            rt.textContent = rt.dataset.pinyin;
        }
    });
}

// Global Keyboard Listeners for Ctrl+E and Ctrl+H
document.addEventListener('keydown', (e) => {
    // TTS Speak (Ctrl+S)
    if (e.ctrlKey && !e.shiftKey && e.code === 'KeyS') {
        e.preventDefault();
        if (e.repeat) return; // Ignore holding down multiple fires

        if (currentlyHoveredWord) {
            chrome.runtime.sendMessage({ type: 'SPEAK_TEXT', text: currentlyHoveredWord }).catch(() => {});
        }
    }

    // English mode hold (Ctrl+E)
    if (e.ctrlKey && !e.shiftKey && e.code === 'KeyE') {
        e.preventDefault(); // Prevent Chrome search bar stuff
        if (e.repeat) return; // Ignore holding down multiple fires
        
        isEnglishHoldPressed = true;
        toggleAllEnglish(true);
    }

    // Hover mode toggle (Ctrl+H)
    if (e.ctrlKey && !e.shiftKey && e.code === 'KeyH') {
        e.preventDefault();
        if (e.repeat) return;

        isHoverMode = !isHoverMode;
        chrome.storage.local.set({ pinyinHover: isHoverMode });
        updateStyle(currentFontSize, isPinyinEnabled, isHoverMode);
        
        // Broadcast the change to popup if it's open
        chrome.runtime.sendMessage({ type: 'SYNC_HOVER_MODE', hover: isHoverMode }).catch(() => {});
    }
});

document.addEventListener('keyup', (e) => {
    // We check if Ctrl, Shift or E was released to catch the release consistently
    if (e.code === 'KeyE' || e.key === 'Control' || e.key === 'Shift') {
        if (!isEnglishHoldPressed) return; // Prevent spurious keyups
        isEnglishHoldPressed = false;

        // Only revert if the hard toggle isn't on
        toggleAllEnglish(isEnglishMode); 
    }
});

// --- DOM Parsing Logic ---
const CHINESE_REGEX = /[\u4e00-\u9fa5]/;


// Tags we should never inject ruby into to avoid breaking the page
const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'XMP', 'TEXT', 'TITLE']);

async function processTextNode(textNode) {
    const text = textNode.nodeValue;
    if (!text || !text.trim() || !CHINESE_REGEX.test(text)) {
        return;
    }

    try {
        // Send the mixed string to the background script to get Pinyin parsing
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'ANALYZE_TEXT', text: text }, (response) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(response);
            });
        });

        if (response && response.result) {
            replaceNodeWithRuby(textNode, response.result);
        }
    } catch (e) {
        console.error("Failed to process text node:", e);
    }
}

function replaceNodeWithRuby(textNode, pinyinArray) {
    // pinyinArray looks like: [{word: "你好", pinyin: "nǐ hǎo"}, {word: " ", pinyin: null}, {word: "世界", pinyin: "shì jiè"}]
    // However, our rust core currently only splits by whitespace and processes everything assuming it's Chinese.
    // It doesn't gracefully handle mixed English/Chinese inside a single no-whitespace chunk yet.
    // Let's create the ruby fragment based exactly on what the rust core returns.

    const fragment = document.createDocumentFragment();

    for (const item of pinyinArray) {
        if (item.pinyin && CHINESE_REGEX.test(item.word)) {
            // It has pinyin, wrap in ruby
            // We wrap it in a custom class to easily query it later
            const ruby = document.createElement('ruby');
            ruby.className = 'learnchinese-ruby';
            ruby.dataset.word = item.word; // Store the original word for English fetches
            
            const rt = document.createElement('rt');
            rt.dataset.pinyin = item.pinyin; // Store the pinyin so we can swap back
            rt.textContent = isEnglishMode ? "..." : item.pinyin; // Default load state

            ruby.appendChild(document.createTextNode(item.word));
            ruby.appendChild(rt);
            fragment.appendChild(ruby);

            // If English mode is already active, trigger the background fetch
            if (isEnglishMode) {
                fetchEnglishDefinition(item.word, rt);
            }
        } else {
            // No pinyin (or it's just punctuation/english that the rust core couldn't translate), append as normal text
            fragment.appendChild(document.createTextNode(item.word));
        }

        // Add a space after the word since our rust core split by whitespace and consumed the spaces
        fragment.appendChild(document.createTextNode(" "));
    }

    // Replace the original text node
    if (textNode.parentNode) {
        textNode.parentNode.replaceChild(fragment, textNode);
    }
}

function walkDOM(node) {
    // Standard TreeWalker to find all Text Nodes
    const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function (node) {
                if (node.parentNode && IGNORED_TAGS.has(node.parentNode.tagName)) {
                    return NodeFilter.FILTER_REJECT;
                }
                // Skip nodes that are already inside our ruby tags
                if (node.parentNode && (node.parentNode.tagName === 'RUBY' || node.parentNode.tagName === 'RT')) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (CHINESE_REGEX.test(node.nodeValue)) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
            }
        }
    );

    const nodesToProcess = [];
    let currentNode;
    while (currentNode = walker.nextNode()) {
        nodesToProcess.push(currentNode);
    }

    // Process nodes asynchronously
    for (const textNode of nodesToProcess) {
        processTextNode(textNode);
    }
}

// Kick off the initial scan
walkDOM(document.body);
