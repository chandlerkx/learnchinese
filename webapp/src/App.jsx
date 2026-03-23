import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [views, setViews] = useState('...');

  useEffect(() => {
    fetch('/api/views')
      .then(res => res.json())
      .then(data => {
        if (data.views) setViews(data.views);
      })
      .catch(err => console.error('Failed to fetch views:', err));
  }, []);

  return (
    <div className="retro-container">
      <h1>learnchinese</h1>
      
      <p>I created this extension to help me learn more Chinese characters through pinyin and direct translation.</p>
      
      <p>There are three hotkeys to make this app more accessible. Hover over text and hit <b>Ctrl + S</b> to hear what the characters sound like, <b>Ctrl + E</b> to turn Pinyin to English, and <b>Ctrl + H</b> to toggle hover mode.</p>
      
      <p>Feel free to try this extension and any feedback will be implemented in the next update :)</p>
      
      <p>
        <a href="https://docs.google.com/forms/d/e/1FAIpQLSdnJrv-bhL8CAecI_rPr3lme_MgmWL3NHK2bl3fNDdWI9J00w/viewform?usp=header" target="_blank" rel="noopener noreferrer">
          Feedback Form
        </a>
      </p>
      
      <hr />
      <small>Page Views: {views} | Made for Chrome Web Store.</small>
    </div>
  );
}

export default App;
