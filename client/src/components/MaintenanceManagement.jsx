import React, { useState, useEffect } from 'react';
import {
  Wrench, AlertTriangle, CheckCircle, Clock, Plus, X, RefreshCw,
  Car, Bike, AlertCircle, ChevronRight, Search, Filter,
  Calendar, Gauge, DollarSign, User, ClipboardList, FileText,
  ArrowRight, Eye, StopCircle, CheckSquare, Activity, Zap, Pencil, Trash2
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtKm = (k) => k != null ? `${Number(k).toLocaleString()} KM` : '—';
const fmtRs = (n) => n != null ? `₹${Number(n).toLocaleString()}` : '—';

const PRIORITY_STYLE = {
  High:   { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', dot: '#ef4444' },
  Medium: { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', dot: '#f59e0b' },
  Low:    { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', dot: '#10b981' },
};

const REASON_STYLE = {
  km:     { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444',  icon: '🔴', label: 'KM Limit Reached'     },
  manual: { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b',  icon: '🟡', label: 'Manual Requirement'   },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, bg }) {
  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px',
      padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px',
      transition: 'all 0.2s', cursor: 'default'
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
    >
      <div style={{ width: 44, height: 44, borderRadius: '11px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {React.cloneElement(icon, { size: 20, color })}
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{value}</div>
      </div>
    </div>
  );
}

function VehicleAvatar({ v }) {
  const cat = v.category || v.type || 'Car';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden'
      }}>
        {v.images?.front
          ? <img src={v.images.front} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
          : cat === 'Car' ? <Car size={18} color="#6366f1" /> : <Bike size={18} color="#6366f1" />
        }
      </div>
      <div>
        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.88rem' }}>{v.name}</div>
        <code style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>{v.regNumber}</code>
      </div>
    </div>
  );
}

function KmBar({ current, next }) {
  const pct = next > 0 ? Math.min(100, Math.round((current / next) * 100)) : 0;
  const isDue = current >= next;
  const isSoon = !isDue && (next - current) <= 500;
  const barColor = isDue ? '#ef4444' : isSoon ? '#f59e0b' : '#10b981';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: 4 }}>
        <span>{fmtKm(current)}</span>
        <span>{fmtKm(next)}</span>
      </div>
      <div style={{ height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ marginTop: 4, fontSize: '0.7rem', color: barColor, fontWeight: 600 }}>
        {isDue ? '🔴 Service Overdue' : isSoon ? `🟠 ${fmtKm(next - current)} remaining` : `✅ ${fmtKm(next - current)} remaining`}
      </div>
    </div>
  );
}

// ── Modal Wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, maxWidth = 560 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth,
        boxShadow: '0 24px 48px rgba(0,0,0,0.18)', animation: 'slideUp 0.2s ease'
      }}>
        <div style={{
          padding: '20px 24px 18px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8', borderRadius: 6, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, required, children, half }) {
  return (
    <div style={{ gridColumn: half ? 'span 1' : 'span 2', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputSt = {
  width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: '0.875rem', color: '#1e293b', background: '#fff', outline: 'none',
  transition: 'border 0.15s'
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function MaintenanceManagement({ userRole, currentWorker, vehicles = [] }) {
  const [activeTab, setActiveTab] = useState('needed');
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [serviceNeeded, setServiceNeeded]     = useState([]);
  const [underMaintenance, setUnderMaintenance] = useState([]);
  const [serviceHistory, setServiceHistory]   = useState([]);

  // Modals
  const [showAddModal,      setShowAddModal]      = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showStatusModal,   setShowStatusModal]   = useState(false);
  const [showDetailModal,   setShowDetailModal]   = useState(false);
  const [selectedVehicle,   setSelectedVehicle]   = useState(null);

  // Forms
  const [addForm,      setAddForm]      = useState({ vehicleId: '', issue: '', priority: 'Medium', notes: '' });
  const [completeForm, setCompleteForm] = useState({ serviceDate: new Date().toISOString().slice(0, 10), serviceKm: '', workDone: '', vendor: '', cost: '', notes: '' });
  const [statusForm,   setStatusForm]   = useState({ statusNotes: '' });
  const [histSearch,   setHistSearch]   = useState('');

  // History Edit & Delete state
  const [showEditHistoryModal, setShowEditHistoryModal] = useState(false);
  const [showDeleteHistoryModal, setShowDeleteHistoryModal] = useState(false);
  const [editHistoryForm, setEditHistoryForm] = useState({ vehicleId: '', recordId: '', workDone: '', vendor: '', cost: 0, serviceKm: 0, notes: '', serviceDate: '' });
  
  const [editActiveForm, setEditActiveForm] = useState(null);

  const handleEditActiveSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      const res = await fetch(`${API_BASE}/maintenance/${editActiveForm.vehicleId}/${editActiveForm.recordId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ issue: editActiveForm.issue, notes: editActiveForm.notes, priority: editActiveForm.priority })
      });
      if (res.ok) {
        setEditActiveForm(null);
        fetchAll();
      } else {
        alert('Failed to update maintenance record');
      }
    } catch (err) {
      alert('Error updating record');
    }
  };
  const [deleteHistoryItem, setDeleteHistoryItem] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const mRes = await fetch(`${API_BASE}/maintenance`, { headers });
      if (mRes.ok) {
        const d = await mRes.json();
        setServiceNeeded(d.serviceNeeded    || []);
        setUnderMaintenance(d.underMaintenance || []);
        setServiceHistory(d.serviceHistory  || []);
      }
    } catch (err) {
      console.error('Maintenance fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  // Edit / Delete history handlers
  const openEditHistory = (h) => {
    setEditHistoryForm({
      vehicleId: h.vehicleId,
      recordId: h.record?._id || h.record?.id,
      workDone: h.record?.workDone || '',
      vendor: h.record?.vendor || '',
      cost: h.record?.cost || 0,
      serviceKm: h.record?.serviceKm || h.meterReading || 0,
      notes: h.record?.notes || '',
      serviceDate: h.record?.serviceDate ? new Date(h.record.serviceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    });
    setShowEditHistoryModal(true);
  };

  const handleEditHistorySubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      const res = await fetch(`${API_BASE}/maintenance/${editHistoryForm.vehicleId}/${editHistoryForm.recordId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editHistoryForm)
      });
      if (res.ok) {
        setShowEditHistoryModal(false);
        fetchAll();
      } else {
        alert('Failed to update maintenance record');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating record');
    }
  };

  const handleDeleteHistorySubmit = async () => {
    if (!deleteHistoryItem) return;
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const recId = deleteHistoryItem.record?._id || deleteHistoryItem.record?.id;
      const res = await fetch(`${API_BASE}/maintenance/${deleteHistoryItem.vehicleId}/${recId}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setShowDeleteHistoryModal(false);
        setDeleteHistoryItem(null);
        fetchAll();
      } else {
        alert('Failed to delete maintenance record');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting record');
    }
  };

  useEffect(() => { fetchAll(); }, [refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const doFetch = async (url, opts = {}) => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers };
    const res = await fetch(url, { ...opts, headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!addForm.vehicleId) return alert('Please select a vehicle.');
    try {
      await doFetch(`${API_BASE}/maintenance/${addForm.vehicleId}`, {
        method: 'POST',
        body: JSON.stringify({ ...addForm, workerId: currentWorker })
      });
      setShowAddModal(false);
      setAddForm({ vehicleId: '', issue: '', priority: 'Medium', notes: '' });
      refresh();
    } catch { alert('Failed to add maintenance requirement. Please try again.'); }
  };

  const handleStopVehicle = async (vehicle, recordId) => {
    if (!window.confirm(`Stop "${vehicle.name}" for maintenance?\n\nThis will make it unavailable for bookings until serviced.`)) return;
    try {
      await doFetch(`${API_BASE}/maintenance/${vehicle.vehicleId}/${recordId || 'new'}/stop`, {
        method: 'PATCH',
        body: JSON.stringify({ workerId: currentWorker })
      });
      refresh();
    } catch { alert('Failed to stop vehicle. Please try again.'); }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedVehicle?.activeRecord?._id) return;
    try {
      await doFetch(`${API_BASE}/maintenance/${selectedVehicle.vehicleId}/${selectedVehicle.activeRecord._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ statusNotes: statusForm.statusNotes })
      });
      setShowStatusModal(false);
      setStatusForm({ statusNotes: '' });
      refresh();
    } catch { alert('Failed to update status.'); }
  };

  const handleCompleteService = async (e) => {
    e.preventDefault();
    if (!selectedVehicle?.activeRecord?._id) return;
    try {
      await doFetch(`${API_BASE}/maintenance/${selectedVehicle.vehicleId}/${selectedVehicle.activeRecord._id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ ...completeForm, workerId: currentWorker })
      });
      setShowCompleteModal(false);
      refresh();
    } catch { alert('Failed to complete service.'); }
  };

  const openCompleteModal = (v) => {
    setSelectedVehicle(v);
    setCompleteForm({
      serviceDate: new Date().toISOString().slice(0, 10),
      serviceKm: v.meterReading || '',
      workDone: v.activeRecord?.issue || '',
      vendor: '', cost: '', notes: ''
    });
    setShowCompleteModal(true);
  };

  const openStatusModal = (v) => {
    setSelectedVehicle(v);
    setStatusForm({ statusNotes: '' });
    setShowStatusModal(true);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredHistory = serviceHistory.filter(h => {
    const q = histSearch.toLowerCase();
    return !q || String(h.name || '').toLowerCase().includes(q) || String(h.regNumber || '').toLowerCase().includes(q) || String(h.record?.workDone || '').toLowerCase().includes(q);
  });

  const totalServiceCost = serviceHistory.reduce((s, h) => s + (h.record?.cost || 0), 0);

  // ── Tab Button ─────────────────────────────────────────────────────────────
  const TabBtn = ({ id, label, icon, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600,
        fontSize: '0.85rem', transition: 'all 0.18s',
        background: activeTab === id ? '#1e293b' : 'transparent',
        color: activeTab === id ? '#fff' : '#64748b'
      }}
    >
      {React.cloneElement(icon, { size: 16 })}
      {label}
      {count != null && (
        <span style={{
          background: activeTab === id ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
          color: activeTab === id ? '#fff' : '#374151',
          fontSize: '0.7rem', fontWeight: 700, padding: '1px 7px', borderRadius: 99
        }}>{count}</span>
      )}
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Maintenance & Service</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Manage fleet maintenance, service records & vehicle health</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={refresh}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: '0.85rem', color: '#374151', fontWeight: 600 }}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Add Maintenance
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard icon={<AlertTriangle />} label="Service Needed"     value={serviceNeeded.length}     color="#ef4444" bg="rgba(239,68,68,0.1)" />
        <StatCard icon={<Wrench />}        label="Under Maintenance"  value={underMaintenance.length}  color="#f59e0b" bg="rgba(245,158,11,0.1)" />
        <StatCard icon={<CheckCircle />}   label="Services Completed" value={serviceHistory.length}    color="#10b981" bg="rgba(16,185,129,0.1)" />
        <StatCard icon={<DollarSign />}    label="Total Service Cost" value={fmtRs(totalServiceCost)} color="#6366f1" bg="rgba(99,102,241,0.1)" />
      </div>

      {/* ── Tab Nav ── */}
      <div className="horizontal-slider" style={{ display: 'flex', gap: 4, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: 4, marginBottom: 20, maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <TabBtn id="needed" label="Service Needed"    icon={<AlertTriangle />} count={serviceNeeded.length} />
        <TabBtn id="under"  label="Under Maintenance" icon={<Wrench />}        count={underMaintenance.length} />
        <TabBtn id="history" label="Service History"  icon={<ClipboardList />} />
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
          Loading maintenance data...
        </div>
      ) : (
        <>
          {/* ────── SERVICE NEEDED ────── */}
          {activeTab === 'needed' && (
            <div>
              {serviceNeeded.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb' }}>
                  <CheckCircle size={40} color="#10b981" style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                  <h3 style={{ color: '#1e293b', marginBottom: 6 }}>All Clear!</h3>
                  <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No vehicles currently require maintenance service.</p>
                </div>
              ) : (
                <div className="responsive-table-slider" style={{ overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: '800px' }}>
                  {serviceNeeded.map(v => {
                    const reason = v.pendingRecord ? REASON_STYLE.manual : REASON_STYLE.km;
                    const priority = v.pendingRecord?.priority || 'Medium';
                    const ps = PRIORITY_STYLE[priority] || PRIORITY_STYLE.Medium;
                    return (
                      <div key={v.vehicleId} style={{
                        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '18px 20px',
                        display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 1fr', gap: 16, alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {/* Vehicle Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <VehicleAvatar v={v} />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: reason.bg, color: reason.color }}>
                              {reason.icon} {reason.label}
                            </span>
                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: ps.bg, color: ps.color }}>
                              {priority}
                            </span>
                          </div>
                        </div>
                        {/* Issue */}
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issue</div>
                          <div style={{ fontSize: '0.84rem', color: '#374151', fontWeight: 500 }}>
                            {v.pendingRecord?.issue || 'Scheduled Maintenance'}
                          </div>
                        </div>
                        {/* KM Bar */}
                        <div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>KM Status</div>
                          <KmBar current={v.meterReading} next={v.nextServiceKm} />
                        </div>
                        {/* Action */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                          <button
                            onClick={() => handleStopVehicle(v, v.pendingRecord?._id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                              background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca',
                              borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                              whiteSpace: 'nowrap', transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                          >
                            <StopCircle size={15} /> Stop Vehicle
                          </button>
                          
                          {v.pendingRecord && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => setEditActiveForm({ vehicleId: v.vehicleId, recordId: v.pendingRecord._id, issue: v.pendingRecord.issue, priority: v.pendingRecord.priority || 'Medium', notes: v.pendingRecord.notes || '' })}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: '#f8fafc', color: '#3b82f6', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}
                                title="Edit Request"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteHistoryItem({ vehicleId: v.vehicleId, record: v.pendingRecord })}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer' }}
                                title="Delete Request"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────── UNDER MAINTENANCE ────── */}
          {activeTab === 'under' && (
            <div>
              {underMaintenance.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb' }}>
                  <Activity size={40} color="#94a3b8" style={{ display: 'block', margin: '0 auto 12px' }} />
                  <h3 style={{ color: '#1e293b', marginBottom: 6 }}>No Vehicles Under Maintenance</h3>
                  <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Stop a vehicle from "Service Needed" to begin maintenance.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: '900px' }}>
                  {underMaintenance.map(v => (
                    <div key={v.vehicleId} style={{
                      background: '#fff', border: '1px solid #fde68a', borderRadius: 14, padding: '18px 22px',
                      display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr', gap: 16, alignItems: 'center',
                      transition: 'all 0.2s'
                    }}>
                      {/* Vehicle */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <VehicleAvatar v={v} />
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', color: '#d97706', fontSize: '0.72rem', fontWeight: 700, width: 'fit-content' }}>
                          <Wrench size={11} /> Under Maintenance
                        </span>
                      </div>
                      {/* Issue */}
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issue / Work Required</div>
                        <div style={{ fontSize: '0.85rem', color: '#374151', fontWeight: 500 }}>{v.activeRecord?.issue || 'Routine Maintenance'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                          Started: {fmtDate(v.activeRecord?.createdAt)}
                        </div>
                        {v.activeRecord?.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 6, background: '#f8fafc', borderRadius: 6, padding: '5px 8px', borderLeft: '2px solid #94a3b8', whiteSpace: 'pre-wrap' }}>
                            {v.activeRecord.notes.split('\n').slice(-1)[0]}
                          </div>
                        )}
                      </div>
                      {/* KM Info */}
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Odometer</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Gauge size={15} color="#6366f1" />
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{fmtKm(v.meterReading)}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 3 }}>Last Svc: {fmtKm(v.lastServiceKm)}</div>
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button
                          onClick={() => openStatusModal(v)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', background: '#f8fafc', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        >
                          <FileText size={14} /> Add Note
                        </button>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => setEditActiveForm({ vehicleId: v.vehicleId, recordId: v.activeRecord._id, issue: v.activeRecord.issue, priority: v.activeRecord.priority || 'Medium', notes: v.activeRecord.notes || '' })}
                            style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', background: '#f8fafc', color: '#3b82f6', border: '1px solid #e2e8f0', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                            title="Edit Record"
                          >
                            <Pencil size={14} /> Edit
                          </button>
                          <button
                            onClick={() => setDeleteHistoryItem({ vehicleId: v.vehicleId, record: v.activeRecord })}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 9, cursor: 'pointer' }}
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() => openCompleteModal(v)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                          onMouseLeave={e => e.currentTarget.style.background = '#1e293b'}
                        >
                          <CheckSquare size={14} /> Complete Service
                        </button>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────── SERVICE HISTORY ────── */}
          {activeTab === 'history' && (
            <div>
              {/* Search */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search by vehicle, work done..."
                    value={histSearch}
                    onChange={e => setHistSearch(e.target.value)}
                    style={{ ...inputSt, paddingLeft: 34 }}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb' }}>
                  <ClipboardList size={40} color="#94a3b8" style={{ display: 'block', margin: '0 auto 12px' }} />
                  <h3 style={{ color: '#1e293b', marginBottom: 6 }}>{histSearch ? 'No Records Found' : 'No Service History'}</h3>
                  <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{histSearch ? 'Try a different search term.' : 'Completed services will appear here.'}</p>
                </div>
              ) : (
                <div className="responsive-table-slider" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                        {['Date', 'Vehicle', 'Service KM', 'Work Done', 'Vendor', 'Cost', 'Notes', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((h, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Calendar size={13} color="#94a3b8" />
                              <span style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 500 }}>{fmtDate(h.record.completedAt || h.record.serviceDate)}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}><VehicleAvatar v={h} /></td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Gauge size={13} color="#6366f1" />
                              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#374151' }}>{fmtKm(h.record.serviceKm)}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', maxWidth: 220 }}>
                            <span style={{ fontSize: '0.83rem', color: '#374151' }}>{h.record.workDone || '—'}</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '0.83rem', color: '#374151' }}>{h.record.vendor || '—'}</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontWeight: 700, color: '#10b981', fontSize: '0.9rem' }}>{fmtRs(h.record.cost)}</span>
                          </td>
                          <td style={{ padding: '14px 16px', maxWidth: 180 }}>
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{h.record.notes || '—'}</span>
                          </td>
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                                onClick={() => openEditHistory(h)}
                                title="Edit Record"
                              >
                                <Pencil size={12} /> Edit
                              </button>
                              <button
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                                onClick={() => { setDeleteHistoryItem(h); setShowDeleteHistoryModal(true); }}
                                title="Delete Record"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', borderTop: '2px solid #e5e7eb' }}>
                        <td colSpan={5} style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                          Total ({filteredHistory.length} records)
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>
                          {fmtRs(filteredHistory.reduce((s, h) => s + (h.record?.cost || 0), 0))}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ════════════════ MODALS ════════════════ */}

      {/* ── Add Maintenance Modal ── */}
      {showAddModal && (
        <Modal title="Add Maintenance Requirement" subtitle="Create a service request for any vehicle" onClose={() => setShowAddModal(false)} maxWidth={500}>
          <form onSubmit={handleManualAdd}>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Vehicle" required>
                <select required value={addForm.vehicleId} onChange={e => setAddForm({ ...addForm, vehicleId: e.target.value })}
                  style={inputSt}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                >
                  <option value="">— Select Vehicle —</option>
                  {vehicles.filter(v => v.status !== 'Maintenance').map(v => (
                    <option key={v.vehicleId} value={v.vehicleId}>{v.name} ({v.regNumber})</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Priority" half>
                <select value={addForm.priority} onChange={e => setAddForm({ ...addForm, priority: e.target.value })}
                  style={inputSt}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                >
                  <option value="Low">🟢 Low</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="High">🔴 High</option>
                </select>
              </FormField>

              <FormField label="Issue / Description" required>
                <textarea required rows={3} value={addForm.issue} onChange={e => setAddForm({ ...addForm, issue: e.target.value })}
                  placeholder="e.g., Engine oil change, Brake inspection..."
                  style={{ ...inputSt, resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>

              <FormField label="Notes">
                <textarea rows={3} value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Additional details (optional)"
                  style={{ ...inputSt, resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowAddModal(false)}
                style={{ padding: '9px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >Cancel</button>
              <button type="submit"
                style={{ padding: '9px 20px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 7 }}
              ><Plus size={15} /> Add Requirement</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Active/Pending Modal ── */}
      {editActiveForm && (
        <Modal title="Edit Maintenance Request" subtitle="Update issue or priority" onClose={() => setEditActiveForm(null)} maxWidth={500}>
          <form onSubmit={handleEditActiveSubmit}>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
              <FormField label="Priority" required>
                <select value={editActiveForm.priority} onChange={e => setEditActiveForm({ ...editActiveForm, priority: e.target.value })}
                  style={inputSt}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                >
                  <option value="Low">🟢 Low</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="High">🔴 High</option>
                </select>
              </FormField>

              <FormField label="Issue / Description" required>
                <textarea required rows={3} value={editActiveForm.issue} onChange={e => setEditActiveForm({ ...editActiveForm, issue: e.target.value })}
                  style={{ ...inputSt, resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>

              <FormField label="Notes">
                <textarea rows={3} value={editActiveForm.notes} onChange={e => setEditActiveForm({ ...editActiveForm, notes: e.target.value })}
                  style={{ ...inputSt, resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setEditActiveForm(null)}
                style={{ padding: '9px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >Cancel</button>
              <button type="submit"
                style={{ padding: '9px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 7 }}
              ><CheckCircle size={15} /> Save Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Complete Service Modal ── */}
      {showCompleteModal && selectedVehicle && (
        <Modal
          title={`Complete Service`}
          subtitle={`${selectedVehicle.name} (${selectedVehicle.regNumber})`}
          onClose={() => setShowCompleteModal(false)}
          maxWidth={580}
        >
          <form onSubmit={handleCompleteService}>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Vehicle info bar */}
              <div style={{ gridColumn: 'span 2', background: '#f8fafc', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 20 }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  <strong style={{ color: '#374151' }}>Current KM:</strong> {fmtKm(selectedVehicle.meterReading)}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  <strong style={{ color: '#374151' }}>Issue:</strong> {selectedVehicle.activeRecord?.issue || '—'}
                </span>
              </div>

              <FormField label="Service Date" required half>
                <input type="date" required value={completeForm.serviceDate}
                  onChange={e => setCompleteForm({ ...completeForm, serviceDate: e.target.value })}
                  style={inputSt} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>

              <FormField label="Service KM (Odometer)" required half>
                <input type="number" required placeholder="e.g. 25150" value={completeForm.serviceKm}
                  onChange={e => setCompleteForm({ ...completeForm, serviceKm: e.target.value })}
                  style={inputSt} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>

              <FormField label="Work Done / Services Completed" required>
                <textarea required rows={3} placeholder="e.g. Engine oil change (Mobil 5W-30), Front brake pads replaced, Air filter cleaned..."
                  value={completeForm.workDone} onChange={e => setCompleteForm({ ...completeForm, workDone: e.target.value })}
                  style={{ ...inputSt, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>

              <FormField label="Additional Notes">
                <textarea rows={3} placeholder="Any extra information..."
                  value={completeForm.notes} onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })}
                  style={{ ...inputSt, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>

              <FormField label="Service Provider / Vendor" half>
                <input type="text" placeholder="e.g. Sharma Motors, ABC Garage" value={completeForm.vendor}
                  onChange={e => setCompleteForm({ ...completeForm, vendor: e.target.value })}
                  style={inputSt} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>

              <FormField label="Total Service Cost (₹)" required half>
                <input type="number" required min="0" placeholder="e.g. 1850" value={completeForm.cost}
                  onChange={e => setCompleteForm({ ...completeForm, cost: e.target.value })}
                  style={inputSt} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>

              {/* Next service preview */}
              {completeForm.serviceKm && (
                <div style={{ gridColumn: 'span 2', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 9, padding: '10px 14px', display: 'flex', gap: 20, alignItems: 'center' }}>
                  <Zap size={16} color="#10b981" />
                  <span style={{ fontSize: '0.82rem', color: '#374151' }}>
                    Next service will be auto-set to <strong style={{ color: '#10b981' }}>{fmtKm(Number(completeForm.serviceKm) + (selectedVehicle.maintenanceIntervalKm || 5000))}</strong>
                    <span style={{ color: '#64748b' }}> (Interval: {fmtKm(selectedVehicle.maintenanceIntervalKm || 5000)})</span>
                  </span>
                </div>
              )}
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowCompleteModal(false)}
                style={{ padding: '9px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >Cancel</button>
              <button type="submit"
                style={{ padding: '9px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 7 }}
              ><CheckCircle size={15} /> Save & Mark Available</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Update Status Modal ── */}
      {showStatusModal && selectedVehicle && (
        <Modal
          title="Add Maintenance Note"
          subtitle={`${selectedVehicle.name} — progress update`}
          onClose={() => setShowStatusModal(false)}
          maxWidth={440}
        >
          <form onSubmit={handleUpdateStatus}>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Status Update / Progress Note <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  required rows={4}
                  placeholder="e.g., Waiting for parts, Engine oil changed, Inspection done..."
                  value={statusForm.statusNotes}
                  onChange={e => setStatusForm({ ...statusForm, statusNotes: e.target.value })}
                  style={{ ...inputSt, resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
              {selectedVehicle.activeRecord?.notes && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', fontSize: '0.78rem', color: '#64748b', whiteSpace: 'pre-wrap' }}>
                  <strong style={{ color: '#374151', display: 'block', marginBottom: 4 }}>Previous Notes:</strong>
                  {selectedVehicle.activeRecord.notes}
                </div>
              )}
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowStatusModal(false)}
                style={{ padding: '9px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >Cancel</button>
              <button type="submit"
                style={{ padding: '9px 20px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 7 }}
              ><FileText size={15} /> Save Note</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Service History Record Modal ── */}
      {showEditHistoryModal && (
        <Modal title="Edit Maintenance Record" subtitle="Update service details" onClose={() => setShowEditHistoryModal(false)} maxWidth={520}>
          <form onSubmit={handleEditHistorySubmit}>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Service Date" required half>
                <input type="date" required value={editHistoryForm.serviceDate}
                  onChange={e => setEditHistoryForm({ ...editHistoryForm, serviceDate: e.target.value })}
                  style={inputSt} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>

              <FormField label="Service Odometer (KM)" required half>
                <input type="number" required min="0" value={editHistoryForm.serviceKm}
                  onChange={e => setEditHistoryForm({ ...editHistoryForm, serviceKm: e.target.value })}
                  style={inputSt} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>

              <FormField label="Work Done / Details" required>
                <textarea required rows={3} value={editHistoryForm.workDone}
                  onChange={e => setEditHistoryForm({ ...editHistoryForm, workDone: e.target.value })}
                  style={{ ...inputSt, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>

              <FormField label="Vendor / Garage" half>
                <input type="text" value={editHistoryForm.vendor}
                  onChange={e => setEditHistoryForm({ ...editHistoryForm, vendor: e.target.value })}
                  style={inputSt} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>

              <FormField label="Service Cost (₹)" required half>
                <input type="number" required min="0" value={editHistoryForm.cost}
                  onChange={e => setEditHistoryForm({ ...editHistoryForm, cost: e.target.value })}
                  style={inputSt} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>

              <FormField label="Notes">
                <textarea rows={2} value={editHistoryForm.notes}
                  onChange={e => setEditHistoryForm({ ...editHistoryForm, notes: e.target.value })}
                  style={{ ...inputSt, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </FormField>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setShowEditHistoryModal(false)}
                style={{ padding: '9px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >Cancel</button>
              <button type="submit"
                style={{ padding: '9px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 7 }}
              ><Pencil size={14} /> Update Record</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteHistoryModal && deleteHistoryItem && (
        <Modal title="Delete Maintenance Record" subtitle="Are you sure you want to delete this record?" onClose={() => setShowDeleteHistoryModal(false)} maxWidth={440}>
          <div style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: '0.88rem', color: '#374151', margin: 0 }}>
              This will permanently delete the maintenance log for <strong>{deleteHistoryItem.name || deleteHistoryItem.vehicleId}</strong> ({deleteHistoryItem.record?.workDone || 'Service'}).
            </p>
          </div>
          <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={() => setShowDeleteHistoryModal(false)}
              style={{ padding: '9px 16px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >Cancel</button>
            <button type="button" onClick={handleDeleteHistorySubmit}
              style={{ padding: '9px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 7 }}
            ><Trash2 size={14} /> Yes, Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
