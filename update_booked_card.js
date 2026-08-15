const fs = require('fs');
const filePath = 'client/src/components/BookedVehicles.jsx';
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove cardSplit: 0 from financialSnapshotAfterChange everywhere
  content = content.replace(/cardSplit:\s*0,/g, '');
  
  // 2. Remove 'Card' from getCardFlow
  content = content.replace(/else if \(\['Online', 'UPI', 'Card'\]\.includes\(b\.depositDetails\.mode\)\)/g, "else if (['Online', 'UPI'].includes(b.depositDetails.mode))");
  content = content.replace(/else if \(\['UPI', 'Card', 'Online'\]\.includes\(p\.mode\)\)/g, "else if (['UPI', 'Online'].includes(p.mode))");

  // 3. UI references (just in case)
  content = content.replace(/<CreditCard size=\{13\} \/>/g, "<Monitor size={13} />");

  fs.writeFileSync(filePath, content);
  console.log('BookedVehicles.jsx updated successfully.');
} else {
  console.log('File not found');
}
