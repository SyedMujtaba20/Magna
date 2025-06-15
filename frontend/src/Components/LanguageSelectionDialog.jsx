import React from "react";
import "./LanguageSelectionDialog.css";

const LanguageSelectionDialog = ({ isOpen, onClose, onLanguageSelect, selectedLanguage }) => {
  if (!isOpen) return null;

  const languages = [
    {
      code: "es",
      name: "Español",
      flag: "🇪🇸"
    },
    {
      code: "en",
      name: "English",
      flag: "🇺🇸"
    },
    {
      code: "fr",
      name: "Français",
      flag: "🇫🇷"
    },
    {
      code: "de",
      name: "Deutsch",
      flag: "🇩🇪"
    }
  ];

  const handleLanguageClick = (language) => {
    onLanguageSelect(language.name);
  };

  const handleAccept = () => {
    onClose();
  };

  return (
    <div className="language-dialog-overlay">
      <div className="language-dialog">
        {/* Header */}
        <div className="language-dialog-header">
          <div className="language-dialog-title">
            <span className="language-icon">🌐</span>
            <span>Language Selection</span>
          </div>
          <button className="language-dialog-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Language Options */}
        <div className="language-options">
          {languages.map((language) => (
            <div
              key={language.code}
              className={`language-option ${selectedLanguage === language.name ? 'selected' : ''}`}
              onClick={() => handleLanguageClick(language)}
            >
              <div className="language-flag">
                {language.flag}
              </div>
              <div className="language-name">
                {language.name}
              </div>
              {selectedLanguage === language.name && (
                <div className="language-indicator">
                  <span className="red-arrow">↑</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Accept Button */}
        <div className="language-dialog-footer">
          <button className="language-accept-button" onClick={handleAccept}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelectionDialog;