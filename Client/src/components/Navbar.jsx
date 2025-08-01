import React from 'react';
import '../styles/Navbar.css';

const Navbar = () => {
  return (
    <header>
      <div className="header-container">
        <div className="logo-section">
          <div className="logo-icon">
            <span>▶️</span>
          </div>
          <div className="logo-text">ClipCatch</div>
        </div>
        <p className="header-description">
          Download your favorite YouTube videos quickly and easily. 
          Paste any YouTube link and get instant access to high-quality downloads.
        </p>
      </div>
    </header>
  );
};

export default Navbar;