import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-yellow-500 text-2xl font-bold">CryptoTracker</Link>
        <div>
          <Link to="/" className="text-white p-2 hover:bg-gray-700 rounded">Home</Link>
          <Link to="/tracker" className="text-white p-2 hover:bg-gray-700 rounded ml-4">Track Crypto</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;