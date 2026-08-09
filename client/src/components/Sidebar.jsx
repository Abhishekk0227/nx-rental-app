import React from 'react';
import { LayoutDashboard, Car, Calendar, Users, Crosshair, DollarSign, BarChart3, Wrench, Settings, User, X } from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, userRole, isOpen, onClose }) {
  const isAdmin = userRole === 'admin';

  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'vehicles', label: 'Vehicle management', icon: <Car size={20} /> },    
    { id: 'available', label: 'Available vehicle', icon: <Users size={20} /> },
    { id: 'bookings', label: ' Booked vehicle', icon: <Calendar size={20} /> },
    { id: 'hisab', label: 'Daily Hisab', icon: <DollarSign size={20} /> },
    { id: 'admin/zones', label: 'Zone Management', icon: <Crosshair size={20}/>, adminOnly: true },
    { id: 'admin/workers', label: 'Worker Management', icon: <Wrench size={20}/>, adminOnly: true },
    { id: 'admin/maintenance', label: 'Maintenance & Service', icon: <Wrench size={20}/>, adminOnly: true },
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
            <span className="fo-logo-title">Ride Your Bike</span>
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
        <div className="fo-sidebar-footer" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="fo-user-avatar">
              <User size={18} color="white" strokeWidth={2} />
            </div>
            <div className="fo-user-info">
              <span className="fo-user-name">{isAdmin ? 'Admin User' : 'Worker'}</span>
              <span className="fo-user-role">Fleet Manager</span>
            </div>
          </div>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }} 
            style={{ width: '100%', padding: '8px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
