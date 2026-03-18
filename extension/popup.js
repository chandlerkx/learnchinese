// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const sizeValue = document.getElementById('size-value');
    const enableToggle = document.getElementById('enableToggle');
    const hoverToggle = document.getElementById('hoverToggle');

    function updateSliderFill(slider) {
        const val = slider.value;
        const min = slider.min ? slider.min : 10;
        const max = slider.max ? slider.max : 30;
        const percentage = ((val - min) / (max - min)) * 100;
        slider.style.background = `linear-gradient(to right, #ef4444 ${percentage}%, #e5e7eb ${percentage}%)`;
    }

    // 1. Load the saved states on startup
    chrome.storage.local.get(['pinyinFontSize', 'pinyinEnabled', 'pinyinHover'], (result) => {
        const savedSize = result.pinyinFontSize || 14;
        fontSizeSlider.value = savedSize;
        sizeValue.textContent = savedSize + 'px';
        updateSliderFill(fontSizeSlider);
        
        // Default to true if not set
        enableToggle.checked = result.pinyinEnabled !== false;
        
        // Default hover to false
        hoverToggle.checked = result.pinyinHover === true;
    });

    // 2. Listen to toggle changes
    enableToggle.addEventListener('change', (event) => {
        const isEnabled = event.target.checked;
        chrome.storage.local.set({ pinyinEnabled: isEnabled });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'TOGGLE_PINYIN',
                    enabled: isEnabled
                }).catch(err => console.log("Tab not ready"));
            }
        });
    });

    hoverToggle.addEventListener('change', (event) => {
        const isHover = event.target.checked;
        chrome.storage.local.set({ pinyinHover: isHover });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'TOGGLE_HOVER',
                    hover: isHover
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
});
