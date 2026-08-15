const fs = require('fs');
const filePath = 'client/src/components/BookedVehicles.jsx';
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Add state
  content = content.replace(
    "const [editPickupDate, setEditPickupDate] = useState('');\n  const [editExpectedDropDate, setEditExpectedDropDate] = useState('');",
    "const [editPickupDate, setEditPickupDate] = useState('');\n  const [editStartMeter, setEditStartMeter] = useState('');\n  const [editExpectedDropDate, setEditExpectedDropDate] = useState('');"
  );
  
  // 2. Initialize
  content = content.replace(
    "setEditPickupDate(booking.pickupDate || formatLocalISO(new Date(booking.rentalPeriod?.startDate)));\n    setEditExpectedDropDate(booking.expectedDropDate || formatLocalISO(new Date(booking.rentalPeriod?.expectedEndDate)));",
    "setEditPickupDate(booking.pickupDate || formatLocalISO(new Date(booking.rentalPeriod?.startDate)));\n    setEditStartMeter(booking.handover?.startMeter || booking.pickupDetails?.odometerStart || 0);\n    setEditExpectedDropDate(booking.expectedDropDate || formatLocalISO(new Date(booking.rentalPeriod?.expectedEndDate)));"
  );
  
  // 3. Payload
  content = content.replace(
    "pickupDate: editPickupDate,\n      expectedDropDate: editExpectedDropDate,\n      selectedPlan: {",
    "pickupDate: editPickupDate,\n      actualPickupDate: editPickupDate,\n      rentalPeriod: {\n        ...selectedBooking.rentalPeriod,\n        startDate: editPickupDate,\n        actualPickupDate: editPickupDate\n      },\n      handover: {\n        ...selectedBooking.handover,\n        startMeter: Number(editStartMeter)\n      },\n      expectedDropDate: editExpectedDropDate,\n      selectedPlan: {"
  );
  
  // 4. UI
  content = content.replace(
    '<div className="form-group">\n                        <label>Start pickup Date {selectedBooking.status !== \'Reserved\' && <span style={{ fontSize: \'0.7rem\', color: \'#f43f5e\' }}>(Locked - Ongoing)</span>}</label>\n                        <input type="datetime-local" className="form-control" value={editPickupDate} onChange={e => setEditPickupDate(e.target.value)} disabled={selectedBooking.status !== \'Reserved\'} required />\n                      </div>',
    '<div className="form-group">\n                        <label>Start pickup Date</label>\n                        <input type="datetime-local" className="form-control" value={editPickupDate} onChange={e => setEditPickupDate(e.target.value)} required />\n                      </div>\n                      <div className="form-group">\n                        <label>Start Meter (Odometer)</label>\n                        <input type="number" className="form-control" value={editStartMeter} onChange={e => setEditStartMeter(e.target.value)} required />\n                      </div>'
  );

  fs.writeFileSync(filePath, content);
  console.log('BookedVehicles.jsx updated successfully.');
} else {
  console.log('File not found');
}
