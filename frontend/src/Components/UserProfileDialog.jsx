import React, { useState } from 'react';
import { SlLock, SlLockOpen } from "react-icons/sl";

const UserProfileDialog = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1 for login, 2 for confirmation
  const [selectedProfile, setSelectedProfile] = useState('Supervisor');
  const [password, setPassword] = useState('');
  const [sessionDuration, setSessionDuration] = useState(30);

  const handleAccept = () => {
    if (currentStep === 1) {
      // Move to confirmation step
      setCurrentStep(2);
    } else {
      // Close dialog and reset
      onClose();
      setCurrentStep(1);
      setPassword('');
    }
  };

  const handleClose = () => {
    onClose();
    setCurrentStep(1);
    setPassword('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      {currentStep === 1 ? (
        // Step 1: Login Dialog
        <div className="user-profile-modal">
          <div className="user-profile-header">
            <div className="user-profile-header-left">
              <div className="info-icon">ℹ</div>
              <h2 className="user-profile-title">User Profile</h2>
            </div>
            <button onClick={handleClose} className="user-profile-close">×</button>
          </div>

          <div className="user-profile-body">
            <div className="lock-icon-container">
              <SlLock className="lock-icon" />
            </div>

            <div className="profile-form">
              <div className="form-group">
                <label className="form-label">User Profile:</label>
                <select 
                  value={selectedProfile} 
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="profile-select"
                >
                  <option value="Supervisor">Supervisor</option>
                  <option value="Operator">Operator</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Password:</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="password-input"
                />
              </div>
            </div>

            <button onClick={handleAccept} className="accept-button">
              Accept
            </button>
          </div>
        </div>
      ) : (
        // Step 2: Confirmation Dialog
        <div className="user-profile-modal confirmation-modal">
          <div className="user-profile-header">
            <div className="user-profile-header-left">
              <div className="info-icon">ℹ</div>
              <h2 className="user-profile-title">User Profile</h2>
            </div>
            <button onClick={handleClose} className="user-profile-close">×</button>
          </div>

          <div className="user-profile-body confirmation-body">
            <div className="lock-icon-container">
              <SlLockOpen className="lock-icon-open" />
            </div>

            <div className="confirmation-content">
              <h3 className="confirmation-title">User switched to</h3>
              <h2 className="selected-profile">{selectedProfile}</h2>
              <p className="session-info">
                <em>(session duration</em>
                <br />
                <em>{sessionDuration} minutes)</em>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileDialog;