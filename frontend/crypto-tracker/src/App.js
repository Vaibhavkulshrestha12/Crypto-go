import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CryptoTracker from './components/CryptoTracker'; 
import Navbar from './components/Navbar'; 

const App = () => (
  <div>
    <Navbar /> {/* This will be rendered globally */}
    <Routes>
      <Route path="/tracker" element={<CryptoTracker />} />
    </Routes>
  </div>
);

export default App;
