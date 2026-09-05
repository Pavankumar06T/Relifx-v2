const fs = require('node:fs');
const path = require('node:path');

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', name), 'utf8'));
}

module.exports = { loadJson };
