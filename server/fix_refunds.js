import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nx-rental';
mongoose.connect(uri)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // We just need a generic model to run direct updates
    const bookingSchema = new mongoose.Schema({}, { strict: false });
    const Booking = mongoose.model('Booking', bookingSchema);
    
    const bookings = await Booking.find({ status: 'Completed', 'settlement.refundAmount': { $gt: 0 } });
    console.log(`Found ${bookings.length} completed bookings with refunds.`);
    
    let fixedCount = 0;
    
    for (const b of bookings) {
      if (b.revisions && b.revisions.length > 0) {
        // Find the DropOff revision
        const dropRev = b.revisions.find(r => r.actionType === 'DropOff');
        if (dropRev && (!dropRev.refundDetails || !dropRev.refundDetails.amount)) {
          console.log(`Fixing booking ${b.bookingId}...`);
          
          dropRev.refundDetails = {
            amount: b.settlement.refundAmount,
            status: 'Completed',
            method: b.settlement.depositRefundMode || b.settlement.refundMode || 'Cash',
            notes: 'Recovered from settlement by fix script',
            timestamp: dropRev.timestamp || new Date()
          };
          
          await Booking.updateOne(
            { _id: b._id, 'revisions.actionType': 'DropOff' },
            { $set: { 'revisions.$.refundDetails': dropRev.refundDetails } }
          );
          
          fixedCount++;
        }
      }
    }
    
    console.log(`Successfully fixed ${fixedCount} bookings.`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
