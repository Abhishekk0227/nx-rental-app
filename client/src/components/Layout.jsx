import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ 
  pendingAddVehicle, setPendingAddVehicle,
  dbStatus
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Create setCurrentTab for backward compatibility with Sidebar/Header
  const setCurrentTab = (tab) => {
    navigate(`/${tab}`);
  };

  // Map route to currentTab for backward compatibility in Header/Sidebar
  const pathTabMap = {
    '/dashboard': 'dashboard',
    '/available': 'available',
    '/vehicles': 'vehicles',
    '/bookings': 'bookings',
    '/hisab': 'hisab',
    '/admin/zones': 'admin/zones',
    '/admin/workers': 'admin/workers',
    '/admin/maintenance': 'admin/maintenance'
  };
  const activeTab = pathTabMap[location.pathname] || 'dashboard';

  const handleHeaderAddVehicle = () => {
    setPendingAddVehicle(true);
    navigate('/vehicles');
  };

  return (
    <div className="app-container">
      <Sidebar 
        currentTab={activeTab} 
        setCurrentTab={setCurrentTab} 
        userRole={currentUser?.role || 'worker'}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        <Header 
          currentTab={activeTab}
          userRole={currentUser?.role || 'worker'} 
          setUserRole={() => {}} // No longer manually setting role
          currentWorker={currentUser?.name || ''}
          setCurrentWorker={() => {}} 
          dbStatus={dbStatus}
          onMenuClick={() => setSidebarOpen(true)}
          onAddVehicle={handleHeaderAddVehicle}
        />

        <div className="page-scroll-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
