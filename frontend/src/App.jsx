import React, { useContext, useEffect } from 'react';
import LidarVisualizer from '../src/Pages/LidarVisualizer';
import HeaderComponent from '../src/Components/HeaderComponent';
import i18n from 'i18next';
import '../src/utils/constants/index';
import { LanguageContext } from './Components/LanguageContext';

const App = () => {
  const { language } = useContext(LanguageContext);

  useEffect(() => {
    // Set default user role if not already in localStorage
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      localStorage.setItem(
        'user',
        JSON.stringify({ role: 'operator' })
      );
    }
  }, []);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  return (
    <div>
      <HeaderComponent />
      <LidarVisualizer />
    </div>
  );
};

export default App;
