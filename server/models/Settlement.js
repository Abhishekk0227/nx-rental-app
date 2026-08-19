import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD format
    required: true
  },
  zoneId: {
    type: String, // optional zone identifier
    required: false
  },
  workerId: {
    type: String, // plain string identifier, e.g. "Worker 1" or a user name
    required: true
  },
  cashCollected: {
    type: Number,
    default: 0,
    set: Math.round
  },
  depositToAdmin: {
    type: Number,
    default: 0,
    set: Math.round
  },
  balance: {
    type: Number,
    default: 0, // cashCollected - depositToAdmin
    set: Math.round
  },
  status: {
    type: String,
    enum: ['Pending', 'Settled'],
    default: 'Pending'
  },
  remarks: {
    type: String
  }
}, {
  timestamps: true
});

// Compound unique index: one settlement record per worker per day
settlementSchema.index({ date: 1, workerId: 1 }, { unique: true });

// Calculate balance automatically before saving
settlementSchema.pre('save', function (next) {
  this.balance = Math.round((this.cashCollected || 0) - (this.depositToAdmin || 0));
  if (this.balance === 0) {
    this.status = 'Settled';
  } else {
    this.status = 'Pending';
  }
  next();
});

const Settlement = mongoose.model('Settlement', settlementSchema);
export default Settlement;
