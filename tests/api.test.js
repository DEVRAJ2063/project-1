const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');

const port = 4181;
const databasePath = path.join(__dirname, 'test.sqlite');
let server;

async function request(pathname, options = {}) {
  const response = await fetch(`http://localhost:${port}${pathname}`, options);
  return { response, body: await response.json() };
}

test.before(async () => {
  if (fs.existsSync(databasePath)) fs.rmSync(databasePath, { force: true });
  server = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(port), DATABASE_PATH: databasePath } });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Test server did not start')), 5000);
    server.stdout.on('data', data => { if (String(data).includes('Medi Dost server running')) { clearTimeout(timeout); resolve(); } });
    server.stderr.on('data', data => { if (String(data).includes('Error')) { clearTimeout(timeout); reject(new Error(String(data))); } });
  });
});

test.after(async () => { server.kill(); await once(server, 'exit'); for (const file of [databasePath, `${databasePath}-shm`, `${databasePath}-wal`]) if (fs.existsSync(file)) fs.rmSync(file, { force: true }); });

test('health and medicine search are public', async () => {
  const health = await request('/api/health');
  assert.equal(health.response.status, 200);
  const search = await request('/api/search?q=para');
  assert.equal(search.response.status, 200);
  assert.equal(search.body.data.medicines[0].name, 'Paracetamol');
});

test('authentication protects and enables user workflows', async () => {
  const unauthorized = await request('/api/reminders');
  assert.equal(unauthorized.response.status, 401);
  const login = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'devraj@example.com', password: 'medidost123' }) });
  assert.equal(login.response.status, 200);
  const cookie = login.response.headers.get('set-cookie').split(';')[0];
  const headers = { 'content-type': 'application/json', cookie };
  const me = await request('/api/auth/me', { headers });
  assert.equal(me.response.status, 200);
  assert.equal(me.body.authenticated, true);
  const reminder = await request('/api/reminders', { method: 'POST', headers, body: JSON.stringify({ medicineName: 'Paracetamol', scheduledAt: '2026-09-20T08:00' }) });
  assert.equal(reminder.response.status, 200);
  const saved = await request('/api/saved-medicines', { method: 'POST', headers, body: JSON.stringify({ medicineId: 1 }) });
  assert.equal(saved.response.status, 200);
  const chat = await request('/api/ai/chat', { method: 'POST', headers, body: JSON.stringify({ message: 'What is paracetamol used for?' }) });
  assert.equal(chat.response.status, 200);
  assert.match(chat.body.data.safetyNotice, /general health information/i);
});
