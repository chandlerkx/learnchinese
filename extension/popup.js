// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const sizeValue = document.getElementById('size-value');
    const ttsSpeedSlider = document.getElementById('ttsSpeedSlider');
    const speedValue = document.getElementById('speed-value');
    const enableToggle = document.getElementById('enableToggle');
    const hoverToggle = document.getElementById('hoverToggle');
    const englishToggle = document.getElementById('englishToggle');

    const labelOverlay = document.getElementById('labelOverlay');
    const labelHover = document.getElementById('labelHover');
    const labelEnglish = document.getElementById('labelEnglish');

    function updateLabelState(label, isActive) {
        if (isActive) {
            label.textContent = 'ON';
            label.classList.add('active');
        } else {
            label.textContent = 'OFF';
            label.classList.remove('active');
        }
    }

    function updateSliderFill(slider) {
        const val = slider.value;
        const min = slider.min ? slider.min : 10;
        const max = slider.max ? slider.max : 30;
        const percentage = ((val - min) / (max - min)) * 100;
        slider.style.background = `linear-gradient(to right, #ef4444 ${percentage}%, #e5e7eb ${percentage}%)`;
    }

    // 1. Load the saved states on startup
    chrome.storage.local.get(['pinyinFontSize', 'pinyinEnabled', 'pinyinHover', 'englishMode', 'ttsSpeed'], (result) => {
        const savedSize = result.pinyinFontSize || 14;
        fontSizeSlider.value = savedSize;
        sizeValue.textContent = savedSize + 'px';
        updateSliderFill(fontSizeSlider);
        
        const savedSpeed = result.ttsSpeed || 0.85;
        ttsSpeedSlider.value = savedSpeed;
        speedValue.textContent = savedSpeed + 'x';
        updateSliderFill(ttsSpeedSlider);
        
        const isEnabled = result.pinyinEnabled !== false;
        const isHover = result.pinyinHover === true;
        const isEnglish = result.englishMode === true;
        
        enableToggle.checked = isEnabled;
        hoverToggle.checked = isHover;
        englishToggle.checked = isEnglish;

        updateLabelState(labelOverlay, isEnabled);
        updateLabelState(labelHover, isHover);
        updateLabelState(labelEnglish, isEnglish);
    });

    // 2. Listen to toggle changes
    enableToggle.addEventListener('change', (event) => {
        const isActive = event.target.checked;
        updateLabelState(labelOverlay, isActive);
        chrome.storage.local.set({ pinyinEnabled: isActive });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'TOGGLE_PINYIN',
                    enabled: isActive
                }).catch(err => console.log("Tab not ready"));
            }
        });
    });

    hoverToggle.addEventListener('change', (event) => {
        const isActive = event.target.checked;
        updateLabelState(labelHover, isActive);
        chrome.storage.local.set({ pinyinHover: isActive });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'TOGGLE_HOVER',
                    hover: isActive
                }).catch(err => console.log("Tab not ready"));
            }
        });
    });

    englishToggle.addEventListener('change', (event) => {
        const isActive = event.target.checked;
        updateLabelState(labelEnglish, isActive);
        chrome.storage.local.set({ englishMode: isActive });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'TOGGLE_ENGLISH',
                    english: isActive
                }).catch(err => console.log("Tab not ready"));
            }
        });
    });

    // 3. Listen to slider changes
    fontSizeSlider.addEventListener('input', (event) => {
        const newSize = event.target.value;
        sizeValue.textContent = newSize + 'px';
        updateSliderFill(event.target);

        // 4. Save it back to storage
        chrome.storage.local.set({ pinyinFontSize: newSize });

        // 4. Broadcast the change to the active tab so it updates instantly
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'UPDATE_FONT_SIZE',
                    size: newSize
                }).catch(err => {
                    // Ignore errors if the content script isn't loaded on this specific tab yet
                    console.log("Could not send message to tab, it may not have content script loaded.");
                });
            }
        });
    });

    ttsSpeedSlider.addEventListener('input', (event) => {
        const newSpeed = event.target.value;
        speedValue.textContent = newSpeed + 'x';
        updateSliderFill(event.target);
        chrome.storage.local.set({ ttsSpeed: newSpeed });
    });
    // 5. Listen for background syncs (e.g., if user hits hotkeys while popup is open)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'SYNC_ENGLISH_MODE') {
            englishToggle.checked = request.english;
            updateLabelState(labelEnglish, request.english);
        } else if (request.type === 'SYNC_HOVER_MODE') {
            hoverToggle.checked = request.hover;
            updateLabelState(labelHover, request.hover);
        }
    });

});
