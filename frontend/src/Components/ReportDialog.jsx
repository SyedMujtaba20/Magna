import React, { useEffect } from "react";
import "./ReportDialog.css";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

const ReportDialog = ({ 
  isOpen, 
  onClose, 
  onDailyReport, 
  onCampaignReport,
  // 🆕 NEW: Gunning data status prop
  hasGunningData = false 
}) => {
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

        {/* 🆕 NEW: Gunning data status notification */}
        {hasGunningData && (
          <div style={{
            backgroundColor: "#d4edda",
            border: "1px solid #c3e6cb",
            borderRadius: "6px",
            padding: "12px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span style={{ fontSize: "16px" }}>🔧</span>
            <div>
              <strong style={{ color: "#155724", fontSize: "14px" }}>
                Gunning Analysis Available
              </strong>
              <div style={{ color: "#155724", fontSize: "12px", marginTop: "2px" }}>
                Your Daily Report will include detailed gunning repair analysis
              </div>
            </div>
          </div>
        )}

        <div className="report-section">
          <h3>
            {t("report.selectType")}
          </h3>
          <div className="report-options">
            {/* 🔄 UPDATED: Enhanced Daily Report button */}
            <button 
              className="report-btn" 
              onClick={onDailyReport}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              📅 {t("report.daily")}
              {/* 🆕 NEW: Gunning enhancement indicator */}
              {hasGunningData && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: 'bold'
                }}>
                  ENHANCED
                </span>
              )}
            </button>
            
            <button className="report-btn" onClick={onCampaignReport}>
              📊 {t("report.campaign")}
            </button>
          </div>
          
          {/* 🆕 NEW: Report type descriptions */}
          <div style={{ marginTop: "16px", fontSize: "12px", color: "#666" }}>
            <div style={{ marginBottom: "8px" }}>
              <strong>📅 Daily Report:</strong> Comprehensive thickness analysis
              {hasGunningData && (
                <span style={{ color: "#28a745", fontWeight: "bold" }}>
                  {" "}+ gunning repair analysis with cost estimates
                </span>
              )}
            </div>
            <div>
              <strong>📊 Campaign Report:</strong> Long-term trends and historical data
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDialog;