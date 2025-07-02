import React, { useState, useEffect } from "react";
import "./HeaderComponent.css";
import { FaRegUserCircle, FaWindowClose } from "react-icons/fa";
import { CiSettings } from "react-icons/ci";
import { MdPrecisionManufacturing } from "react-icons/md";
import UserProfileDialog from "./UserProfileDialog";
import AboutVisioMAG from "./AboutVisioMAG";
import PLCAccessControl from "./PLCAccessControl";
import SettingsDialog from "./SettingsDialog";
import LanguageSelectionDialog from "./LanguageSelectionDialog";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

const HeaderComponent = () => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAboutDropdownOpen, setIsAboutDropdownOpen] = useState(false); // New state for About dropdown
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isPLCAccessOpen, setIsPLCAccessOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLanguageSelectionOpen, setIsLanguageSelectionOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const { t } = useTranslation();
  const [user, setUser] = useState({}); // default to operator
  const role = localStorage.getItem("user");
  // const [currentLang, setCurrentLang] = useState("en");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, [role]);
     const flagMap = {
    en: "https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg",
    fr: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c3/Flag_of_France.svg/330px-Flag_of_France.svg.png",
    pt: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Flag_of_Portugal_%28official%29.svg/330px-Flag_of_Portugal_%28official%29.svg.png",
    es: "https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Flag_of_Spain.svg/640px-Flag_of_Spain.svg.png",
    de: "https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/Flag_of_Germany.svg/330px-Flag_of_Germany.svg.png",
  };

  useEffect(() => {
    const savedLang = localStorage.getItem("language") || "en";
    i18n.changeLanguage(savedLang);
    // setCurrentLang(savedLang);
  }, []);

  // Settings dropdown items
  const settingsDropdownItems = [
    {
      icon: <FaRegUserCircle />,
      label: "User",
      action: () => setIsUserProfileOpen(true),
    },
    {
      icon: <MdPrecisionManufacturing />,
      label: "PLC",
      action: () => setIsPLCAccessOpen(true),
    },
    {
      icon: <CiSettings />,
      label: "Settings",
      action: () => setIsSettingsOpen(true),
    },
    {
      icon: <FaWindowClose />,
      label: "Close",
      action: () => setIsDropdownOpen(false),
    },
  ];

  // About dropdown items
  const aboutDropdownItems = [
    {
      label: "Info",
      action: () => {
        setIsAboutOpen(true);
        setIsAboutDropdownOpen(false);
      },
    },
  ];

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const closeAbout = () => setIsAboutOpen(false);
  const closeUserProfile = () => setIsUserProfileOpen(false);
  const closePLCAccess = () => setIsPLCAccessOpen(false);
  const openLanguageSelection = () => setIsLanguageSelectionOpen(true);
  const closeLanguageSelection = () => setIsLanguageSelectionOpen(false);

  // const handleLanguageSelect = (language) => {
  //   setSelectedLanguage(language);
  //   closeLanguageSelection();
  // };
  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
    i18n.changeLanguage(language); // Updates i18n.language internally
    localStorage.setItem("language", language);
    closeLanguageSelection();
  };

  const formatDateTime = (date) => {
    return date
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(",", "");
  };

  const handleDropdownItemClick = (item) => {
    item.action();
    if (item.label !== "Close") {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="header-container">
      {/* Top Taskbar - Light gray background */}
      <div className="taskbar">
        {/* Left Section - Settings and About VisioMAG */}
        <div className="taskbar-left">
          <div className="dropdown-container">
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              {t("settings.title")}
              {/* Settings */}
            </button>

            {/* Settings Dropdown Menu */}
            {isDropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-menu-content">
                  {settingsDropdownItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleDropdownItemClick(item)}
                      className="dropdown-item dropdown-item-with-icon"
                    >
                      <span className="dropdown-icon">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="dropdown-container">
            <button
              onClick={() => setIsAboutDropdownOpen(!isAboutDropdownOpen)}
            >
              {/* About VisioMAG */}
              {t("about.title")}
            </button>

            {/* About VisioMAG Dropdown Menu */}
            {isAboutDropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-menu-content">
                  {aboutDropdownItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        item.action();
                        setIsAboutDropdownOpen(false);
                      }}
                      className="dropdown-item"
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Close Button */}
        <button className="close-button">×</button>
      </div>

      {/* Main Header - White background */}
      <div className="main-header">
        {/* Left Section - Operator Button and Flag */}
        <div className="header-left">
          {/* <button className="operator-button">{user.role === operator:{t("roles.operator")}: {t("roles.supervisor")}} */}
          {/* Operator */}
          {/* </button> */}
          <button className="operator-button">
            {user.role === "operator"
              ? t("user.roles.operator")
              : t("user.roles.supervisor")}
          </button>

          {/* <img
            src="https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg"
            alt="US Flag"
            className="flag-image"
            onClick={openLanguageSelection}
            style={{ cursor: "pointer" }}
          /> */}
          <img
            src={flagMap[i18n.language] || flagMap["en"]}
            alt={`${i18n.language.toUpperCase()} Flag`}
            className="flag-image"
            onClick={openLanguageSelection}
            style={{ cursor: "pointer" }}
          />
        </div>

        {/* Center Section - Date and Time */}
        <div className="header-center">
          <div className="date-time">Date: {formatDateTime(currentTime)}</div>
        </div>

        {/* Right Section - MAGNA Logo */}
        {/* <div className="header-right">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Magna_International_logo.svg/2560px-Magna_International_logo.svg.png"
            alt="MAGNA"
            className="magna-logo"
          />
        </div> */}
      </div>

      {/* Black separator line */}
      <div className="separator"></div>

      {/* Dialogs */}
      <UserProfileDialog
        isOpen={isUserProfileOpen}
        onClose={closeUserProfile}
        currentRole={user.role}
        onRoleChange={(newRole) => {
          const updatedUser = { role: newRole };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser); // this triggers re-render
        }}
      />
      <AboutVisioMAG isOpen={isAboutOpen} onClose={closeAbout} />
      <PLCAccessControl isOpen={isPLCAccessOpen} onClose={closePLCAccess} />
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <LanguageSelectionDialog
        isOpen={isLanguageSelectionOpen}
        onClose={closeLanguageSelection}
        onLanguageSelect={handleLanguageSelect}
        selectedLanguage={selectedLanguage}
      />

      {/* Overlay to close dropdowns when clicking outside */}
      {(isDropdownOpen || isAboutDropdownOpen) && (
        <div
          className="dropdown-overlay"
          onClick={() => {
            setIsDropdownOpen(false);
            setIsAboutDropdownOpen(false);
          }}
        ></div>
      )}
    </div>
  );
};

export default HeaderComponent;
