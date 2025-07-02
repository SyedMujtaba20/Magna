// /src/App.jsx
import React, { useEffect } from 'react';
import LidarVisualizer from '../src/Pages/LidarVisualizer';
import Sidebar from '../src/Pages/SidebarDummy';
import HeaderComponent from '../src/Components/HeaderComponent';
// import { Sidebar } from 'lucide-react';
import '../src/utils/constants/index'; 
import i18n from 'i18next';

const App = () => {

   useEffect(() => {
    // Get saved lang from localStorage or default to 'en'
    const savedLang = localStorage.getItem('language') || 'en';
    i18n.changeLanguage(savedLang);
    console.log("gggg")
  }, []);
return(<div>
    {/* <h1>Lidar Scan Viewer</h1> */}
     <HeaderComponent />
     {/* <HeaderCom */}
    <LidarVisualizer />
   {/* <Sidebar/> */}

     {/* <Sidebar></Sidebar> */}
  </div>)
}

export default App;
