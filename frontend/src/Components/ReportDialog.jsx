import React from "react";
import "./ReportDialog.css";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

const ReportDialog = ({ isOpen, onClose, onDailyReport, onCampaignReport }) => {
  if (!isOpen) return null;
  const { t } = useTranslation();

  useEffect(() => {
    const savedLang = localStorage.getItem("language") || "en";
    i18n.changeLanguage(savedLang);
  }, []);

  return (
    <div className="report-dialog-overlay">
      <div className="report-dialog">
        <div className="report-header">
          <h2>Create Report</h2>
          <button className="close-btn" onClick={onClose}>
            ✖
          </button>
        </div>

        <hr className="divider" />

        <div className="report-section">
          <h3>
            {/* Select Report Type */}
            {t("report.selectType")}
          </h3>
          <div className="report-options">
            {/* <button className="report-btn" onClick={onDailyReport}>
              📅 Daily Report
            </button>
            <button className="report-btn" onClick={onCampaignReport}>
              📊 Campaign Report
            </button> */}
            <button className="report-btn" onClick={onDailyReport}>
              📅 {t("report.daily")}
            </button>
            <button className="report-btn" onClick={onCampaignReport}>
              📊 {t("report.campaign")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDialog;
