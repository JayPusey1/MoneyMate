import React from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import './Header.css';
import logo from '../images/moneymatelogo_full.png';

const Header = ({ user, onSignOut }) => {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-brand">
        <Link to="/dashboard" className="logo-link">
          <div className="logo-container">
            <img src={logo} alt="MoneyMate Logo" className="logo" />
          </div>
          </Link>
        </div>
        
        {user ? (
          <div className="header-actions">
            <div className="user-info">
              <User className="user-icon" size={18} />
              <span className="user-name">Hello, {user.displayName}!</span>
            </div>
            <button
              onClick={onSignOut}
              className="sign-out-button"
            >
              <LogOut className="sign-out-icon" size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="header-actions">
            <Link to="/login" className="login-button">
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;