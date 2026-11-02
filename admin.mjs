import { createInterface } from 'node:readline/promises';
import { db, hashPassword } from './db.mjs';
const rl = createInterface({input:process.stdin, output:process.stdout});
try {
  const email = (await rl.question('Admin email: ')).trim().toLowerCase();
  const name = (await rl.question('Admin name: ')).trim();
  console.log('Password input is visible in this local terminal. Use a private terminal.');
  const password = await rl.question('New password (12+ characters): ');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!name||password.length<12||password.length>128) throw Error('Valid email, name and 12–128 character password required.');
  db.prepare(`INSERT INTO users(name,email,hash,role) VALUES(?,?,?,'admin') ON CONFLICT(email) DO UPDATE SET name=excluded.name,hash=excluded.hash,role='admin'`).run(name,email,hashPassword(password));
  const u=db.prepare('SELECT id FROM users WHERE email=?').get(email);
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);
  console.log('Admin saved. Open /admin and sign in. Existing sessions for this account were revoked.');
} catch(e) { console.error(e.message); process.exitCode=1; } finally { rl.close(); db.close(); }
