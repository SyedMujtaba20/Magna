import React, { useState } from 'react';

const PLCAccessControl = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1 for password entry, 2 for error state
  const [password, setPassword] = useState('');
  const [showError, setShowError] = useState(false);

  const handleSubmit = () => {
    if (currentStep === 1) {
      // Simulate password validation - always show error for demo
      setShowError(true);
      setCurrentStep(2);
    } else {
      // Reset and close
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
    setCurrentStep(1);
    setPassword('');
    setShowError(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="plc-access-modal">
        <div className="plc-access-header">
          <div className="plc-access-header-left">
            <div className="plc-access-icon">🔒</div>
            <h2 className="plc-access-title">Access Control</h2>
          </div>
          <button onClick={handleClose} className="plc-access-close">×</button>
        </div>

        <div className="plc-access-body">
          <div className="password-section">
            <label className="password-label">Password:</label>
            <div className="password-input-container">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="plc-password-input"
                autoFocus
              />
              <button onClick={handleSubmit} className="submit-arrow">
                →
              </button>
            </div>
            
            {showError && currentStep === 2 && (
              <div className="error-message">
                Error: Incorrect password
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PLCAccessControl;