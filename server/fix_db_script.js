import mongoose from 'mongoose';
import Booking from './models/Booking.js';

const uri = 'mongodb+srv://vikas:jE7t2h81Qh6197m4@cluster0.b73x2.mongodb.net/nx-rental?retryWrites=true&w=majority&appName=Cluster0';

async function fixBookings() {
  await mongoose.connect(uri);
  console.log('Connected to DB');
  
  const bookings = await Booking.find({});
  let updated = 0;
  for (const b of bookings) {
    let needsUpdate = false;
    
    // If baseFare is 0, we can guess it from selectedPlan or settlement
    if (!b.baseFare) {
      if (b.selectedPlan && b.selectedPlan.rate) {
        b.baseFare = b.selectedPlan.rate;
        needsUpdate = true;
      }
    }
    
    // advancePaid from settlement.previousPaid
    if (b.advancePaid === 0 && b.settlement && b.settlement.previousPaid > 0) {
      b.advancePaid = b.settlement.previousPaid;
      needsUpdate = true;
    }
    
    // securityDeposit from depositDetails or settlement
    if (b.securityDeposit === 0 && b.settlement && b.settlement.depositCollected > 0) {
      b.securityDeposit = b.settlement.depositCollected;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await b.save();
      updated++;
    }
  }
  
  console.log(`Updated ${updated} bookings.`);
  process.exit(0);
}

fixBookings().catch(console.error);
