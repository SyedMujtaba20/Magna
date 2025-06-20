import React from 'react';

const AboutVisioMAG = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="about-modal-content">
        <div className="about-modal-header">
          <div className="about-header-left">
            <div className="info-icon">ℹ</div>
            <h2 className="about-modal-title">About VisioMAG</h2>
          </div>
          <button 
            onClick={onClose}
            className="about-close-button"
          >
            ×
          </button>
        </div>
        
        <div className="about-modal-body" style={{ display: 'flex', gap: '20px' }}>
          <div className="logos-section" style={{ flex: '0 0 auto' }}>
            {/* MAGNA Logo with red border */}
            <div className="logo-container magna-logo-container">
              <img 
                src="/MagnaLogo.jpeg" 
                alt="MAGNA" 
                style={{width: '100%', height: 'auto'}}
                className="logo magna-logo"
              />
            </div>
          </div>
          
          <div className="info-section" style={{ flex: '1' }}>
            <h3 className="visio-title">VisioMAG</h3>
            <p className="version-text">Version 1.1.0</p>
            <p className="created-text">Created in Jully 2025</p>
            <p className="developed-text">
              Developed by <span className="tasiva-link">Magna</span>
            </p>
            
            {/* Red arrow and MAGNA text */}
            {/* <div className="magna-indicator">
              <div className="red-arrow">↓</div>
              <div className="magna-text">MAGNA</div>
              <div className="magna-number">3</div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutVisioMAG;