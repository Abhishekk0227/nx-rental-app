const fs = require('fs');
const path = require('path');

function removeCard(filePath, search, replace) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(search, replace);
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
  }
}

removeCard('server/models/Vehicle.js', /\[\{ type: String \}\] \/\/ Cash, UPI, Card, Bank Transfer/, '[{ type: String }] // Cash, UPI, Bank Transfer');

const seedsFile = 'server/seeds/vehicles.js';
if (fs.existsSync(seedsFile)) {
    let content = fs.readFileSync(seedsFile, 'utf8');
    content = content.replace(/,\s*'Card'/g, '');
    content = content.replace(/'Card',\s*/g, '');
    fs.writeFileSync(seedsFile, content);
    console.log('Updated ' + seedsFile);
}

const importFile = 'server/scripts/import_vehicles.js';
if (fs.existsSync(importFile)) {
    let content = fs.readFileSync(importFile, 'utf8');
    content = content.replace(/,\s*'Card'/g, '');
    content = content.replace(/'Card',\s*/g, '');
    fs.writeFileSync(importFile, content);
    console.log('Updated ' + importFile);
}
