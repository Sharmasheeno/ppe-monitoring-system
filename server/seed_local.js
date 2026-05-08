require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ppe_monitoring');
  const PW = process.argv[2] || '@Asharma4582';
  async function upsert(username, email, role) {
    let u = await User.findOne({ username });
    if (!u) u = new User({ username, email, role });
    u.role = role; u.password = PW;        // pre-save hook hashes it
    await u.save();
    return `${u.username} (${u.role})`;
  }
  const r = [];
  r.push(await upsert('mo', 'mo@local.com', 'user'));           // worker
  r.push(await upsert('admin', 'admin@sentinel.com', 'admin'));
  r.push(await upsert('supervisor', 'supervisor@sentinel.com', 'supervisor'));
  console.log('✅ accounts ready:', r.join('  |  '));
  console.log('   password for all three:', PW);
  process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
