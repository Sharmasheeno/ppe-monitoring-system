const path = require('path');
const fs = require('fs');

test('server.js exists and is syntactically valid', () => {
  const p = path.join(__dirname, '..', 'server.js');
  expect(fs.existsSync(p)).toBe(true);
  new Function(fs.readFileSync(p, 'utf8'));
});

test('package.json declares required dependencies', () => {
  const pkg = require('../package.json');
  const required = ['express','mongoose','jsonwebtoken','bcryptjs','aedes','socket.io','nodemailer'];
  for (const dep of required) {
    expect(pkg.dependencies[dep]).toBeDefined();
  }
});
