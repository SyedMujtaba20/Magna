// src/context/LanguageContext.js
import React, { createContext, useEffect, useState } from 'react';
import i18n from 'i18next';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'en');

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  const changeLanguage = (langCode) => {
    localStorage.setItem('language', langCode);
    setLanguage(langCode);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
