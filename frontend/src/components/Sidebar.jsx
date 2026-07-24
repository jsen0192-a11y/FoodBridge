import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Heart, 
  Map, 
  History, 
  Truck, 
  ShieldCheck, 
  Users, 
  BarChart3, 
  UserCircle 
} from 'lucide-react';

export default function Sidebar({ role }) {
  const getLinks = () => {
    switch (role) {
      case 'donor':
        return [
          { to: '/dashboard/donor', label: 'Overview & Donate', icon: <Heart size={18} /> },
          { to: '/dashboard/donor/history', label: 'My Donations', icon: <History size={18} /> }
        ];
      case 'ngo':
        return [
          { to: '/dashboard/ngo', label: 'Nearby Food Map', icon: <Map size={18} /> },
          { to: '/dashboard/ngo/accepted', label: 'Accepted Food', icon: <Heart size={18} /> }
        ];
      case 'volunteer':
        return [
          { to: '/dashboard/volunteer', label: 'My Pickups', icon: <Truck size={18} /> }
        ];
      case 'admin':
        return [
          { to: '/dashboard/admin', label: 'Overview Analytics', icon: <BarChart3 size={18} /> },
          { to: '/dashboard/admin/verifications', label: 'NGO Approvals', icon: <ShieldCheck size={18} /> },
          { to: '/dashboard/admin/users', label: 'Manage Users', icon: <Users size={18} /> }
        ];
      default:
        return [];
    }
  };

  const links = getLinks();

  return (
    <aside className="sidebar-container glass-panel">
      <div className="sidebar-header">
        <UserCircle size={32} className="role-icon" />
        <div className="sidebar-user-info">
          <h4>Portal</h4>
          <span className="role-badge">{role.toUpperCase()}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink 
            key={link.to} 
            to={link.to} 
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <style>{`
        .sidebar-container {
          height: calc(100vh - 75px);
          position: sticky;
          top: 75px;
          border-radius: 0;
          border-left: none;
          border-top: none;
          border-bottom: none;
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          background: var(--bg-glass);
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .role-icon {
          color: var(--primary);
        }
        .sidebar-user-info h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .role-badge {
          font-size: 0.7rem;
          font-weight: 700;
          color: #ffffff;
          background-color: var(--primary);
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-sm);
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all var(--transition-fast);
        }
        .sidebar-link:hover {
          color: var(--primary);
          background-color: rgba(var(--primary-rgb), 0.05);
        }
        .sidebar-link.active {
          color: #ffffff;
          background-color: var(--primary);
          box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.25);
        }
      `}</style>
    </aside>
  );
}
