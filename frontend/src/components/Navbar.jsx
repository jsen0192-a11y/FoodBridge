import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, HeartHandshake, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="navbar-container glass-panel">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-brand">
          <HeartHandshake className="brand-icon" />
          <span>Food<span className="brand-highlight">Bridge</span></span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          
          {path.startsWith('/dashboard/donor') && (
            <span className="nav-link flex-center font-bold text-emerald-500">
              <LayoutDashboard size={16} style={{ marginRight: '4px' }} />
              Donor Dashboard
            </span>
          )}

          {path.startsWith('/dashboard/ngo') && (
            <span className="nav-link flex-center font-bold text-indigo-500">
              <LayoutDashboard size={16} style={{ marginRight: '4px' }} />
              NGO Dashboard
            </span>
          )}

          {path.startsWith('/dashboard/admin') && (
            <span className="nav-link flex-center font-bold text-purple-500">
              <LayoutDashboard size={16} style={{ marginRight: '4px' }} />
              Admin Panel
            </span>
          )}
        </div>

        <div className="navbar-actions">
          {/* Theme Toggle */}
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
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
        
        @media (max-width: 768px) {
          .navbar-links {
            gap: 1rem;
          }
          .nav-link {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </nav>
  );
}
