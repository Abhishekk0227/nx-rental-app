const fs = require('fs');
const filePath = 'client/src/components/BookedVehicles.jsx';
if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix NaN issues with comma input in drop off form
  content = content.replace(/onChange=\{e => setDropFreeMinutes\(Number\(e\.target\.value\)\)\}/g, "onChange={e => setDropFreeMinutes(e.target.value.replace(/,/g, ''))}");
  content = content.replace(/onChange=\{e => setDropAddFreeKm\(Number\(e\.target\.value\)\)\}/g, "onChange={e => setDropAddFreeKm(e.target.value.replace(/,/g, ''))}");
  content = content.replace(/onChange=\{e => setDropDiscountWaiver\(Number\(e\.target\.value\)\)\}/g, "onChange={e => setDropDiscountWaiver(e.target.value.replace(/,/g, ''))}");

  fs.writeFileSync(filePath, content);
  console.log('BookedVehicles.jsx updated successfully.');
} else {
  console.log('File not found');
}
