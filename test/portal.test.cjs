const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const { createServer } = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { after, test } = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-k3-test-'));
let serverProcess;
let vercelProcess;
let realtimeProcess;
let realtimeServer;
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

after(async () => {
  for (const process of [serverProcess, vercelProcess, realtimeProcess]) {
    if (process && process.exitCode === null) {
      process.kill();
      await new Promise((resolve) => process.once('exit', resolve));
    }
  }
  if (realtimeServer?.listening) {
    await new Promise((resolve, reject) => realtimeServer.close((error) => error ? reject(error) : resolve()));
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('pengaduan anonim, kontrol admin, dan pelacakan status berjalan end-to-end', async () => {
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
      SUPABASE_URL: '',
      SUPABASE_SECRET_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
      VERCEL: '',
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
  assert.match(
    anonymousAccess.headers.get('content-security-policy'),
    /connect-src 'self' https:\/\/\*\.supabase\.co wss:\/\/\*\.supabase\.co/,
  );

  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.test', password: 'Password-Uji-Portal-2026!' }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];

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
  assert.equal(created.realtimeNotified, false);

  const tracking = await fetch(`${baseUrl}/api/reports/track/${created.trackingCode}`);
  assert.equal(tracking.status, 200);
  assert.equal((await tracking.json()).status, 'Baru');

  const reportListResponse = await fetch(`${baseUrl}/api/admin/reports`, { headers: { Cookie: cookie } });
  const reportList = await reportListResponse.json();
  const report = reportList.reports.find((item) => item.location === 'Gedung Uji Lantai 1');
  assert.ok(report);

  const update = await fetch(`${baseUrl}/api/admin/reports/${report.id}/status`, {
    method: 'PATCH',
    headers: { Cookie: cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'Ditindaklanjuti', note: 'Petugas fasilitas sudah menerima laporan.' }),
  });
  assert.equal(update.status, 200);
  assert.equal((await update.json()).realtimeNotified, false);

  const finalStatus = await fetch(`${baseUrl}/api/reports/track/${created.trackingCode}`);
  const reportStatus = await finalStatus.json();
  assert.equal(reportStatus.status, 'Ditindaklanjuti');
  assert.equal(reportStatus.updates.length, 2);

});

test('handler Vercel meneruskan path hasil rewrite ke rute Express', async () => {
  const port = await findFreePort();
  const url = `http://127.0.0.1:${port}`;
  const apiEntry = pathToFileURL(path.resolve(__dirname, '../api/index.js')).href;
  const source = `import { createServer } from 'node:http'; import handler from ${JSON.stringify(apiEntry)}; createServer((req, res) => handler(req, res)).listen(Number(process.env.PORT), '127.0.0.1');`;
  vercelProcess = spawn(process.execPath, ['--input-type=module', '-e', source], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      ADMIN_EMAIL: 'admin@example.test',
      ADMIN_PASSWORD: 'Password-Uji-Portal-2026!',
      JWT_SECRET: 'test-secret-portal-k3-integration-32-characters',
      DATABASE_URL: '',
      DATABASE_PATH: path.join(tempDir, 'vercel.sqlite'),
      SUPABASE_URL: '',
      SUPABASE_SECRET_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
      VERCEL: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  vercelProcess.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
  vercelProcess.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });
  await waitForServer(url).catch((error) => {
    throw new Error(`${error.message}\n${serverOutput}`);
  });

  const response = await fetch(`${url}/api/index?__api_path=admin/session`);
  assert.equal(response.status, 401);
});

test('broadcast Supabase hanya mengirim sinyal tanpa isi laporan', async () => {
  const realtimeEvents = [];
  realtimeServer = createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      realtimeEvents.push({
        method: req.method,
        path: req.url,
        apiKey: req.headers.apikey,
        body: Buffer.concat(chunks).toString(),
      });
      res.writeHead(200).end();
    });
  });
  await new Promise((resolve, reject) => realtimeServer.once('error', reject).listen(0, '127.0.0.1', resolve));
  const realtimePort = realtimeServer.address().port;

  const port = await findFreePort();
  const url = `http://127.0.0.1:${port}`;
  realtimeProcess = spawn(process.execPath, [path.join(__dirname, '../server/index.cjs')], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      ADMIN_EMAIL: 'admin@example.test',
      ADMIN_PASSWORD: 'Password-Uji-Portal-2026!',
      JWT_SECRET: 'test-secret-portal-k3-integration-32-characters',
      DATABASE_URL: '',
      DATABASE_PATH: path.join(tempDir, 'realtime.sqlite'),
      SUPABASE_URL: `http://127.0.0.1:${realtimePort}`,
      SUPABASE_SECRET_KEY: 'test-only-realtime-key',
      SUPABASE_SERVICE_ROLE_KEY: '',
      VERCEL: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  realtimeProcess.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
  realtimeProcess.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });
  await waitForServer(url).catch((error) => {
    throw new Error(`${error.message}\n${serverOutput}`);
  });

  const submission = await fetch(`${url}/api/reports`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      reporter: 'Pelapor uji',
      category: 'Kondisi tidak aman',
      incidentDate: new Date().toISOString().slice(0, 10),
      location: 'Lokasi rahasia uji',
      description: 'Keterangan sensitif tidak boleh ikut terkirim.',
      initialAction: 'Tindakan awal rahasia.',
    }),
  });
  assert.equal(submission.status, 201);
  assert.equal((await submission.json()).realtimeNotified, true);
  assert.equal(realtimeEvents.length, 1);
  assert.deepEqual(realtimeEvents[0], {
    method: 'POST',
    path: '/realtime/v1/api/broadcast/portal-updates/events/reports_changed',
    apiKey: 'test-only-realtime-key',
    body: '{}',
  });
});
