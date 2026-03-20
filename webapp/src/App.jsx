import React from 'react';
import './App.css';

function App() {
  return (
    <div className="container">
      <div className="hero">
        <div className="badge">v0.1.0 • Now in Beta</div>
        <h1 className="title">
          Master Chinese <br/>
          <span className="title-highlight">Effortlessly</span>
        </h1>
        <p className="subtitle">
          A powerful Chrome Extension bringing AI-driven Pinyin overlays, native Text-To-Speech, and instant English translations directly to your browser.
        </p>
        <button className="cta-button" onClick={() => document.getElementById('install').scrollIntoView({ behavior: 'smooth' })}>
          <svg className="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Get the Extension
        </button>
      </div>

      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">
            <svg className="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
          </div>
          <h3 className="feature-title">Pinyin Overlays</h3>
          <p className="feature-desc">Powered by an advanced offline Rust WASM engine to intelligently tokenize and render pinyin ruby annotations above any Chinese characters.</p>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">
            <svg className="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
          </div>
          <h3 className="feature-title">Native Text-to-Speech</h3>
          <p className="feature-desc">Hit Ctrl+S while hovering any word to hear a native Chinese voice pronunciation, complete with adjustable speed settings.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg className="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m5 8 6 6M4 14 6-4Z" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h3 className="feature-title">Instant Translation</h3>
          <p className="feature-desc">Hold Ctrl+E to instantly swap out characters for their direct English definitions using Google's translation API cache.</p>
        </div>
      </div>

      <div id="install" className="install-guide">
        <h2>How to Install</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Download the Extension</h3>
              <p>Ask me for the raw `.zip` file of the LearnChinese extension and extract it to a folder on your computer.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Enable Developer Mode</h3>
              <p>In Chrome, navigate to <code>chrome://extensions/</code> in your URL bar and toggle "Developer Mode" on in the top right corner.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Load Unpacked</h3>
              <p>Click the "Load unpacked" button that appears in the top left and select the folder where you extracted the extension. You're ready to go!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
