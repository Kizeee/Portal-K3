require('dotenv').config();

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const db = require('./database.cjs');
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET wajib dikonfigurasi untuk menjalankan aplikasi di production.');
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'portal_k3_admin';
const STATUSES = ['Baru', 'Ditinjau', 'Ditindaklanjuti', 'Selesai'];
const CATEGORIES = [
  'Kondisi tidak aman',
  'Tindakan tidak aman',
  'Near miss (nyaris celaka)',
  'Insiden / kecelakaan',
  'Kebakaran / keadaan darurat',
  'Laboratorium / bahan kimia',
  'Kebersihan / kesehatan lingkungan',
  'Lainnya',
];

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      frameSrc: ["'self'", 'https://www.youtube-nocookie.com'],
    },
  },
}));
app.use(express.json({ limit: '20kb' }));

function hashTrackingCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function getAdminFromToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function adminAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME] || cookie.parse(req.headers.cookie || '')[COOKIE_NAME];
  const admin = token ? getAdminFromToken(token) : null;
  if (!admin || admin.role !== 'admin') {
    return res.status(401).json({ error: 'Silakan masuk sebagai admin terlebih dahulu.' });
  }
  req.admin = admin;
  next();
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' },
});

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Batas pengiriman laporan tercapai. Coba lagi beberapa saat.' },
});

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const admin = await db.findAdminByEmail(email);
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' });
  }

  const token = jwt.sign({ sub: admin.id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  });
  res.json({ admin: { email: admin.email } });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  res.status(204).end();
});

app.get('/api/admin/session', adminAuth, (req, res) => {
  res.json({ admin: { email: req.admin.email } });
});

app.post('/api/reports', reportLimiter, async (req, res) => {
  const body = req.body || {};
  const values = {
    reporter: typeof body.reporter === 'string' ? body.reporter.trim() : '',
    category: typeof body.category === 'string' ? body.category : '',
    incidentDate: typeof body.incidentDate === 'string' ? body.incidentDate : '',
    location: typeof body.location === 'string' ? body.location.trim() : '',
    description: typeof body.description === 'string' ? body.description.trim() : '',
    initialAction: typeof body.initialAction === 'string' ? body.initialAction.trim() : '',
  };
  const incidentDate = new Date(`${values.incidentDate}T00:00:00Z`);
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);

  if (!CATEGORIES.includes(values.category)) {
    return res.status(400).json({ error: 'Pilih kategori laporan yang tersedia.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.incidentDate) || Number.isNaN(incidentDate.getTime()) || incidentDate > today) {
    return res.status(400).json({ error: 'Tanggal kejadian tidak valid.' });
  }
  if (values.reporter.length > 100 || values.location.length < 3 || values.location.length > 180 ||
      values.description.length < 10 || values.description.length > 2000 || values.initialAction.length > 1000) {
    return res.status(400).json({ error: 'Periksa kembali panjang dan kelengkapan data laporan.' });
  }

  const trackingCode = crypto.randomBytes(24).toString('base64url').toUpperCase();
  const trackingHash = hashTrackingCode(trackingCode);
  const report = await db.createReport(values, trackingHash);
  io.to('admins').emit('report:new', { report: publicAdminReport(report) });
  res.status(201).json({
    trackingCode,
    report: { status: report.status, createdAt: report.created_at },
  });
});

function publicAdminReport(report) {
  return {
    id: report.id,
    reporter: report.reporter,
    category: report.category,
    incidentDate: report.incident_date,
    location: report.location,
    description: report.description,
    initialAction: report.initial_action,
    status: report.status,
    createdAt: report.created_at,
    updatedAt: report.updated_at,
  };
}

app.get('/api/reports/track/:code', async (req, res) => {
  const code = typeof req.params.code === 'string' ? req.params.code.trim().toUpperCase() : '';
  if (!/^[A-Z0-9_-]{30,40}$/.test(code)) {
    return res.status(404).json({ error: 'Kode pelacakan tidak ditemukan.' });
  }
  const report = await db.findReportByTrackingHash(hashTrackingCode(code));
  if (!report) {
    return res.status(404).json({ error: 'Kode pelacakan tidak ditemukan.' });
  }
  const updates = await db.listStatusUpdates(report.id);
  res.json({
    status: report.status,
    createdAt: report.created_at,
    updatedAt: report.updated_at,
    updates,
  });
});

app.get('/api/admin/reports', adminAuth, async (req, res) => {
  const reports = await db.listReports();
  res.json({ reports: reports.map(publicAdminReport) });
});

app.patch('/api/admin/reports/:id/status', adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const status = typeof req.body?.status === 'string' ? req.body.status : '';
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
  if (!Number.isSafeInteger(id) || id < 1 || !STATUSES.includes(status) || note.length > 500) {
    return res.status(400).json({ error: 'Status atau catatan tindak lanjut tidak valid.' });
  }
  const report = await db.findReportById(id);
  if (!report) {
    return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
  }

  const updatedAt = new Date().toISOString();
  const updatedReport = await db.updateReportStatus(id, status, note, updatedAt);
  const notification = {
    status,
    note: note || `Status laporan diperbarui menjadi ${status}.`,
    updatedAt,
  };
  io.to(`report:${report.tracking_hash}`).emit('report:status', notification);
  io.to('admins').emit('report:updated', { report: publicAdminReport(updatedReport) });
  res.json({ report: publicAdminReport(updatedReport) });
});

io.on('connection', (socket) => {
  const parsedCookies = cookie.parse(socket.handshake.headers.cookie || '');
  const admin = parsedCookies[COOKIE_NAME] ? getAdminFromToken(parsedCookies[COOKIE_NAME]) : null;
  if (admin?.role === 'admin') {
    socket.data.isAdmin = true;
    socket.join('admins');
  }

  socket.on('report:subscribe', async ({ trackingCode } = {}) => {
    if (typeof trackingCode !== 'string' || !/^[A-Z0-9_-]{30,40}$/i.test(trackingCode.trim())) return;
    const trackingHash = hashTrackingCode(trackingCode.trim().toUpperCase());
    const report = await db.findReportByTrackingHash(trackingHash);
    if (report) socket.join(`report:${trackingHash}`);
    else socket.emit('report:error', { error: 'Kode pelacakan tidak ditemukan.' });
  });
});

app.use((error, req, res, next) => {
  console.error('Kesalahan API:', error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'Terjadi kesalahan pada server. Silakan coba kembali.' });
});

if (process.env.NODE_ENV === 'production') {
  const clientPath = path.resolve(__dirname, '../dist');
  app.use(express.static(clientPath));
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

async function start() {
  await db.initialize();
  httpServer.listen(PORT, () => {
    console.info(`Portal K3 berjalan di http://localhost:${PORT} (database: ${process.env.DATABASE_URL ? 'Supabase PostgreSQL' : 'SQLite lokal'})`);
  });
}

start().catch((error) => {
  console.error('Gagal menginisialisasi aplikasi:', error);
  db.close()
    .catch((closeError) => console.error('Gagal menutup koneksi database:', closeError))
    .finally(() => {
      process.exitCode = 1;
    });
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    httpServer.close(async () => {
      try {
        await db.close();
        process.exit(0);
      } catch (error) {
        console.error('Gagal menutup koneksi database:', error);
        process.exit(1);
      }
    });
  });
}
