const fs = require('fs');

const fileBooking = 'client/src/components/BookingForm.jsx';
let cB = fs.readFileSync(fileBooking, 'utf8');

// 1. Remove state
cB = cB.replace(/const \[mixedVikas, setMixedVikas\] = useState\(0\);\r?\n/g, '');

// 2. Remove calculation
cB = cB.replace(/\+ \(Number\(mixedVikas\) \|\| 0\)/g, '');

// 3. Remove vikasAmount mixed logic
cB = cB.replace(/vikasAmount: paymentMethod === 'Mixed' \? Number\(mixedVikas\) : \(paymentMethod === 'Vikas' \? bill\.moneyReceived : 0\),/g, 'vikasAmount: paymentMethod === \'Vikas\' ? bill.moneyReceived : 0,');

// 4. Remove Vikas from reference string
cB = cB.replace(/, Vikas: \$\{mixedVikas\}/g, '');

// 5. Remove rentalVikas mixed logic
cB = cB.replace(/rentalVikas: paymentMethod === 'Vikas' \? bill\.moneyReceived : paymentMethod === 'Mixed' \? Number\(mixedVikas \|\| 0\) : 0,/g, 'rentalVikas: paymentMethod === \'Vikas\' ? bill.moneyReceived : 0,');

// 6. Remove JSX input
cB = cB.replace(/<div className="form-group" style=\{\{ marginBottom: 0, gridColumn: '1 \/ -1' \}\}><label>Vikas \(\₹\)<\/label><input type="text" inputMode="numeric" className="form-control" value=\{mixedVikas === '' \? '' : mixedVikas\} onChange=\{e => setMixedVikas\(e\.target\.value === '' \? '' : \(e\.target\.value === '' \? '' : Number\(e\.target\.value\.replace\(\/\[\^0-9\.\-\]\/g, ''\)\)\)\)\} \/><\/div>\r?\n/g, '');

fs.writeFileSync(fileBooking, cB);
console.log('BookingForm fixed');

const fileBooked = 'client/src/components/BookedVehicles.jsx';
let cV = fs.readFileSync(fileBooked, 'utf8');

// Remove extra Vikas from sum in Mixed split error check
cV = cV.replace(/ \+ Number\(dropVikasReceived\)/g, '');

// Remove Vikas Amount from alert string
cV = cV.replace(/ \+ Vikas Amount \(\₹\$\{dropVikasReceived\}\)/g, '');

// Remove Vikas from mixedDetails
cV = cV.replace(/, Vikas: \$\{dropVikasReceived\}/g, '');

// vikasAmount logic
cV = cV.replace(/vikasAmount: dropPaymentMethod === 'Mixed' \? Number\(dropVikasReceived\) : \['Vikas'\]\.includes\(dropPaymentMethod\) \? reqVal : 0,/g, 'vikasAmount: [\'Vikas\'].includes(dropPaymentMethod) ? reqVal : 0,');

// vikasSplit logic
cV = cV.replace(/vikasSplit: dropPaymentMethod === 'Mixed' \? Number\(dropVikasReceived\) : \['Vikas'\]\.includes\(dropPaymentMethod\) \? reqVal : 0,/g, 'vikasSplit: [\'Vikas\'].includes(dropPaymentMethod) ? reqVal : 0,');

// Remove JSX for Vikas input in Mixed Split Dropoff
const jsxVikas = `                            <div>
                              <label>Vikas Amount (₹)</label>
                              <input
                                type="text" inputMode="numeric"
                                className="form-control"
                                value={dropVikasReceived}
                                onChange={e => setDropVikasReceived(Number(e.target.value))}
                                required
                              />
                            </div>`;
cV = cV.replace(new RegExp(jsxVikas.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\r?\\n?', 'g'), '');

fs.writeFileSync(fileBooked, cV);
console.log('BookedVehicles fixed');
