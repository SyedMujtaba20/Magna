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

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
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
              Settings
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
            <button onClick={() => setIsAboutDropdownOpen(!isAboutDropdownOpen)}>
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
          <button className="operator-button">Operator</button>

          <img
            src="https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg"
            alt="US Flag"
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
      />
      <AboutVisioMAG isOpen={isAboutOpen} onClose={closeAbout} />
      <PLCAccessControl isOpen={isPLCAccessOpen} onClose={closePLCAccess} />
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
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