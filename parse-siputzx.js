const fs = require('fs');
const html = fs.readFileSync('siputzx.html', 'utf16le');
const matches = [...html.matchAll(/\/api\/[a-zA-Z0-9\/\-\_]+/g)].map(m => m[0]);
console.log(Array.from(new Set(matches)).filter(m => m.includes('dl') || m.includes('down')));
