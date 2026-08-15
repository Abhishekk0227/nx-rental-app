const fs = require('fs');
const file = 'client/src/components/BookingForm.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /onChange=\{e => setPhone\(e\.target\.value === '' \? '' : Number\(e\.target\.value\.replace\(\/\[\^0-9\.\-\]\/g, ''\)\)\)\}/g,
  'onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9]/g, \'\'))}'
);

content = content.replace(
  /onChange=\{e => setAltPhone\(e\.target\.value === '' \? '' : Number\(e\.target\.value\.replace\(\/\[\^0-9\.\-\]\/g, ''\)\)\)\}/g,
  'onChange={e => setAltPhoneNumber(e.target.value.replace(/[^0-9]/g, \'\'))}'
);

fs.writeFileSync(file, content);
console.log('Fixed phone inputs');
