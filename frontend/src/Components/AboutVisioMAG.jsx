import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next'; // Import to access i18n instance directly

const AboutVisioMAG = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  useEffect(() => {
    const savedLang = localStorage.getItem('language') || 'en';
    i18n.changeLanguage(savedLang);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="about-modal-content">
        <div className="about-modal-header">
          <div className="about-header-left">
            <div className="info-icon">ℹ</div>
            <h2 className="about-modal-title">{t('about.title')}</h2>
          </div>
          <button onClick={onClose} className="about-close-button">×</button>
        </div>

        <div className="about-modal-body" style={{ display: 'flex', gap: '20px' }}>
          <div className="logos-section" style={{ flex: '0 0 auto' }}>
            <div className="logo-container magna-logo-container">
              <img src="/MagnaLogo.jpeg" alt="MAGNA" style={{ width: '100%', height: 'auto' }} />
            </div>
          </div>

          <div className="info-section" style={{ flex: '1' }}>
            <h3 className="visio-title">VisioMAG</h3>
            <p className="version-text">{t('about.version')}</p>
            <p className="created-text">{t('about.created')}</p>
            <p className="developed-text">
              {t('about.developedBy', { company: 'Magna' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutVisioMAG;
