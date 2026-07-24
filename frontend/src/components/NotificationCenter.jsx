import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, CheckSquare, ShieldAlert, CircleAlert, Sparkles, UserCheck } from 'lucide-react';

export default function NotificationCenter() {
  const { notifications, markNotificationsAsRead } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    markNotificationsAsRead('all');
  };

  const handleMarkOneRead = (e, id) => {
    e.stopPropagation();
    markNotificationsAsRead(id);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <UserCheck className="notif-icon notif-success" />;
      case 'danger':
        return <ShieldAlert className="notif-icon notif-danger" />;
      case 'warning':
        return <CircleAlert className="notif-icon notif-warning" />;
      default:
        return <Sparkles className="notif-icon notif-info" />;
    }
  };

  return (
    <div className="notif-container" ref={dropdownRef}>
      <button className="notif-bell-btn" onClick={() => setIsOpen(!isOpen)} aria-label="Notifications">
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown glass-panel animate-slide-up">
          <div className="notif-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="btn-text" onClick={handleMarkAllRead}>
                <CheckSquare size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n._id || n.id} 
                  className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                  onClick={(e) => !n.isRead && handleMarkOneRead(e, n._id || n.id)}
                >
                  {getIcon(n.type)}
                  <div className="notif-body">
                    <p className="notif-msg">{n.message}</p>
                    <span className="notif-time">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {!n.isRead && <span className="unread-dot"></span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .notif-container {
          position: relative;
          z-index: 100;
        }
        .notif-bell-btn {
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          border-radius: 50%;
          transition: background-color var(--transition-fast);
        }
        .notif-bell-btn:hover {
          background-color: var(--border-color);
        }
        .notif-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          background-color: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 700;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg-secondary);
        }
        .notif-dropdown {
          position: absolute;
          right: 0;
          top: 45px;
          width: 320px;
          max-height: 400px;
          border-radius: var(--radius-md);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        .notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
        }
        .notif-header h3 {
          font-size: 1rem;
          font-weight: 600;
        }
        .btn-text {
          background: transparent;
          border: none;
          color: var(--primary);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .btn-text:hover {
          color: var(--primary-dark);
        }
        .notif-list {
          overflow-y: auto;
          flex: 1;
        }
        .notif-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }
        .notif-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          position: relative;
          transition: background-color var(--transition-fast);
        }
        .notif-item:hover {
          background-color: var(--border-color);
        }
        .notif-item.unread {
          background-color: rgba(var(--primary-rgb), 0.05);
        }
        .notif-icon {
          flex-shrink: 0;
          width: 18px;
          height: 18px;
          margin-top: 0.15rem;
        }
        .notif-success { color: var(--primary); }
        .notif-danger { color: #ef4444; }
        .notif-warning { color: #f59e0b; }
        .notif-info { color: #3b82f6; }
        
        .notif-body {
          flex: 1;
        }
        .notif-msg {
          font-size: 0.825rem;
          color: var(--text-primary);
          line-height: 1.3;
          margin-bottom: 0.25rem;
        }
        .notif-time {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .unread-dot {
          width: 6px;
          height: 6px;
          background-color: var(--primary);
          border-radius: 50%;
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
        }
      `}</style>
    </div>
  );
}
