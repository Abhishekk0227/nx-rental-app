import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardHome from './components/DashboardHome';
import VehicleManagement from './components/VehicleManagement';
import AvailableVehicles from './components/AvailableVehicles';
import BookingForm from './components/BookingForm';
import BookedVehicles from './components/BookedVehicles';
import DailyHisab from './components/DailyHisab';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import ZoneManagement from './components/ZoneManagement';
import WorkerManagement from './components/WorkerManagement';
import MaintenanceManagement from './components/MaintenanceManagement';

export default function App() {
  const { token, currentUser, loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [backendActive, setBackendActive] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: false, mode: 'Checking...', host: '' });
  const [zones, setZones] = useState([]);
  
  const [pendingAddVehicle, setPendingAddVehicle] = useState(false);
  const [bookingVehicle, setBookingVehicle] = useState(null);
  const navigate = useNavigate();

  const fetchDbStatus = async () => {
    try {
      const res = await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/api/system/database-status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus({
          connected: data.connected,
          mode: data.mode === 'mongodb' ? 'MongoDB Cloud' : 'In-Memory Fallback',
          host: data.host || 'localhost',
          database: data.database
        });
      }
    } catch (err) {
      setDbStatus({ connected: false, mode: 'Offline', host: '' });
    }
  };

  useEffect(() => {
    fetchDbStatus();
    const interval = setInterval(fetchDbStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async (retryCount = 0) => {
    if (!token) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';

      const [vRes, bRes, zRes] = await Promise.all([
        fetch(`${apiBase}/api/vehicles`, { headers }),
        fetch(`${apiBase}/api/bookings`, { headers }),
        fetch(`${apiBase}/api/zones`,    { headers })
      ]);

      // Handle auth errors — token is bad, force logout
      if (vRes.status === 401 || bRes.status === 401) {
        console.warn('[App] Auth token rejected. Clearing session.');
        localStorage.clear();
        window.location.href = '/login';
        return;
      }

      if (vRes.ok) {
        const vData = await vRes.json();
        setVehicles(vData);
      }

      if (bRes.ok) {
        const bData = await bRes.json();
        setBookings(bData);
      }

      if (zRes.ok) {
        const zData = await zRes.json();
        setZones(zData);
      }

      setBackendActive(true);
    } catch (err) {
      console.warn('[App] Backend unreachable, retry', retryCount, err.message);
      setBackendActive(false);
      // Auto retry up to 3 times with increasing delay (3s, 6s, 12s)
      if (retryCount < 3) {
        setTimeout(() => fetchInitialData(retryCount + 1), 3000 * Math.pow(2, retryCount));
      }
    }
  };

  useEffect(() => {
    if (token) {
      fetchInitialData();
      // Refresh data every 30 seconds to keep it live and recover from DB outages
      const refreshInterval = setInterval(() => fetchInitialData(), 30000);
      return () => clearInterval(refreshInterval);
    }
  }, [token]);

  // Operational Actions (Simplified for brevity, ideally use a global context for these too)
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const handleAddVehicle = async (formData) => {
    if (!backendActive) return;
    try {
      const res = await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/api/vehicles', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      if (res.ok) fetchInitialData();
    } catch (err) { console.error(err); }
  };

  const handleUpdateVehicle = async (vehicleId, formData) => {
    if (!backendActive) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchInitialData();
      } else {
        const errorData = await res.json();
        alert(`Failed to update vehicle: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) { console.error(err); }
  };

  const handleToggleVehicleStatus = async (vehicleId, status, reason) => {
    if (!backendActive) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/vehicles/${vehicleId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchInitialData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!backendActive) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) fetchInitialData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!backendActive) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) fetchInitialData();
    } catch (err) { console.error(err); }
  };

  const handleConfirmBooking = async (bookingData) => {
    if (!backendActive) return;
    try {
      const res = await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/api/bookings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(bookingData)
      });
      if (res.ok) {
        fetchInitialData();
        setBookingVehicle(null);
        navigate('/bookings');
      }
    } catch (err) { console.error(err); }
  };

  const handlePickup = async (bookingId, pickupData) => {
    if (!backendActive) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/bookings/${bookingId}/pickup`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(pickupData)
      });
      if (res.ok) fetchInitialData();
    } catch (err) { console.error(err); }
  };

  const handleExtend = async (bookingId, extendData) => {
    if (!backendActive) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/bookings/${bookingId}/extend`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(extendData)
      });
      if (res.ok) fetchInitialData();
    } catch (err) { console.error(err); }
  };

  const handleReplaceVehicle = async (bookingId, replaceData) => {
    if (!backendActive) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/bookings/${bookingId}/replace`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(replaceData)
      });
      if (res.ok) fetchInitialData();
    } catch (err) { console.error(err); }
  };

  const handleDropOff = async (bookingId, dropOffData) => {
    if (!backendActive) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/bookings/${bookingId}/dropoff`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(dropOffData)
      });
      if (res.ok) fetchInitialData();
    } catch (err) { console.error(err); }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!backendActive) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      if (res.ok) fetchInitialData();
    } catch (err) { console.error(err); }
  };

  const handleAdminOverride = async (bookingId, overrideData) => {
    if (!backendActive) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/bookings/${bookingId}/override`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(overrideData)
      });
      if (res.ok) fetchInitialData();
    } catch (err) { console.error(err); }
  };

  const handleRecordDeposit = async (date, workerId, amount, remarks) => {
    if (!backendActive) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/accounting/settle`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ date, workerId, depositAmount: amount, remarks })
      });
      if (res.ok) fetchInitialData();
    } catch (err) { console.error(err); }
  };

  if (authLoading) return <div>Loading Application...</div>;

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/dashboard" replace />} />
      
      <Route path="/" element={<ProtectedRoute><Layout dbStatus={dbStatus} pendingAddVehicle={pendingAddVehicle} setPendingAddVehicle={setPendingAddVehicle} /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        <Route path="dashboard" element={
          <DashboardHome 
            vehicles={vehicles} bookings={bookings} 
            userRole={currentUser?.role || 'worker'} 
            zones={zones}
            setCurrentTab={(tab) => navigate(`/${tab}`)}
            onPickup={() => navigate('/bookings')}
            onDropOff={() => navigate('/bookings')}
          />
        } />
        
        <Route path="available" element={
          bookingVehicle ? (
            <BookingForm 
              vehicle={bookingVehicle} 
              onConfirmBooking={handleConfirmBooking}
              onCancel={() => setBookingVehicle(null)}
              currentWorker={currentUser?.name || ''}
            />
          ) : (
            <AvailableVehicles 
              vehicles={vehicles} bookings={bookings}
              zones={zones} userRole={currentUser?.role || 'worker'}
              onBookVehicle={(vehicle) => setBookingVehicle(vehicle)}
              onUpdateVehicle={handleUpdateVehicle}
              onToggleStatus={handleToggleVehicleStatus}
            />
          )
        } />
        
        <Route path="bookings" element={
          <BookedVehicles 
            bookings={bookings} vehicles={vehicles}
            zones={zones} userRole={currentUser?.role || 'worker'}
            currentWorker={currentUser?.name || ''}
            onPickup={handlePickup} onExtend={handleExtend}
            onReplace={handleReplaceVehicle} onDropOff={handleDropOff}
            onCancelBooking={handleCancelBooking} onAdminOverride={handleAdminOverride}
            onDeleteBooking={handleDeleteBooking}
          />
        } />
        
        <Route path="hisab" element={
          <DailyHisab 
            userRole={currentUser?.role || 'worker'}
            currentWorker={currentUser?.name || ''}
            vehicles={vehicles} bookings={bookings}
            zones={zones}
            onRecordDeposit={handleRecordDeposit}
          />
        } />

        <Route path="vehicles" element={
          <VehicleManagement 
            vehicles={vehicles} bookings={bookings}
            zones={zones} userRole={currentUser?.role || 'worker'}
            onAddVehicle={handleAddVehicle} onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle} onToggleStatus={handleToggleVehicleStatus}
            autoOpenAdd={pendingAddVehicle}
            onAutoOpenConsumed={() => setPendingAddVehicle(false)}
          />
        } />

        {/* Admin Only Routes */}

        <Route path="admin/zones" element={<ProtectedRoute adminOnly><ZoneManagement refreshGlobalData={fetchInitialData} /></ProtectedRoute>} />
        <Route path="admin/workers" element={<ProtectedRoute adminOnly><WorkerManagement /></ProtectedRoute>} />
        <Route path="admin/maintenance" element={<ProtectedRoute adminOnly><MaintenanceManagement userRole={currentUser?.role || 'worker'} currentWorker={currentUser?.name || ''} vehicles={vehicles} /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
