import React, { useEffect, useState } from "react";
import "./LanguageSelectionDialog.css";

const LanguageSelectionDialog = ({ isOpen, onClose, onLanguageSelect, selectedLanguage }) => {
  const [currentLang, setCurrentLang] = useState("en");

  useEffect(() => {
    const storedLang = localStorage.getItem("language") || "en";
    setCurrentLang(storedLang);
  }, []);

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "pt", name: "Português", flag: "🇵🇹" }
  ];

  const handleLanguageClick = (language) => {
    localStorage.setItem("language", language.code); // Save in localStorage
    setCurrentLang(language.code);
    onLanguageSelect(language.code); // Pass code not name
  };

  const handleAccept = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="language-dialog-overlay">
      <div className="language-dialog">
        {/* Header */}
        <div className="language-dialog-header">
          <div className="language-dialog-title">
            <span className="language-icon">🌐</span>
            <span>Language Selection</span>
          </div>
          <button className="language-dialog-close" onClick={onClose}>×</button>
        </div>

        {/* Language Options */}
        <div className="language-options">
          {languages.map((language) => (
            <div
              key={language.code}
              className={`language-option ${currentLang === language.code ? 'selected' : ''}`}
              onClick={() => handleLanguageClick(language)}
            >
              <div className="language-flag">{language.flag}</div>
              <div className="language-name">{language.name}</div>
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
