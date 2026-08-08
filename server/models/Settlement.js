import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD format
    required: true
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cashCollected: {
    type: Number,
    default: 0
  },
  depositToAdmin: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0 // cashCollected - depositToAdmin
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
settlementSchema.pre('save', function(next) {
  this.balance = this.cashCollected - this.depositToAdmin;
  if (this.balance === 0) {
    this.status = 'Settled';
  } else {
    this.status = 'Pending';
  }
  next();
});

const Settlement = mongoose.model('Settlement', settlementSchema);
export default Settlement;
