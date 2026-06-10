import React from 'react';
import { LayoutDashboard, Car, Calendar, Users, Crosshair, DollarSign, BarChart3, Wrench, Settings, User, X } from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, userRole, isOpen, onClose }) {
  const isAdmin = userRole === 'admin';

  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'vehicles', label: 'Vehicle management', icon: <Car size={20} />, adminOnly: true },    
    { id: 'available', label: 'Available vehicle', icon: <Users size={20} /> },
    { id: 'bookings', label: ' Booked vehicle', icon: <Calendar size={20} /> },
    // { id: 'fleet', label: 'Fleet Tracking', icon: <Crosshair size={20}/>, disabled: true },
    { id: 'hisab', label: 'Daily Hisab', icon: <DollarSign size={20} /> },
    // { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={20}/>, disabled: true },
    // { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={20}/>, disabled: true },
  ];

  const handleNavClick = (item) => {
    if (item.disabled) return;
    setCurrentTab(item.id);
    if (onClose) onClose(); // close drawer on mobile after nav
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fo-sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`fo-sidebar${isOpen ? ' fo-sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="fo-sidebar-logo">
          <div className="fo-logo-icon">
            <LayoutDashboard size={20} color="white" strokeWidth={2.5} />
          </div>
          <div className="fo-logo-text">
            <span className="fo-logo-title">NX Rental</span>
            <span className="fo-logo-subtitle">Enterprise Management</span>
          </div>
          {/* Close button – visible only on mobile */}
          <button className="fo-sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="fo-sidebar-nav">
          {mainNav.map(item => {
            if (item.adminOnly && !isAdmin) return null;
            return (
              <div
                key={item.id}
                className={`fo-nav-item ${currentTab === item.id ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                onClick={() => handleNavClick(item)}
              >
                <span className="fo-nav-icon">{item.icon}</span>
                <span className="fo-nav-label">{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* Settings */}
        <div className="fo-sidebar-bottom">
          <div className="fo-nav-item" onClick={() => { }}>
            <span className="fo-nav-icon"><Settings size={20} /></span>
            <span className="fo-nav-label">Settings</span>
          </div>
        </div>

        {/* User Footer */}
        <div className="fo-sidebar-footer">
          <div className="fo-user-avatar">
            <User size={18} color="white" strokeWidth={2} />
          </div>
          <div className="fo-user-info">
            <span className="fo-user-name">{isAdmin ? 'Admin User' : 'Worker'}</span>
            <span className="fo-user-role">Fleet Manager</span>
          </div>
        </div>
      </aside>
    </>
  );
}
