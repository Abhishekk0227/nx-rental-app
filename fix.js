const fs = require('fs'); let c = fs.readFileSync('server/seeds/vehicles.js', 'utf8'); c = c.replace(/^\/\/ ?/gm, ''); fs.writeFileSync('server/seeds/vehicles.js', c);
