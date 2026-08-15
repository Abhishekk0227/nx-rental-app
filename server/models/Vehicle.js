import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    unique: true,
    sparse: true  // allows multiple documents without vehicleId during pre-save
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone'
  },
  name: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true // Honda, TVS, Bajaj, etc.
  },
  regNumber: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    enum: ['Bike', 'Scooty', 'Car', 'EV'],
    required: true
  },
  fuelType: {
    type: String,
    required: true // Petrol, Diesel, CNG, EV, Petrol + CNG, Diesel + CNG
  },
  seatingCapacity: {
    type: Number,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  meterReading: {
    type: Number,
    required: true,
    default: 0 // KM reading
  },
  fuelCapacity: {
    type: Number,
    required: true,
    default: 0 // Liters or Charge %
  },
  mileage: {
    type: Number,
    required: true,
    default: 0 // KM/L or KM/Charge
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['Available', 'Active', 'Reserved', 'Booked', 'Maintenance', 'Out Of Service', 'Inactive', 'Ongoing'],
    default: 'Active'
  },
  
  // Pricing plans
  pricingPlans: {
    hourly: {
      rate: { type: Number, default: 0 },
      freeKm: { type: Number, default: 0 },
      fuelChargePerKm: { type: Number, default: 0 },
      extraKmCharge: { type: Number, default: 0 },
      withFuel: { type: Number, default: 0 },
      withoutFuel: { type: Number, default: 0 }
    },
    twelveHour: {
      baseRate: { type: Number, default: 0 },
      ratePerHour: { type: Number, default: 0 },
      kmLimit: { type: Number, default: 0 },
      fuelChargePerKm: { type: Number, default: 0 },
      extraKmCharge: { type: Number, default: 0 },
      extraHourCharge: { type: Number, default: 0 },
      gracePeriod: { type: Number, default: 0 }, // in minutes
      withFuel: { type: Number, default: 0 },
      withoutFuel: { type: Number, default: 0 }
    },
    twentyFourHour: {
      baseRate: { type: Number, default: 0 },
      ratePerHour: { type: Number, default: 0 },
      kmLimit: { type: Number, default: 0 },
      fuelChargePerKm: { type: Number, default: 0 },
      extraKmCharge: { type: Number, default: 0 },
      extraHourCharge: { type: Number, default: 0 },
      gracePeriod: { type: Number, default: 0 },
      withFuel: { type: Number, default: 0 },
      withoutFuel: { type: Number, default: 0 }
    },
    weekly: {
      baseRate: { type: Number, default: 0 },
      kmLimit: { type: Number, default: 0 },
      extraKmCharge: { type: Number, default: 0 },
      extraDayCharge: { type: Number, default: 0 },
      gracePeriod: { type: Number, default: 0 }
    },
    monthly: {
      baseRate: { type: Number, default: 0 },
      kmLimit: { type: Number, default: 0 },
      extraKmCharge: { type: Number, default: 0 },
      extraDayCharge: { type: Number, default: 0 }
    }
  },

  // Deposit and Payment Configuration
  depositSettings: {
    requireDeposit: { type: Boolean, default: true },
    amount: { type: Number, default: 0 }
  },
  paymentSettings: {
    advanceRequired: { type: Boolean, default: false },
    percentage: { type: Number, default: 50 },
    acceptedModes: [{ type: String }] // Cash, UPI, Bank Transfer
  },

  // Booking settings
  bookingConfig: {
    bufferTime: { type: Number, default: 30 }, // in minutes
    minBookingHours: { type: Number, default: 0 }, // 0 = no minimum enforced
    status: { type: String, default: 'Active' },
    bookingEnabled: { type: Boolean, default: true },
    instantBooking: { type: Boolean, default: true }
  },

  // Documentation URLs
  documents: {
    rcUrl: { type: String, default: '' },
    insuranceUrl: { type: String, default: '' },
    pucUrl: { type: String, default: '' },
    fitnessUrl: { type: String, default: '' }
  },

  // Vehicle Gallery Images (Base64)
  images: {
    front: { type: String, default: '' },
    back: { type: String, default: '' },
    left: { type: String, default: '' },
    right: { type: String, default: '' },
    interior: { type: String, default: '' },
    document: { type: String, default: '' },
    other: { type: String, default: '' }
  },

  // Availability detail
  availability: {
    availableForBooking: { type: Boolean, default: true },
    reason: { type: String, default: '' } // Maintenance, Accident, Reserved, Out Of Service, Other
  },

  // Maintenance and Service Logs
  maintenanceIntervalKm: { type: Number, default: 5000 },
  lastServiceKm: { type: Number, default: 0 },
  nextServiceKm: { type: Number, default: 5000 },
  maintenanceRecords: [{
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Completed' },
    serviceDate: { type: Date, default: Date.now },
    serviceKm: { type: Number },
    cost: { type: Number, default: 0 },
    vendor: { type: String },
    issue: { type: String },
    workDone: { type: String },
    priority: { type: String, enum: ['Low', 'Medium', 'High'] },
    nextDue: { type: Date },
    nextServiceKm: { type: Number },
    notes: { type: String },
    createdBy: { type: String },
    completedBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  }],

  // Employee actions audits
  auditLogs: [{
    employee: { type: String },
    action: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  
  assignedWorker: {
    type: String,
    default: 'Unassigned'
  },
  
  // Zone change tracking
  zoneChangeHistory: [{
    previousZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    newZoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
    previousZoneName: { type: String },
    newZoneName: { type: String },
    previousWorker: { type: String },
    newWorker: { type: String },
    changedBy: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Auto-increment vehicleId: VEH-00001, VEH-00002, etc.
// Finds the actual maximum VEH- number to prevent duplicate key errors.
vehicleSchema.pre('save', async function(next) {
  if (!this.vehicleId) {
    try {
      // Fetch ALL vehicleIds with VEH- prefix and find the actual max
      const allVehicles = await this.constructor.find(
        { vehicleId: { $regex: /^VEH-\d+$/ } },
        { vehicleId: 1 }
      ).lean();
      let maxNum = 0;
      allVehicles.forEach(v => {
        const num = parseInt(v.vehicleId.replace('VEH-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      });
      this.vehicleId = `VEH-${String(maxNum + 1).padStart(5, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// ─── Indexes for performance ──────────────────────────────────────────────────
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ zoneId: 1 });
vehicleSchema.index({ category: 1 });


const Vehicle = mongoose.model('Vehicle', vehicleSchema);
export default Vehicle;
