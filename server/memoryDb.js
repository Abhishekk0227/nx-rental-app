import mongoose from 'mongoose';
import { seedVehicles } from './seeds/vehicles.js';

// ─── DB connection check ──────────────────────────────────────────────────────
export const isDbConnected = () => mongoose.connection.readyState === 1;

// ─── In-Memory stores ─────────────────────────────────────────────────────────
// WARNING: These are volatile — data is lost on every server restart.
// Only used when MongoDB is unavailable. Set DISABLE_MEMORY_FALLBACK=true
// in production to prevent silent fallback to this mode.

export let vehicles = seedVehicles.map(v => ({ ...v, createdAt: new Date() }));

export let bookings = [];

export let settlements = [];

// ─── Vehicle CRUD ─────────────────────────────────────────────────────────────

export const getVehicles = () => vehicles;

export const addVehicle = (v) => {
  const existingNums = vehicles
    .map(item => parseInt(item.vehicleId?.split('-')[1] || '0', 10))
    .filter(n => !isNaN(n));
  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  
  let assignedWorker = v.assignedWorker || 'Unassigned';
  if (v.zoneId) {
    const worker = users.find(u => u.role === 'worker' && u.zoneId === v.zoneId);
    if (worker) assignedWorker = worker.name;
  }

  const newV = {
    ...v,
    assignedWorker,
    vehicleId: `VEH-${String(nextNum).padStart(5, '0')}`,
    createdAt: new Date()
  };
  vehicles.push(newV);
  return newV;
};

export const updateVehicle = (id, data) => {
  const idx = vehicles.findIndex(v => v.vehicleId === id);
  if (idx === -1) return null;

  let assignedWorker = data.assignedWorker !== undefined ? data.assignedWorker : vehicles[idx].assignedWorker;
  if (data.zoneId && data.zoneId !== vehicles[idx].zoneId) {
    const worker = users.find(u => u.role === 'worker' && u.zoneId === data.zoneId);
    if (worker) {
      assignedWorker = worker.name;
    } else {
      assignedWorker = 'Unassigned';
    }
  }

  vehicles[idx] = { ...vehicles[idx], ...data, assignedWorker };
  return vehicles[idx];
};

// ─── Booking CRUD ─────────────────────────────────────────────────────────────

export const getBookings = () => bookings;

export const addBooking = (b) => {
  const existingNums = bookings
    .map(item => parseInt(item.bookingId?.split('-')[1] || '0', 10))
    .filter(n => !isNaN(n));
  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 10001;
  const newB = {
    ...b,
    bookingId: `VB-${nextNum}`,
    createdAt: new Date(),
    extensions: b.extensions || [],
    replacements: b.replacements || [],
    revisions: b.revisions || [],
    paymentCollection: b.paymentCollection || []
  };
  bookings.push(newB);
  return newB;
};

export const updateBooking = (id, data) => {
  const idx = bookings.findIndex(b => b.bookingId === id);
  if (idx === -1) return null;
  bookings[idx] = { ...bookings[idx], ...data };
  return bookings[idx];
};

// ─── Settlement CRUD ──────────────────────────────────────────────────────────

export const getSettlements = () => settlements;

export const addSettlement = (s) => {
  const idx = settlements.findIndex(
    item => item.date === s.date && item.workerId === s.workerId
  );

  if (idx !== -1) {
    // Update existing record
    settlements[idx].cashCollected = s.cashCollected;
    settlements[idx].depositToAdmin += Number(s.depositAmount) || 0;
    settlements[idx].balance = settlements[idx].cashCollected - settlements[idx].depositToAdmin;
    settlements[idx].status = settlements[idx].balance === 0 ? 'Settled' : 'Pending';
    if (s.remarks) settlements[idx].remarks = s.remarks;
    return settlements[idx];
  }

  // New record
  const depositAmount = Number(s.depositAmount) || 0;
  const cashCollected = Number(s.cashCollected) || 0;
  const newS = {
    date: s.date,
    workerId: s.workerId,
    cashCollected,
    depositToAdmin: depositAmount,
    balance: cashCollected - depositAmount,
    status: cashCollected === depositAmount ? 'Settled' : 'Pending',
    remarks: s.remarks || '',
    createdAt: new Date()
  };
  settlements.push(newS);
  return newS;
};

// ─── Zone CRUD ────────────────────────────────────────────────────────────────
export let zones = [
  { _id: 'z1', name: 'Vijay Nagar', branchName: 'HQ', address: 'Vijay Nagar', city: 'Indore', state: 'MP', status: 'Active' },
  { _id: 'z2', name: 'Bhawarkuan', branchName: 'South Branch', address: 'Bhawarkuan', city: 'Indore', state: 'MP', status: 'Active' }
];

export const getZones = () => zones;
export const addZone = (z) => {
  const newZ = { ...z, _id: `z${zones.length + 1}`, createdAt: new Date() };
  zones.push(newZ);
  return newZ;
};
export const updateZone = (id, data) => {
  const idx = zones.findIndex(z => z._id === id);
  if (idx === -1) return null;
  zones[idx] = { ...zones[idx], ...data };
  return zones[idx];
};
export const deleteZone = (id) => {
  const idx = zones.findIndex(z => z._id === id);
  if (idx === -1) return false;
  zones.splice(idx, 1);
  return true;
};

// ─── User CRUD ────────────────────────────────────────────────────────────────
export let users = [
  { _id: 'u1', name: 'Super Admin', username: 'Rideyourbike@gmail.com', role: 'admin', status: 'Active' },
  { _id: 'u2', name: 'Ramesh Kumar', username: '9876543210', role: 'worker', status: 'Active', zoneId: 'z1' },
  { _id: 'u3', name: 'Suresh Singh', username: '9123456789', role: 'worker', status: 'Active', zoneId: 'z2' }
];

export const getUsers = () => users;
export const addUser = (u) => {
  const newU = { ...u, _id: `u${users.length + 1}`, createdAt: new Date() };
  users.push(newU);
  return newU;
};
export const updateUser = (id, data) => {
  const idx = users.findIndex(u => u._id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...data };
  return users[idx];
};
export const deleteUser = (id) => {
  const idx = users.findIndex(u => u._id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  return true;
};
