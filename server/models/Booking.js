import mongoose from 'mongoose';
import { customRound } from '../utils/billingEngine.js';


const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone'
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // ─── Customer ──────────────────────────────────────────────────────────────
  customer: {
    name: { type: String, required: true },
    fatherName: { type: String, default: '' },
    phone: { type: String, required: true },
    alternatePhone: { type: String, default: '' },
    email: { type: String, default: '' },
    drivingLicense: { type: String, default: '' },
    aadhaar: { type: String, default: '' },
    docAadhaarFront: { type: String, default: '' },
    docAadhaarBack: { type: String, default: '' },
    docLicense: { type: String, default: '' },
    docRegistration: { type: String, default: '' },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' }
    }
  },

  // ─── Vehicle ───────────────────────────────────────────────────────────────
  vehicleId: { type: String, required: true }, // e.g. VEH-00001
  vehicleDetails: {
    name: { type: String },
    regNumber: { type: String },
    category: { type: String }
  },

  // ─── Rental Period ─────────────────────────────────────────────────────────
  rentalPeriod: {
    startDate: { type: Date, required: true },
    expectedEndDate: { type: Date, required: true },
    actualPickupDate: { type: Date },
    actualReturnDate: { type: Date }
  },

  // ─── Handover & Accessories ────────────────────────────────────────────────
  handover: {
    startMeter: { type: Number, default: 0 },
    fuelIncluded: { type: Boolean, default: false }
  },
  accessoriesChecklist: {
    helmetCount: { type: Number, default: 0 },
    toolkit: { type: Boolean, default: false },
    spareTyre: { type: Boolean, default: false },
    firstAid: { type: Boolean, default: false }
  },

  // ─── Plan ──────────────────────────────────────────────────────────────────
  selectedPlan: {
    planType: { type: String, required: true }, // Hourly | 12-Hour | 24-Hour | Weekly | Monthly
    rate: { type: Number, required: true, set: Math.round },
    kmLimit: { type: Number, default: 0 },
    extraKmCharge: { type: Number, default: 0, set: Math.round },
    extraHourCharge: { type: Number, default: 0, set: Math.round }
  },

  // ─── Addons ────────────────────────────────────────────────────────────────
  addons: {
    helmetsCount: { type: Number, default: 0 },
    helmetsPrice: { type: Number, default: 50, set: Math.round },
    otherAccessories: { type: String, default: '' }
  },

  // ─── Active Booking Snapshot ───────────────────────────────────────────────
  // These are the PRIMARY source of truth. All screens must read from these.
  durationHours: { type: Number, default: 0 },
  durationDays: { type: Number, default: 0 },
  expectedReturnDate: { type: Date },   // = rentalPeriod.expectedEndDate
  expectedDropDate: { type: Date },
  actualPickupDate: { type: Date },     // = rentalPeriod.actualPickupDate
  actualReturnDate: { type: Date },     // = rentalPeriod.actualReturnDate

  rentalCost: { type: Number, default: 0, set: Math.round },       // cumulative base fare (incl. extensions)
  securityDeposit: { type: Number, default: 0, set: Math.round },  // original deposit required
  depositHeld: { type: Number, default: 0, set: Math.round },       // actual deposit collected so far
  rentalPaid: { type: Number, default: 0, set: Math.round },        // total rental paid so far
  outstandingRent: { type: Number, default: 0, set: Math.round },   // remaining rental due
  collectAmount: { type: Number, default: 0, set: Math.round },     // final collection needed at settlement
  refundAmount: { type: Number, default: 0, set: Math.round },      // refund due at settlement

  discount: { type: Number, default: 0, set: Math.round },
  baseFare: { type: Number, default: 0, set: Math.round },          // same as rentalCost (kept for compatibility during migration)

  // ─── Payment ───────────────────────────────────────────────────────────────
  paymentMode: { type: String, default: 'Cash' },
  paymentCollection: [{
    mode: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Mixed', 'online Refund', 'Cash Refund', 'Vikas', 'Vikas Refund'] },
    amount: { type: Number, default: 0, set: Math.round },
    cashAmount: { type: Number, default: 0, set: Math.round },
    onlineAmount: { type: Number, default: 0, set: Math.round },
    vikasAmount: { type: Number, default: 0, set: Math.round },
    workerId: { type: String, default: 'System' },
    transactionId: { type: String, default: '' },
    reference: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
  }],

  depositDetails: {
    mode: { type: String, default: 'Cash' },
    cashAmount: { type: Number, default: 0, set: Math.round },
    onlineAmount: { type: Number, default: 0, set: Math.round },
    cardAmount: { type: Number, default: 0 },
    vikasAmount: { type: Number, default: 0, set: Math.round }
  },

  // ─── Payment mixed totals (derived from paymentCollection) ─────────────────
  cashAmount: { type: Number, default: 0, set: Math.round },
  onlineAmount: { type: Number, default: 0, set: Math.round },
  cardAmount: { type: Number, default: 0 },
  vikasAmount: { type: Number, default: 0, set: Math.round },

  // ─── Drop-Off ──────────────────────────────────────────────────────────────
  dropDetails: {
    actualTime: { type: Date },
    endMeter: { type: Number, default: 0 },
    endFuelLevel: { type: String, enum: ['Empty', '25%', '50%', '75%', 'Full', ''], default: '' },
    vehicleCondition: { type: String, enum: ['Excellent', 'Good', 'Minor Damage', 'Major Damage', 'Accident', ''], default: '' },
    damageNotes: { type: String, default: '' },
    damageCharges: { type: Number, default: 0, set: Math.round },
    cleaningCharges: { type: Number, default: 0, set: Math.round },
    otherCharges: { type: Number, default: 0, set: Math.round },
    photos: [{ type: String }],
    operator: { type: String }
  },

  refundDetails: {
    amount: { type: Number, default: 0, set: Math.round },
    status: { type: String, enum: ['Pending', 'Processed', 'Completed', ''], default: '' },
    method: { type: String, default: '' },
    notes: { type: String, default: '' }
  },

  // ─── Settlement sub-document (audit record of final settlement) ─────────────
  settlement: {
    actualBill: { type: Number, default: 0, set: Math.round },
    totalBill: { type: Number, default: 0, set: Math.round },         // alias for actualBill (kept for compatibility)
    previousPaid: { type: Number, default: 0, set: Math.round },      // = rentalPaid at settlement time
    depositCollected: { type: Number, default: 0, set: Math.round },  // = depositHeld at settlement time
    depositHeld: { type: Number, default: 0, set: Math.round },
    depositAdjustment: { type: Number, default: 0, set: Math.round },
    depositRefund: { type: Number, default: 0, set: Math.round },
    depositRefundMode: { type: String, default: '' },
    depositRefundReason: { type: String, default: '' },
    remainingToPay: { type: Number, default: 0, set: Math.round },    // = outstandingRent at settlement time
    collectAmount: { type: Number, default: 0, set: Math.round },
    refundAmount: { type: Number, default: 0, set: Math.round }
  },

  // ─── Booking Status ────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['Reserved', 'Ongoing', 'Extended', 'Overdue', 'Completed', 'Cancelled'],
    default: 'Reserved'
  },

  workerId: { type: String, default: 'System' },

  // ─── History ───────────────────────────────────────────────────────────────
  extensions: [{
    newEndDateTime: Date,
    extraCharges: { type: Number, set: Math.round },
    remarks: String,
    timestamp: { type: Date, default: Date.now }
  }],

  replacements: [{
    oldVehicleId: String,
    oldVehicleReg: String,
    oldVehicleClosingMeter: Number,
    newVehicleId: String,
    newVehicleReg: String,
    newVehicleStartingMeter: Number,
    reason: String,
    timestamp: { type: Date, default: Date.now },
    operatorName: String
  }],

  // ─── Revision History (AUDIT ONLY — never used to drive calculations) ───────
  revisions: [{
    revisionNumber: { type: Number, required: true },
    actionType: { type: String },
    description: { type: String, required: true },
    operator: { type: String, default: 'System' },
    timestamp: { type: Date, default: Date.now },
    reason: { type: String, default: '' },

    oldValues: {
      rentalCost: { type: Number, set: Math.round },
      deposit: { type: Number, set: Math.round },
      rentalPaid: { type: Number, set: Math.round },
      depositCollected: { type: Number, set: Math.round },
      outstandingRent: { type: Number, set: Math.round }
    },
    newValues: {
      rentalCost: { type: Number, set: Math.round },
      deposit: { type: Number, set: Math.round },
      rentalPaid: { type: Number, set: Math.round },
      depositCollected: { type: Number, set: Math.round },
      outstandingRent: { type: Number, set: Math.round }
    },

    financialSnapshotAfterChange: {
      rentalCost: { type: Number, set: Math.round },
      depositHeld: { type: Number, set: Math.round },
      rentalPaid: { type: Number, set: Math.round },
      depositCollected: { type: Number, set: Math.round },
      outstandingRent: { type: Number, set: Math.round },
      paymentBreakdown: {
        rentalCash: { type: Number, default: 0, set: Math.round },
        rentalOnline: { type: Number, default: 0, set: Math.round },
        rentalCard: { type: Number, default: 0, set: Math.round },
        rentalVikas: { type: Number, default: 0 },
        depositCash: { type: Number, default: 0, set: Math.round },
        depositOnline: { type: Number, default: 0 },
        depositCard: { type: Number, default: 0 },
        depositVikas: { type: Number, default: 0, set: Math.round }
      }
    },

    fieldChanges: [{
      fieldName: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }],

    collectionDetails: {
      amount: { type: Number, set: Math.round },
      mode: String,
      cashSplit: { type: Number, set: Math.round },
      onlineSplit: { type: Number, set: Math.round },
      cardSplit: { type: Number, set: Math.round },
      vikasSplit: Number,
      remarks: String
    },
    refundDetails: {
      amount: Number,
      status: String,
      method: String,
      notes: String,
      timestamp: Date
    },
    depositDetails: {
      oldDeposit: { type: Number, set: Math.round },
      newDeposit: { type: Number, set: Math.round },
      difference: { type: Number, set: Math.round },
      mode: String,
      cashAmount: { type: Number, set: Math.round },
      onlineAmount: { type: Number, set: Math.round }
    },
    vehicleDetails: {
      oldVehicleId: String,
      oldVehicleName: String,
      oldVehicleReg: String,
      newVehicleId: String,
      newVehicleName: String,
      newVehicleReg: String,
      oldPricing: { type: Number, set: Math.round },
      newPricing: { type: Number, set: Math.round },
      oldDeposit: { type: Number, set: Math.round },
      newDeposit: { type: Number, set: Math.round },
      additionalCollection: { type: Number, set: Math.round },
      refundDifference: { type: Number, set: Math.round }
    },
    meterDetails: {
      oldVehicleClosingMeter: Number,
      newVehicleStartingMeter: Number
    },
    durationDetails: {
      oldDuration: Number,
      newDuration: Number,
      difference: { type: Number, set: Math.round }
    }
  }]
}, {
  timestamps: true
});

// ─── Auto-generate bookingId ──────────────────────────────────────────────────
bookingSchema.pre('save', async function (next) {
  if (!this.bookingId) {
    try {
      const lastBooking = await this.constructor.findOne(
        { bookingId: { $regex: /^VB-\d+$/ } },
        {},
        { sort: { createdAt: -1 } }
      );
      let nextNum = 10001;
      if (lastBooking?.bookingId) {
        const parts = lastBooking.bookingId.split('-');
        nextNum = parseInt(parts[1], 10) + 1;
      }
      this.bookingId = `VB-${nextNum}`;
    } catch (err) {
      return next(err);
    }
  }

  // ─── Keep snapshot fields in sync with rentalPeriod ────────────────────────
  if (this.rentalPeriod) {
    if (!this.expectedReturnDate && this.rentalPeriod.expectedEndDate) {
      this.expectedReturnDate = this.rentalPeriod.expectedEndDate;
    }
    if (!this.actualPickupDate && this.rentalPeriod.actualPickupDate) {
      this.actualPickupDate = this.rentalPeriod.actualPickupDate;
    }
    if (!this.actualReturnDate && this.rentalPeriod.actualReturnDate) {
      this.actualReturnDate = this.rentalPeriod.actualReturnDate;
    }
  }

  // ─── Keep rentalCost in sync with baseFare ─────────────────────────────────
  if (this.baseFare > 0 && this.rentalCost === 0) {
    this.rentalCost = this.baseFare;
  }
  if (this.rentalCost > 0) {
    this.baseFare = this.rentalCost;
  }

  // ─── Calculate payment mode splits from paymentCollection ─────────────────
  let cash = 0;
  let online = 0;
  let card = 0;
  let vikas = 0;
  if (this.paymentCollection?.length > 0) {
    this.paymentCollection.forEach(p => {
      if (p.mode === 'Cash') {
        cash += p.cashAmount || p.amount || 0;
      } else if (p.mode === 'Mixed') {
        cash += p.cashAmount || 0;
        online += p.onlineAmount || 0;
        card += p.cardAmount || 0;
        vikas += p.vikasAmount || 0;
      } else if (['UPI', 'Online', 'Bank Transfer'].includes(p.mode)) {
        online += p.onlineAmount || p.amount || 0;
      } else if (p.mode === 'Card') {
        card += p.cardAmount || p.amount || 0;
      } else if (p.mode === 'Vikas') {
        vikas += p.vikasAmount || p.amount || 0;
      }
    });
  }
  this.cashAmount = customRound(cash);
  this.onlineAmount = customRound(online);
  this.cardAmount = customRound(card);
  this.vikasAmount = customRound(vikas);

  next();
});

// ─── Indexes for performance ──────────────────────────────────────────────────
bookingSchema.index({ zoneId: 1 });
bookingSchema.index({ workerId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'rentalPeriod.startDate': -1 });
bookingSchema.index({ createdAt: -1 });


const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
