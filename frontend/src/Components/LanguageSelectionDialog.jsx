import React, { useEffect, useState, useContext } from "react";
import "./LanguageSelectionDialog.css";
import { LanguageContext } from "./LanguageContext";

const LanguageSelectionDialog = ({ isOpen, onClose }) => {
  const { language, changeLanguage } = useContext(LanguageContext);
  const [currentLang, setCurrentLang] = useState(language);

  useEffect(() => {
    setCurrentLang(language);
  }, [language]);

    const flagMap = {
    en: "https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg",
    fr: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/Flag_of_France.svg/330px-Flag_of_France.svg.png",
    pt: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Flag_of_Portugal_%28official%29.svg/330px-Flag_of_Portugal_%28official%29.svg.png",
    es: "https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Flag_of_Spain.svg/640px-Flag_of_Spain.svg.png",
    de: "https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/Flag_of_Germany.svg/330px-Flag_of_Germany.svg.png",
  };

  // const languages = [
  //   { code: "en", name: "English", flag: "🇺🇸" },
  //   { code: "fr", name: "Français", flag: "🇫🇷" },
  //   { code: "es", name: "Español", flag: "🇪🇸" },
  //   { code: "de", name: "Deutsch", flag: "🇩🇪" },
  //   { code: "pt", name: "Português", flag: "🇵🇹" }
  // ];
  const languages = [
  { code: "en", name: "English", flagUrl: flagMap.en },
  { code: "fr", name: "Français", flagUrl: flagMap.fr },
  { code: "es", name: "Español", flagUrl: flagMap.es },
  { code: "de", name: "Deutsch", flagUrl: flagMap.de },
  { code: "pt", name: "Português", flagUrl: flagMap.pt },
];


  const handleLanguageClick = (language) => {
    setCurrentLang(language.code); // for UI highlighting
    changeLanguage(language.code); // updates context + i18n + localStorage
  };

  const handleAccept = () => {
    onClose(); // Just close, language already changed
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
              {/* <div className="language-flag">{language.flag}</div> */}
              <img
  src={language.flagUrl}
  alt={`${language.name} Flag`}
 className="flag-image"
  
/>

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
