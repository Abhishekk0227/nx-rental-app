import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Edit2, MapPin, Building, Plus } from 'lucide-react';

export default function ZoneManagement({ refreshGlobalData }) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentZoneId, setCurrentZoneId] = useState(null);
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    branchName: '',
    city: '',
    state: '',
    address: '',
    status: 'Active'
  });

  const fetchZones = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/zones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setZones(data);
      }
    } catch (err) {
      console.error('Failed to fetch zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchZones();
  }, [token]);

  const handleOpenModal = (zone = null) => {
    if (zone) {
      setEditMode(true);
      setCurrentZoneId(zone._id);
      setFormData({
        name: zone.name,
        branchName: zone.branchName,
        city: zone.city,
        state: zone.state,
        address: zone.address || '',
        status: zone.status
      });
    } else {
      setEditMode(false);
      setCurrentZoneId(null);
      setFormData({ name: '', branchName: '', city: '', state: '', address: '', status: 'Active' });
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
      ? `${import.meta.env.VITE_API_BASE_URL || ''}/api/zones/${currentZoneId}`
      : `${import.meta.env.VITE_API_BASE_URL || ''}/api/zones`;
    
    const method = editMode ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        fetchZones();
        if (refreshGlobalData) refreshGlobalData();
        handleCloseModal();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save zone');
    }
  };

  return (
    <div className="fo-dashboard" style={{ padding: '24px' }}>
      <div className="fo-page-header">
        <div>
          <h1 className="fo-page-title">Zone Management</h1>
          <p className="fo-breadcrumb">
            <span>Admin</span> / <span className="fo-breadcrumb-active">Zones</span>
          </p>
        </div>
        <button className="fo-btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} strokeWidth={2.5} />
          <span className="fo-btn-label">Add New Zone</span>
        </button>
      </div>
      
      {loading ? (
        <p>Loading zones...</p>
      ) : (
        <div className="fo-table-wrap glass-panel" style={{ padding: 0 }}>
          <table className="fo-table custom-table">
            <thead>
              <tr>
                <th>Zone Name</th>
                <th>Branch Name</th>
                <th>City</th>
                <th>State</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {zones.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No zones found. Create one to get started.
                  </td>
                </tr>
              ) : (
                zones.map(z => (
                  <tr key={z._id}>
                    <td className="fo-cell-bold">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={16} color="#6366f1" />
                        {z.name}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building size={16} color="#94a3b8" />
                        {z.branchName}
                      </div>
                    </td>
                    <td>{z.city}</td>
                    <td>{z.state}</td>
                    <td>
                      <span className={`badge ${z.status === 'Active' ? 'badge-available' : 'badge-inactive'}`}>
                        {z.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" onClick={() => handleOpenModal(z)}>
                        <Edit2 size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editMode ? 'Edit Zone' : 'Add New Zone'}</h2>
              <button className="fo-btn-outline" onClick={handleCloseModal} style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Zone Name</label>
                  <input 
                    type="text" 
                    name="name" 
                    className="form-control" 
                    placeholder="e.g. North Zone" 
                    value={formData.name}
                    onChange={handleChange}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Branch Name</label>
                  <input 
                    type="text" 
                    name="branchName" 
                    className="form-control" 
                    placeholder="e.g. Main Branch" 
                    value={formData.branchName}
                    onChange={handleChange}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input 
                    type="text" 
                    name="city" 
                    className="form-control" 
                    placeholder="e.g. New Delhi" 
                    value={formData.city}
                    onChange={handleChange}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input 
                    type="text" 
                    name="state" 
                    className="form-control" 
                    placeholder="e.g. Madhya Pradesh" 
                    value={formData.state}
                    onChange={handleChange}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea 
                    name="address" 
                    className="form-control" 
                    placeholder="Full branch address" 
                    value={formData.address}
                    onChange={handleChange}
                    rows="3"
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    name="status" 
                    className="form-control" 
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Save Changes' : 'Create Zone'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
