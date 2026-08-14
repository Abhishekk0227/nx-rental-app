import React, { useMemo } from 'react';
import { Car, Users, DollarSign, Calendar, Clock, Bike, Truck, Zap, Banknote, Monitor, CreditCard, Wallet, Phone, MapPin, User, Eye } from 'lucide-react';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtUSD = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

const isToday = (dateVal) => {
  if (!dateVal) return false;
  try {
    const d = new Date(dateVal);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  } catch { return false; }
};

// Stat Card Component
function StatCard({ icon, iconBg, label, value, change, changeType, changeSuffix }) {
  return (
    <div className="fo-stat-card">
      <div className="fo-stat-content">
        <p className="fo-stat-label">{label}</p>
        <h3 className="fo-stat-value">{value}</h3>
        {change && (
          <span className={`fo-stat-change ${changeType === 'up' ? 'positive' : changeType === 'down' ? 'negative' : ''}`}>
            {changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : ''} {change} {changeSuffix || ''}
          </span>
        )}
      </div>
      <div className="fo-stat-icon" style={{ background: iconBg || '#f0f0ff' }}>
        {icon}
      </div>
    </div>
  );
}

// Revenue Chart (Simple SVG)
function RevenueChart() {
  const points = [
    { x: 40, y: 180 }, { x: 120, y: 150 }, { x: 200, y: 160 },
    { x: 280, y: 140 }, { x: 360, y: 130 }, { x: 440, y: 110 },
    { x: 520, y: 80 }, { x: 600, y: 60 },
  ];
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L600,200 L40,200 Z`;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const yLabels = ['$50k', '$40k', '$30k', '$20k', '$10k'];

  return (
    <div className="fo-chart-card">
      <div className="fo-chart-header">
        <h3 className="fo-section-title">Revenue Trends</h3>
        <select className="fo-chart-select">
          <option>Last 30 Days</option>
          <option>Last 7 Days</option>
          <option>Last 90 Days</option>
        </select>
      </div>
      <svg viewBox="0 0 640 220" className="fo-chart-svg">
        {/* Grid lines */}
        {[40, 80, 120, 160, 200].map((y, i) => (
          <g key={i}>
            <line x1="40" y1={y} x2="620" y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4"/>
            <text x="5" y={y + 4} fontSize="10" fill="#94a3b8">{yLabels[i]}</text>
          </g>
        ))}
        {/* Area gradient */}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01"/>
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#areaGrad)"/>
        <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="#6366f1" strokeWidth="2"/>
        ))}
        {/* X-axis labels */}
        {days.map((d, i) => (
          <text key={d} x={40 + i * 80 + 40} y="215" fontSize="11" fill="#94a3b8" textAnchor="middle">{d}</text>
        ))}
      </svg>
    </div>
  );
}

// Category Utilization
function CategoryUtilization({ vehicles }) {
  const catData = useMemo(() => {
    const cats = {};
    vehicles.forEach(v => {
      const cat = v.category || v.type || 'Other';
      if (!cats[cat]) cats[cat] = { total: 0, active: 0 };
      cats[cat].total++;
      if (v.status === 'Ongoing' || v.status === 'Reserved' || v.status === 'Booked') cats[cat].active++;
    });
    const colors = { Scooty: '#6366f1', Car: '#3b82f6', Bike: '#10b981', EV: '#f59e0b', Other: '#94a3b8' };
    return Object.entries(cats).map(([name, d]) => ({
      name, total: d.total, active: d.active,
      percent: d.total > 0 ? Math.round((d.active / d.total) * 100) : 0,
      color: colors[name] || '#6366f1'
    }));
  }, [vehicles]);

  return (
    <div className="fo-util-card">
      <h3 className="fo-section-title">Category Utilization</h3>
      <div className="fo-util-list">
        {catData.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>No vehicle categories found</p>
        ) : catData.map(cat => (
          <div key={cat.name} className="fo-util-item">
            <div className="fo-util-header">
              <span className="fo-util-name">{cat.name}</span>
              <span className="fo-util-percent" style={{ color: cat.color }}>{cat.percent}%</span>
            </div>
            <div className="fo-util-bar-track">
              <div className="fo-util-bar-fill" style={{ width: `${cat.percent}%`, background: cat.color }}/>
            </div>
            <span className="fo-util-sub">{cat.active}/{cat.total} active</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const getCardFlow = (b) => {
  let cashIn = 0, onlineIn = 0, vikasIn = 0;
  let cashOut = 0, onlineOut = 0, vikasOut = 0;

  if (b.depositDetails) {
    if (b.depositDetails.mode === 'Cash') cashIn += Number(b.depositDetails.cashAmount || b.securityDeposit || 0);
    else if (['Online', 'UPI', 'Card'].includes(b.depositDetails.mode)) onlineIn += Number(b.depositDetails.onlineAmount || b.securityDeposit || 0);
    else if (b.depositDetails.mode === 'Vikas') vikasIn += Number(b.depositDetails.cashAmount || b.depositDetails.onlineAmount || b.securityDeposit || 0);
    else if (b.depositDetails.mode === 'Mixed') {
      cashIn += Number(b.depositDetails.cashAmount || 0);
      onlineIn += Number(b.depositDetails.onlineAmount || 0);
    }
  } else {
    cashIn += Number(b.securityDeposit || 0);
  }

  if (b.paymentCollection && b.paymentCollection.length > 0) {
    b.paymentCollection.forEach(p => {
      if (p.mode === 'Cash') cashIn += p.amount;
      else if (['UPI', 'Card', 'Online'].includes(p.mode)) onlineIn += p.amount;
      else if (p.mode === 'Vikas') vikasIn += p.amount;
      else if (p.mode === 'Mixed') {
        if (p.reference && p.reference.includes('Cash:')) {
          const cashPart = p.reference.match(/Cash:\s*(\d+)/);
          const onlinePart = p.reference.match(/Online:\s*(\d+)/);
          if (cashPart) cashIn += Number(cashPart[1]);
          if (onlinePart) onlineIn += Number(onlinePart[1]);
        } else {
          cashIn += p.amount / 2;
          onlineIn += p.amount / 2;
        }
      }
    });
  } else if (b.advancePaid > 0) {
    if (b.paymentMethod === 'Cash') cashIn += b.advancePaid;
    else onlineIn += b.advancePaid;
  }

  let refundAmt = 0;
  let refundMethod = 'Cash';

  if (b.refundDetails && Number(b.refundDetails.amount) > 0) {
    refundAmt = Number(b.refundDetails.amount || 0);
    refundMethod = b.refundDetails.method || 'Cash';
  } else if (b.settlement) {
    refundAmt = Number(b.settlement.refundAmount || b.settlement.depositRefunded || b.settlement.depositRefund || 0);
    refundMethod = b.settlement.depositRefundMode || b.settlement.refundMode || b.paymentMethod || 'Cash';
  }

  if (refundAmt === 0 && b.revisions) {
    b.revisions.forEach(rev => {
      if (rev.refundDetails && Number(rev.refundDetails.amount) > 0) {
        refundAmt += Number(rev.refundDetails.amount);
        if (rev.refundDetails.method) refundMethod = rev.refundDetails.method;
      }
    });
  }

  if (refundAmt > 0) {
    if (['Cash', 'Cash Refund'].includes(refundMethod)) cashOut += refundAmt;
    else if (['Vikas', 'Vikas Refund'].includes(refundMethod)) vikasOut += refundAmt;
    else if (['Mixed', 'Mixed Refund'].includes(refundMethod)) {
      const cashP = Number(b.refundDetails?.cashAmount || 0);
      const onlineP = Number(b.refundDetails?.onlineAmount || 0);
      if (cashP > 0 || onlineP > 0) {
        cashOut += cashP;
        onlineOut += onlineP;
      } else {
        cashOut += Math.round(refundAmt / 2);
        onlineOut += refundAmt - Math.round(refundAmt / 2);
      }
    } else onlineOut += refundAmt;
  }

  const r2 = (val) => Math.round((Number(val) || 0) * 100) / 100;
  return {
    cashIn: r2(cashIn),
    onlineIn: r2(onlineIn),
    vikasIn: r2(vikasIn),
    cashOut: r2(cashOut),
    onlineOut: r2(onlineOut),
    vikasOut: r2(vikasOut)
  };
};

function RecentBookings({ bookings, vehicles = [], setCurrentTab }) {
  const displayBookings = (bookings || []).slice(0, 5);

  const getStatusBadgeStyle = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed') return { bg: '#ecfdf5', color: '#10b981', border: '#a7f3d0' };
    if (s === 'ongoing' || s === 'extended') return { bg: '#eef2ff', color: '#6366f1', border: '#c7d2fe' };
    if (s === 'reserved' || s === 'pending') return { bg: '#fffbeb', color: '#f59e0b', border: '#fde68a' };
    return { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
  };

  const getSideColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed') return '#10b981';
    if (s === 'ongoing' || s === 'extended') return '#6366f1';
    if (s === 'reserved' || s === 'pending') return '#f59e0b';
    return '#64748b';
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Recent Bookings</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0' }}>Latest fleet rental activity</p>
        </div>
        <button
          onClick={() => setCurrentTab('bookings')}
          style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
        >
          View All →
        </button>
      </div>

      {displayBookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          No bookings found. Create your first booking to see activity here.
        </div>
      ) : (
        <div className="horizontal-slider" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {displayBookings.map((b) => {
            const flow = getCardFlow(b);
            const sideColor = getSideColor(b.status);
            const statusStyle = getStatusBadgeStyle(b.status);
            const resolvedV = vehicles.find(v => v.vehicleId === b.vehicleId);
            const vName = resolvedV?.name || b.vehicleDetails?.name || b.vehicleName || 'Vehicle';
            const vReg = resolvedV?.regNumber || b.vehicleDetails?.regNumber || b.vehicleRegNumber || '';
            const frontImg = resolvedV?.images?.front;
            const amt = (Math.round((Number(b.amount || b.finalAmount || b.baseFare || 0)) * 100) / 100).toLocaleString('en-IN');
            const custName = b.customer?.name || b.customerName || 'Customer';
            const custPhone = b.customer?.phone || b.customerPhone || '';

            const pDate = new Date(b.pickupDate || b.rentalPeriod?.startDate);
            const dDate = new Date(b.expectedDropDate || b.rentalPeriod?.expectedEndDate);
            const pDateStr = isNaN(pDate.getTime()) ? 'N/A' : pDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            const dDateStr = isNaN(dDate.getTime()) ? 'N/A' : dDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

            return (
              <div
                key={b.bookingId}
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  borderLeft: `5px solid ${sideColor}`,
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s'
                }}
              >
                {/* Main Card Content */}
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1, minWidth: 280 }}>
                    {/* Photo / Avatar */}
                    <div style={{
                      width: 54, height: 54, borderRadius: 10, background: '#f8fafc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      border: '1px solid #e2e8f0', overflow: 'hidden'
                    }}>
                      {frontImg ? (
                        <img src={frontImg} alt="Vehicle" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (b.vehicleDetails?.category?.toLowerCase() === 'car' ? (
                        <Car size={26} color="#6366f1" />
                      ) : (
                        <Bike size={26} color="#6366f1" />
                      ))}
                    </div>

                    {/* Meta */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {/* Row 1: Name + Reg + ID */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{vName}</span>
                        {vReg && (
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700, color: '#6366f1',
                            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
                            borderRadius: 6, padding: '1px 8px', letterSpacing: '0.5px'
                          }}>
                            {vReg}
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>#{b.bookingId}</span>
                      </div>

                      {/* Row 2: Status + Customer + Phone */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                          background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`
                        }}>
                          {b.status || 'Active'}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <User size={12} color="#64748b" /> {custName}
                        </span>
                        {custPhone && (
                          <>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Phone size={11} color="#94a3b8" /> {custPhone}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Row 3: Timing details */}
                      <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={13} color="#94a3b8" />
                        <span>{pDateStr} → {dDateStr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Amount & View Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Amount</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>₹{amt}</div>
                    </div>
                    <button
                      onClick={() => setCurrentTab('bookings')}
                      style={{
                        padding: '7px 14px', fontSize: '0.8rem', fontWeight: 600, borderRadius: 8,
                        border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#6366f1'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                    >
                      <Eye size={13} /> View
                    </button>
                  </div>
                </div>

                {/* Bottom Strip Cash flow matching BookedVehicles list card design */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  background: '#f8fafc'
                }}>
                  <div style={{ padding: '7px 4px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Banknote size={13} /> Cash In: <strong>₹{flow.cashIn.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ padding: '7px 4px', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Monitor size={13} /> Online In: <strong>₹{flow.onlineIn.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ padding: '7px 4px', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <User size={13} /> Vikas In: <strong>₹{flow.vikasIn.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ padding: '7px 4px', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Wallet size={13} /> Cash Out: <strong>₹{flow.cashOut.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ padding: '7px 4px', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <CreditCard size={13} /> Online Out: <strong>₹{flow.onlineOut.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ padding: '7px 4px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <User size={13} /> Vikas Out: <strong>₹{flow.vikasOut.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Main Dashboard
export default function DashboardHome({ vehicles, bookings, userRole, setCurrentTab, onPickup, onDropOff }) {
  const isAdmin = userRole === 'admin';
  const now = new Date();

  const fleetStats = useMemo(() => ({
    total: vehicles.length,
    available: vehicles.filter(v => v.status === 'Available' || v.status === 'Active').length,
    ongoing: vehicles.filter(v => v.status === 'Ongoing').length,
    reserved: vehicles.filter(v => v.status === 'Reserved').length,
    maintenance: vehicles.filter(v => v.status === 'Maintenance' || v.status === 'Out Of Service' || v.status === 'Inactive').length,
  }), [vehicles]);

  const bookingStats = useMemo(() => {
    const pendingPickups = bookings.filter(b => b.status === 'Reserved');
    const ongoingTrips = bookings.filter(b => ['Ongoing', 'Extended'].includes(b.status));
    const activeRentals = bookings.filter(b => ['Ongoing', 'Extended', 'Reserved'].includes(b.status));
    return { pendingPickups, ongoingTrips, activeRentals };
  }, [bookings]);

  const financials = useMemo(() => {
    const completedRevenue = bookings
      .filter(b => b.status === 'Completed')
      .reduce((sum, b) => sum + (Number(b.rentalCost) || Number(b.baseFare) || 0), 0);
    return { completedRevenue };
  }, [bookings]);

  const utilization = vehicles.length > 0
    ? Math.round(((fleetStats.ongoing + fleetStats.reserved) / vehicles.length) * 100)
    : 0;

  return (
    <div className="fo-dashboard">
      {/* Page Title */}
      <div className="fo-page-header">
        <div>
          <h1 className="fo-page-title">Dashboard Overview</h1>
          <p className="fo-breadcrumb">
            <span>FleetOps</span> / <span className="fo-breadcrumb-active">Dashboard</span>
          </p>
        </div>
        <p className="fo-last-updated">Last updated: <strong>Just now</strong></p>
      </div>

      {/* Stat Cards Row */}
      <div className="fo-stat-grid">
        <StatCard
          icon={<Car size={22} strokeWidth={2} color="#6366f1"/>}
          iconBg="#eef2ff"
          label="Total Vehicles"
          value={vehicles.length}
          change={`+${fleetStats.available}`}
          changeType="up"
          changeSuffix="available"
        />
        <StatCard
          icon={<Users size={22} strokeWidth={2} color="#10b981"/>}
          iconBg="#ecfdf5"
          label="Active Rentals"
          value={bookingStats.activeRentals.length}
          change={`${bookingStats.ongoingTrips.length} ongoing`}
          changeType="up"
          changeSuffix=""
        />
        <StatCard
          icon={<DollarSign size={22} strokeWidth={2} color="#f59e0b"/>}
          iconBg="#fffbeb"
          label="Revenue"
          value={fmt(financials.completedRevenue)}
          change={financials.completedRevenue > 0 ? 'from completed' : 'no data yet'}
          changeType={financials.completedRevenue > 0 ? 'up' : ''}
          changeSuffix=""
        />
        <StatCard
          icon={<Calendar size={22} strokeWidth={2} color="#8b5cf6"/>}
          iconBg="#f5f3ff"
          label="Pending Requests"
          value={bookingStats.pendingPickups.length}
          change={bookingStats.pendingPickups.length > 0 ? `${bookingStats.pendingPickups.length} needs action` : 'all clear'}
          changeType={bookingStats.pendingPickups.length > 0 ? 'down' : 'up'}
          changeSuffix=""
        />
        <StatCard
          icon={<Clock size={22} strokeWidth={2} color="#06b6d4"/>}
          iconBg="#ecfeff"
          label="Fleet Utilization"
          value={`${utilization}%`}
          change={`${fleetStats.ongoing + fleetStats.reserved} in use`}
          changeType={utilization > 50 ? 'up' : 'down'}
          changeSuffix=""
        />
      </div>

      {/* Charts Row */}
      <div className="fo-charts-grid">
        <RevenueChart />
        <CategoryUtilization vehicles={vehicles} />
      </div>

      {/* Recent Bookings */}
      <RecentBookings bookings={bookings} vehicles={vehicles} setCurrentTab={setCurrentTab} />
    </div>
  );
}
