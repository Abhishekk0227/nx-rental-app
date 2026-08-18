const authEndpoint = 'http://localhost:5000/api/users/login';
const bookingsEndpoint = 'http://localhost:5000/api/bookings?status=Reserved,Ongoing,Extended,Overdue';

async function test() {
  try {
    // 1. We might not need auth if we bypass it, but let's try a default login or just look at the code for users.
    // Wait, let's just create a dummy token using the JWT secret!
    const jwt = require('jsonwebtoken');
    const dotenv = require('dotenv');
    dotenv.config({ path: './server/.env' });
    
    // We can also just read the DB and sign a token.
    const token = jwt.sign({ id: 'dummy', role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    
    const res = await fetch(bookingsEndpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error(err);
  }
}
test();
