import { MongoClient } from 'mongodb';
import dns from 'dns';
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const uri = 'mongodb+srv://vikas:jE7t2h81Qh6197m4@cluster0.b73x2.mongodb.net/nx-rental?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri);

async function fixBookings() {
  try {
    await client.connect();
    console.log('Connected to DB');
    const db = client.db('test'); // Replace with actual db name if different, but usually mongoose connects to default
    const bookingsCollection = db.collection('bookings');
    
    const bookings = await bookingsCollection.find({}).toArray();
    let updated = 0;
    
    for (const b of bookings) {
      let needsUpdate = false;
      let updates = {};
      
      if (!b.baseFare) {
        if (b.selectedPlan && b.selectedPlan.rate) {
          updates.baseFare = b.selectedPlan.rate;
          needsUpdate = true;
        } else if (b.settlement && b.settlement.totalBill) {
            updates.baseFare = b.settlement.totalBill;
            needsUpdate = true;
        }
      }
      
      if ((!b.advancePaid || b.advancePaid === 0) && b.settlement && b.settlement.previousPaid > 0) {
        updates.advancePaid = b.settlement.previousPaid;
        needsUpdate = true;
      }
      
      if ((!b.securityDeposit || b.securityDeposit === 0) && b.settlement && b.settlement.depositCollected > 0) {
        updates.securityDeposit = b.settlement.depositCollected;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await bookingsCollection.updateOne({ _id: b._id }, { $set: updates });
        updated++;
      }
    }
    
    console.log(`Updated ${updated} bookings.`);
  } finally {
    await client.close();
  }
}

fixBookings().catch(console.error);
