import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, LogOut, LayoutDashboard, HeartHandshake } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    return `/dashboard/${user.role}`;
  };

  return (
    <nav className="navbar-container glass-panel">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-brand">
          <HeartHandshake className="brand-icon" />
          <span>Food<span className="brand-highlight">Bridge</span></span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <a href="#features" className="nav-link">Features</a>
          
          {user && (
            <Link to={getDashboardPath()} className="nav-link flex-center">
              <LayoutDashboard size={16} style={{ marginRight: '4px' }} />
              Dashboard
            </Link>
          )}
        </div>

        <div className="navbar-actions">
          {/* Theme Toggle */}
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user ? (
            <>
              {/* Notification Center */}
              <NotificationCenter />

              {/* User profile brief & Logout */}
              <div className="user-profile-menu">
                <div className="avatar-placeholder">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-info-text">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role">{user.role.toUpperCase()}</span>
                </div>
                <button className="logout-btn" onClick={handleLogout} title="Log Out">
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-secondary nav-btn">Log In</Link>
              <Link to="/register" className="btn btn-primary nav-btn">Donate Food</Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .navbar-container {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          z-index: 999;
          border-radius: 0;
          border-left: none;
          border-right: none;
          border-top: none;
          padding: 0.75rem 0;
          background: var(--bg-glass);
        }
        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-title);
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          text-decoration: none;
        }
        .brand-icon {
          color: var(--primary);
          width: 28px;
          height: 28px;
        }
        .brand-highlight {
          color: var(--primary);
        }
        .navbar-links {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        .nav-link {
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          transition: color var(--transition-fast);
        }
        .nav-link:hover {
          color: var(--primary);
        }
        .flex-center {
          display: inline-flex;
          align-items: center;
        }
        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        .theme-toggle-btn {
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color var(--transition-fast);
        }
        .theme-toggle-btn:hover {
          background-color: var(--border-color);
        }
        .auth-buttons {
          display: flex;
          gap: 0.75rem;
        }
        .nav-btn {
          padding: 0.5rem 1.25rem;
          font-size: 0.9rem;
        }
        .user-profile-menu {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border-left: 1px solid var(--border-color);
          padding-left: 1.25rem;
        }
        .avatar-placeholder {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: var(--primary);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
        }
        .user-info-text {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .user-role {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }
        .logout-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.4rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }
        .logout-btn:hover {
          color: #ef4444;
          background-color: rgba(239, 68, 68, 0.08);
        }
        
        @media (max-width: 768px) {
          .navbar-links {
            display: none; /* simple mobile fallback, responsive dashboard layout handles sidebar */
          }
        }
      `}</style>
    </nav>
  );
}
