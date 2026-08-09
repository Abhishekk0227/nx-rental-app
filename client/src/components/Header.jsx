import React from 'react';
import { Search, Bell, HelpCircle, Download, Plus, Menu } from 'lucide-react';

export default function Header({ currentTab, userRole, setUserRole, currentWorker, setCurrentWorker, dbStatus, onMenuClick, onAddVehicle }) {
  return (
    <header className="fo-header">
      {/* Hamburger – mobile only */}
      <button className="fo-hamburger" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={22} color="#64748b" strokeWidth={2}/>
      </button>

      {/* Search – hidden on small mobile */}
      <div className="fo-header-search">
        <Search size={18} color="#94a3b8" strokeWidth={2}/>
        <input
          type="text"
          placeholder="Search vehicles, bookings, customers..."
          className="fo-search-input"
        />
      </div>

      {/* Right side actions */}
      <div className="fo-header-actions">
        <button className="fo-header-icon-btn" title="Notifications">
          <Bell size={20} color="#64748b" strokeWidth={2}/>
        </button>

        <button className="fo-header-icon-btn fo-hide-mobile" title="Help">
          <HelpCircle size={20} color="#64748b" strokeWidth={2}/>
        </button>

        {userRole === 'admin' && (
          <button className="fo-btn-outline fo-hide-mobile" onClick={() => window.print()}>
            <Download size={16}/> Export
          </button>
        )}

        {/* Add Vehicle – only visible in admin mode */}
        {userRole === 'admin' && (
          <button
            className="fo-btn-primary"
            onClick={onAddVehicle}
            title="Add new vehicle to fleet"
          >
            <Plus size={16} strokeWidth={2.5}/>
            <span className="fo-btn-label">Add Vehicle</span>
          </button>
        )}

        {/* Worker mode indicator (removed switch and dropdown) */}

        {/* Role toggle for admin (subtle) */}
        {userRole === 'admin' && (
          <button
            className="fo-header-icon-btn fo-hide-mobile"
            onClick={() => setUserRole('worker')}
            title="Switch to Worker mode"
            style={{ fontSize: '0.75rem', width: 'auto', padding: '0 8px', borderRadius: '6px', color: '#64748b' }}
          >
            Worker
          </button>
        )}

        <div className="fo-header-avatar">
          <img
            src={`https://ui-avatars.com/api/?name=${userRole === 'admin' ? 'Admin+User' : 'Worker'}&background=6366f1&color=fff&size=36&rounded=true&bold=true`}
            alt="User"
            width="36"
            height="36"
          />
        </div>
      </div>
    </header>
  );
}
