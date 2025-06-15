import React, { useState } from 'react';
import './SettingsDialog.css';

const SettingsDialog = ({ isOpen, onClose }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showBrickSettings, setShowBrickSettings] = useState(false);
  
  // Gradient settings state
  const [gradientSettings, setGradientSettings] = useState([
    { min: 0, max: 20, color: '#00FF00' },
    { min: 20, max: 30, color: '#8B4513' },
    { min: 30, max: 40, color: '#FFA500' },
    { min: 40, max: 50, color: '#FF00FF' },
    { min: 50, max: Infinity, color: '#0000FF' }
  ]);

  // Brick thickness settings state
  const [brickThickness, setBrickThickness] = useState({
    initialBricks: Array(16).fill(40.00),
    slagLine: Array(16).fill(50.00),
    slopes: Array(16).fill(40.00)
  });

  const handleGradientChange = (index, field, value) => {
    const newSettings = [...gradientSettings];
    if (field === 'max' && value === '∞') {
      newSettings[index][field] = Infinity;
    } else {
      newSettings[index][field] = field === 'color' ? value : parseFloat(value) || 0;
    }
    setGradientSettings(newSettings);
  };

  const handleBrickThicknessChange = (section, index, value) => {
    setBrickThickness(prev => ({
      ...prev,
      [section]: prev[section].map((val, i) => i === index ? parseFloat(value) || 0 : val)
    }));
  };

  const handleReset = () => {
    setGradientSettings([
      { min: 0, max: 20, color: '#00FF00' },
      { min: 20, max: 30, color: '#8B4513' },
      { min: 30, max: 40, color: '#FFA500' },
      { min: 40, max: 50, color: '#FF00FF' },
      { min: 50, max: Infinity, color: '#0000FF' }
    ]);
    setBrickThickness({
      initialBricks: Array(16).fill(40.00),
      slagLine: Array(16).fill(50.00),
      slopes: Array(16).fill(40.00)
    });
    setShowResetConfirm(false);
  };

  const handleSave = () => {
    // Implement save logic here
    console.log('Settings saved:', { gradientSettings, brickThickness });
    onClose();
  };

  if (!isOpen) return null;

  // Reset confirmation dialog
  if (showResetConfirm) {
    return (
      <div className="settings-overlay">
        <div className="settings-dialog settings-dialog-small">
          <div className="settings-header">
            <div className="settings-title-container">
              <div className="settings-icon">
                <span>ℹ</span>
              </div>
              <h3 className="settings-title">TASIVA</h3>
            </div>
            <button 
              onClick={() => setShowResetConfirm(false)}
              className="settings-close-btn"
            >
              ×
            </button>
          </div>
          
          <div className="settings-confirm-content">
            <div className="settings-question-icon">
              <span>?</span>
            </div>
            <p className="settings-confirm-text">Do you want to re-establish the predetermined parameters?</p>
          </div>
          
          <div className="settings-button-group settings-button-group-right">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="settings-btn settings-btn-secondary"
            >
              Yes
            </button>
            <button
              onClick={handleReset}
              className="settings-btn settings-btn-primary"
            >
              No
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Brick thickness settings dialog
  if (showBrickSettings) {
    return (
      <div className="settings-overlay">
        <div className="settings-dialog settings-dialog-large">
          <div className="settings-header">
            <div className="settings-title-container">
              <div className="settings-icon">
                <span>ℹ</span>
              </div>
              <h3 className="settings-title">Brick Thickness Settings</h3>
            </div>
            <button 
              onClick={() => setShowBrickSettings(false)}
              className="settings-close-btn"
            >
              ×
            </button>
          </div>
          
          <div className="settings-table-container">
            <table className="settings-table">
              <thead>
                <tr className="settings-table-header">
                  <th className="settings-table-cell settings-table-cell-header"></th>
                  {Array.from({ length: 16 }, (_, i) => (
                    <th key={i} className="settings-table-cell settings-table-cell-header settings-table-cell-center">
                      P{i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="settings-table-row-green">
                  <td className="settings-table-cell settings-table-cell-label">Initial Bricks</td>
                  {brickThickness.initialBricks.map((value, i) => (
                    <td key={i} className="settings-table-cell settings-table-cell-input">
                      <input
                        type="number"
                        value={value.toFixed(2)}
                        onChange={(e) => handleBrickThicknessChange('initialBricks', i, e.target.value)}
                        className="settings-input settings-input-table"
                        step="0.01"
                      />
                    </td>
                  ))}
                </tr>
                <tr className="settings-table-row-green">
                  <td className="settings-table-cell settings-table-cell-label">Slag Line</td>
                  {brickThickness.slagLine.map((value, i) => (
                    <td key={i} className="settings-table-cell settings-table-cell-input">
                      <input
                        type="number"
                        value={value.toFixed(2)}
                        onChange={(e) => handleBrickThicknessChange('slagLine', i, e.target.value)}
                        className="settings-input settings-input-table"
                        step="0.01"
                      />
                    </td>
                  ))}
                </tr>
                <tr className="settings-table-row-green">
                  <td className="settings-table-cell settings-table-cell-label">Slopes</td>
                  {brickThickness.slopes.map((value, i) => (
                    <td key={i} className="settings-table-cell settings-table-cell-input">
                      <input
                        type="number"
                        value={value.toFixed(2)}
                        onChange={(e) => handleBrickThicknessChange('slopes', i, e.target.value)}
                        className="settings-input settings-input-table"
                        step="0.01"
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="settings-button-group settings-button-group-center">
            <button
              onClick={handleSave}
              className="settings-btn settings-btn-primary settings-btn-large"
            >
              Save
            </button>
            <button
              onClick={() => setShowBrickSettings(false)}
              className="settings-btn settings-btn-secondary settings-btn-large"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main settings dialog
  return (
    <div className="settings-overlay">
      <div className="settings-dialog settings-dialog-medium">
        <div className="settings-header">
          <div className="settings-title-container">
            <div className="settings-icon">
              <span>ℹ</span>
            </div>
            <h3 className="settings-title">Settings</h3>
          </div>
          <button 
            onClick={onClose}
            className="settings-close-btn"
          >
            ×
          </button>
        </div>
        
        {/* Gradient Settings Section */}
        <div className="settings-section">
          <h4 className="settings-section-title">Gradient Settings</h4>
          
          <div className="settings-gradient-header">
            <div className="settings-gradient-col">Min</div>
            <div className="settings-gradient-col">Max</div>
            <div className="settings-gradient-col">Colour</div>
          </div>
          
          {gradientSettings.map((setting, index) => (
            <div key={index} className="settings-gradient-row">
              <input
                type="number"
                value={setting.min}
                onChange={(e) => handleGradientChange(index, 'min', e.target.value)}
                className="settings-input settings-input-gradient"
              />
              <input
                type="text"
                value={setting.max === Infinity ? '∞' : setting.max}
                onChange={(e) => handleGradientChange(index, 'max', e.target.value)}
                className="settings-input settings-input-gradient"
              />
              <div className="settings-color-container">
                <input
                  type="color"
                  value={setting.color}
                  onChange={(e) => handleGradientChange(index, 'color', e.target.value)}
                  className="settings-input-color"
                />
              </div>
            </div>
          ))}
        </div>
        
        <hr className="settings-separator" />
        
        {/* Brick Thickness Settings Section */}
        <div className="settings-section">
          <h4 className="settings-section-title">Brick thickness settings</h4>
          <button
            onClick={() => setShowBrickSettings(true)}
            className="settings-btn settings-btn-secondary"
          >
            Settings...
          </button>
        </div>
        
        <hr className="settings-separator" />
        
        {/* Action Buttons */}
        <div className="settings-button-group settings-button-group-center">
          <button
            onClick={handleSave}
            className="settings-btn settings-btn-secondary"
          >
            Save
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="settings-btn settings-btn-secondary"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="settings-btn settings-btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;