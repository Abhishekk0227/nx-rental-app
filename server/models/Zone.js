import mongoose from 'mongoose';

const zoneSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  branchName: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

export default mongoose.model('Zone', zoneSchema);
