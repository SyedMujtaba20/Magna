// /src/App.jsx
import React from 'react';
import LidarVisualizer from '../src/Pages/LidarVisualizer';
import Sidebar from '../src/Pages/SidebarDummy';
import HeaderComponent from '../src/Components/HeaderComponent';
// import { Sidebar } from 'lucide-react';

const App = () => (
  <div>
    {/* <h1>Lidar Scan Viewer</h1> */}
     <HeaderComponent />
     {/* <HeaderCom */}
    <LidarVisualizer />
   {/* <Sidebar/> */}

     {/* <Sidebar></Sidebar> */}
  </div>
);

export default App;
