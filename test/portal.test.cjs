const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { after, test } = require('node:test');
const { io } = require('socket.io-client');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-k3-test-'));
let serverProcess;
let adminSocket;
let publicSocket;
let baseUrl;

async function findFreePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(url) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/admin/session`);
      if (response.status === 401) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Server uji tidak siap dalam 10 detik.');
}

function waitForSocketEvent(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout menunggu event ${event}.`)), 5_000);
    socket.once(event, (value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}

after(async () => {
  adminSocket?.close();
  publicSocket?.close();
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill();
    await new Promise((resolve) => serverProcess.once('exit', resolve));
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('pengaduan anonim, kontrol admin, dan notifikasi status berjalan end-to-end', async () => {
  const port = await findFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, [path.join(__dirname, '../server/index.cjs')], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      ADMIN_EMAIL: 'admin@example.test',
      ADMIN_PASSWORD: 'Password-Uji-Portal-2026!',
      JWT_SECRET: 'test-secret-portal-k3-integration-32-characters',
      DATABASE_URL: '',
      DATABASE_PATH: path.join(tempDir, 'portal.sqlite'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  serverProcess.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
  serverProcess.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });
  await waitForServer(baseUrl).catch((error) => {
    throw new Error(`${error.message}\n${serverOutput}`);
  });

  const anonymousAccess = await fetch(`${baseUrl}/api/admin/reports`);
  assert.equal(anonymousAccess.status, 401);
  assert.match(
    anonymousAccess.headers.get('content-security-policy'),
    /frame-src 'self' https:\/\/www\.youtube-nocookie\.com/,
  );

  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.test', password: 'Password-Uji-Portal-2026!' }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];

  adminSocket = io(baseUrl, { extraHeaders: { Cookie: cookie }, transports: ['websocket'] });
  publicSocket = io(baseUrl, { transports: ['websocket'] });
  await Promise.all([waitForSocketEvent(adminSocket, 'connect'), waitForSocketEvent(publicSocket, 'connect')]);

  const newReportNotice = waitForSocketEvent(adminSocket, 'report:new');
  const submission = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      reporter: '',
      category: 'Kondisi tidak aman',
      incidentDate: new Date().toISOString().slice(0, 10),
      location: 'Gedung Uji Lantai 1',
      description: 'Lampu koridor berkedip dan kabel terbuka.',
      initialAction: '',
    }),
  });
  assert.equal(submission.status, 201);
  const created = await submission.json();
  const newNotice = await newReportNotice;
  assert.equal(newNotice.report.location, 'Gedung Uji Lantai 1');

  publicSocket.emit('report:subscribe', { trackingCode: created.trackingCode });
  await new Promise((resolve) => setTimeout(resolve, 100));
  const tracking = await fetch(`${baseUrl}/api/reports/track/${created.trackingCode}`);
  assert.equal(tracking.status, 200);
  assert.equal((await tracking.json()).status, 'Baru');

  const reportListResponse = await fetch(`${baseUrl}/api/admin/reports`, { headers: { Cookie: cookie } });
  const reportList = await reportListResponse.json();
  const report = reportList.reports.find((item) => item.location === 'Gedung Uji Lantai 1');
  assert.ok(report);

  const statusNotice = waitForSocketEvent(publicSocket, 'report:status');
  const update = await fetch(`${baseUrl}/api/admin/reports/${report.id}/status`, {
    method: 'PATCH',
    headers: { Cookie: cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'Ditindaklanjuti', note: 'Petugas fasilitas sudah menerima laporan.' }),
  });
  assert.equal(update.status, 200);
  assert.equal((await statusNotice).status, 'Ditindaklanjuti');

  const finalStatus = await fetch(`${baseUrl}/api/reports/track/${created.trackingCode}`);
  const reportStatus = await finalStatus.json();
  assert.equal(reportStatus.status, 'Ditindaklanjuti');
  assert.equal(reportStatus.updates.length, 2);

});
