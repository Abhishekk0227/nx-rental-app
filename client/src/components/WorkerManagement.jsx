import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Edit2, UserCheck, Shield, MapPin, Plus, Lock, Mail } from 'lucide-react';

export default function WorkerManagement() {
  const [workers, setWorkers] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentWorkerId, setCurrentWorkerId] = useState(null);
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'worker',
    zoneId: '',
    status: 'Active'
  });

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [wRes, zRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/users`, { headers }),
        fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/zones`, { headers })
      ]);
      
      if (wRes.ok) {
        const wData = await wRes.json();
        setWorkers(wData);
      }
      if (zRes.ok) {
        const zData = await zRes.json();
        setZones(zData);
      }
    } catch (err) {
      console.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleOpenModal = (worker = null) => {
    if (worker) {
      setEditMode(true);
      setCurrentWorkerId(worker._id);
      setFormData({
        name: worker.name,
        username: worker.username,
        password: '', // blank on edit means don't change
        role: worker.role,
        zoneId: worker.zoneId ? worker.zoneId._id : '',
        status: worker.status
      });
    } else {
      setEditMode(false);
      setCurrentWorkerId(null);
      setFormData({ name: '', username: '', password: '', role: 'worker', zoneId: '', status: 'Active' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editMode 
      ? `${import.meta.env.VITE_API_BASE_URL || ''}/api/users/${currentWorkerId}`
      : `${import.meta.env.VITE_API_BASE_URL || ''}/api/users`;
    
    const method = editMode ? 'PUT' : 'POST';

    // If editing and password is empty, remove it
    const dataToSend = { ...formData };
    if (editMode && !dataToSend.password) {
      delete dataToSend.password;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      });
      
      if (res.ok) {
        fetchData();
        handleCloseModal();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save worker');
    }
  };

  return (
    <div className="fo-dashboard" style={{ padding: '24px' }}>
      <div className="fo-page-header">
        <div>
          <h1 className="fo-page-title">Worker Management</h1>
          <p className="fo-breadcrumb">
            <span>Admin</span> / <span className="fo-breadcrumb-active">Workers</span>
          </p>
        </div>
        <button className="fo-btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} strokeWidth={2.5} />
          <span className="fo-btn-label">Add Worker</span>
        </button>
      </div>
      
      {loading ? (
        <p>Loading workers...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {workers.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px' }}>
              <p style={{ color: '#94a3b8' }}>No workers found. Create one to assign them to a zone.</p>
            </div>
          ) : (
            workers.map(w => (
              <div key={w._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b' }}>{w.name}</h3>
                      <span className={`badge ${w.status === 'Active' ? 'badge-available' : 'badge-inactive'}`} style={{ marginTop: '4px' }}>
                        {w.status}
                      </span>
                    </div>
                  </div>
                  <button className="btn btn-secondary" onClick={() => handleOpenModal(w)} style={{ padding: '6px', minWidth: 0 }}>
                    <Edit2 size={16} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                    <Mail size={16} />
                    {w.username}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                    <MapPin size={16} />
                    {w.zoneId ? w.zoneId.name : <span style={{ color: '#f43f5e' }}>Unassigned</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                    <Shield size={16} />
                    <span style={{ textTransform: 'capitalize' }}>{w.role}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editMode ? 'Edit Worker' : 'Add New Worker'}</h2>
              <button className="fo-btn-outline" onClick={handleCloseModal} style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    name="name" 
                    className="form-control" 
                    placeholder="e.g. Ramesh Kumar" 
                    value={formData.name}
                    onChange={handleChange}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Email (Login ID)</label>
                  <input 
                    type="email" 
                    name="username" 
                    className="form-control" 
                    placeholder="e.g. worker1@gmail.com" 
                    value={formData.username}
                    onChange={handleChange}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Password {editMode && <span style={{ fontWeight: 'normal', color: '#94a3b8' }}>(Leave blank to keep current)</span>}</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      name="password" 
                      className="form-control" 
                      placeholder={editMode ? "••••••••" : "Set login password"} 
                      value={formData.password}
                      onChange={handleChange}
                      required={!editMode}
                      style={{ paddingLeft: '32px' }}
                    />
                    <Lock size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Assign to Zone</label>
                  <select 
                    name="zoneId" 
                    className="form-control" 
                    value={formData.zoneId}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>Select a Zone</option>
                    {zones.map(z => (
                      <option key={z._id} value={z._id}>{z.name} - {z.city}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label>Role</label>
                    <select name="role" className="form-control" value={formData.role} onChange={handleChange}>
                      <option value="worker">Worker</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Status</label>
                    <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Save Changes' : 'Create Worker'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
