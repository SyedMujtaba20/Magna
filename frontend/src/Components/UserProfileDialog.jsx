import React, { useState, useEffect } from "react";
import { SlLock, SlLockOpen } from "react-icons/sl";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

const UserProfileDialog = ({ isOpen, onClose,currentRole ,  onRoleChange }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1 for login, 2 for confirmation
  const [selectedProfile, setSelectedProfile] = useState(currentRole);
  const [password, setPassword] = useState("");
  const [sessionDuration, setSessionDuration] = useState(30);
  const { t } = useTranslation();

  useEffect(() => {
    const savedLang = localStorage.getItem("language") || "en";
    i18n.changeLanguage(savedLang);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setSelectedProfile(
          parsedUser.role.charAt(0).toUpperCase() + parsedUser.role.slice(1)
        );
      }
    }
  }, [isOpen]);

  // const handleAccept = () => {
  //   if (currentStep === 1) {
  //     // Move to confirmation step
  //     setCurrentStep(2);
  //   } else {
  //     // Close dialog and reset
  //     onClose();
  //     setCurrentStep(1);
  //     setPassword("");
  //   }
  // };

  const handleAccept = () => {
    if (currentStep === 1) {
      // Store selected profile in localStorage
      const userData = { role: selectedProfile.toLowerCase() }; // e.g., "supervisor" or "operator"
      localStorage.setItem("user", JSON.stringify(userData));

      // Move to confirmation step
      setCurrentStep(2);
    } else {
      // Close dialog and reset
      onClose();
      setCurrentStep(1);
      setPassword("");
    }
  };

  const handleClose = () => {
    onClose();
    setCurrentStep(1);
    setPassword("");
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
              {/* <h2 className="user-profile-title">User Profile</h2> */}
              <h2 className="user-profile-title">{t("user.profileTitle")}</h2>
            </div>
            <button onClick={handleClose} className="user-profile-close">
              ×
            </button>
          </div>

          <div className="user-profile-body">
            <div className="lock-icon-container">
              <SlLock className="lock-icon" />
            </div>

        <div className="profile-form">
  <div className="form-group" style={{ width: '100%', marginBottom: '1rem' }}>
    <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
      {/* User Profile: */}
      {t("user.profileLabel")}:
    </label>
    <select
      value={selectedProfile}
      onChange={(e) => setSelectedProfile(e.target.value)}
      className="profile-select"
      style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
    >
      {/* <option value="Supervisor">Supervisor</option>
      <option value="Operator">Operator</option> */}
      <option value="Supervisor">
        {t("user.roles.supervisor")}
      </option>
      <option value="Operator">{t("user.roles.operator")}</option>
    </select>
  </div>

  <div className="form-group" style={{ width: '100%', marginBottom: '1rem' }}>
    {/* <label className="form-label">Password:</label> */}
    <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
      {t("user.password")}:
    </label>
    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="password-input"
      style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
    />
  </div>
</div>

            <button onClick={handleAccept} className="accept-button">
              {/* Accept */}
              {t("common.accept")}
            </button>
          </div>
        </div>
      ) : (
        // Step 2: Confirmation Dialog
        <div className="user-profile-modal confirmation-modal">
          <div className="user-profile-header">
            <div className="user-profile-header-left">
              <div className="info-icon">ℹ</div>
              {/* <h2 className="user-profile-title">User Profile</h2> */}
              <h2 className="user-profile-title">{t("user.profileTitle")}</h2>
            </div>
            <button onClick={handleClose} className="user-profile-close">
              ×
            </button>
          </div>

          <div className="user-profile-body confirmation-body">
            <div className="lock-icon-container">
              <SlLockOpen className="lock-icon-open" />
            </div>

            <div className="confirmation-content">
              <h3 className="confirmation-title">User switched to</h3>
              <h2 className="selected-profile">{selectedProfile}</h2>
              {/* <p className="session-info">
                <em>(session duration</em>
                <br />
                <em>{sessionDuration} minutes)</em>
              </p> */}
              <p className="session-info">
                <em>{t("session.durationPrefix")}</em>
                <br />
                <em>
                  {t("session.durationValue", { minutes: sessionDuration })}
                </em>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileDialog;
