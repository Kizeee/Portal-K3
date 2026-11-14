const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const schemaPath = path.resolve(__dirname, '../supabase/schema.sql');
let pool;
let sqlite;
let provider;

const sqliteSchema = `
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY,
    tracking_hash TEXT NOT NULL UNIQUE,
    reporter TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    incident_date TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    initial_action TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Baru',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS status_updates (
    id INTEGER PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    changed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports(created_at DESC);
  CREATE INDEX IF NOT EXISTS status_updates_report_id_idx ON status_updates(report_id, id);
`;

function assertInitialized() {
  if (!provider) throw new Error('Database belum berhasil diinisialisasi.');
}

async function initialize() {
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    provider = 'postgres';
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX || 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      application_name: 'portal-k3',
    });
    pool.on('error', (error) => {
      console.error('Kesalahan koneksi Supabase PostgreSQL:', error);
    });
    await pool.query(fs.readFileSync(schemaPath, 'utf8'));
    await pool.query('SELECT 1');
  } else {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL wajib diatur di production. Gunakan connection string PostgreSQL Supabase.');
    }
    const Database = require('better-sqlite3');
    const databasePath = path.resolve(process.env.DATABASE_PATH || './data/portal-k3.sqlite');
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    sqlite = new Database(databasePath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(sqliteSchema);
    provider = 'sqlite';
  }

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    if (process.env.ADMIN_PASSWORD.length < 12) {
      throw new Error('ADMIN_PASSWORD harus memiliki minimal 12 karakter.');
    }
    await createAdminIfMissing(process.env.ADMIN_EMAIL.trim().toLowerCase(), process.env.ADMIN_PASSWORD);
  } else {
    console.warn('Akun admin belum tersedia. Isi ADMIN_EMAIL dan ADMIN_PASSWORD di environment.');
  }
}

async function createAdminIfMissing(email, password) {
  const existing = await findAdminByEmail(email);
  if (existing) return;
  const passwordHash = await bcrypt.hash(password, 12);
  assertInitialized();
  if (provider === 'postgres') {
    await pool.query('INSERT INTO public.admins (email, password_hash) VALUES ($1, $2)', [email, passwordHash]);
  } else {
    sqlite.prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)').run(email, passwordHash);
  }
  console.info('Admin awal berhasil dibuat.');
}

async function findAdminByEmail(email) {
  assertInitialized();
  if (provider === 'postgres') {
    const result = await pool.query(
      'SELECT id, email, password_hash FROM public.admins WHERE email = $1',
      [email],
    );
    return result.rows[0] || null;
  }
  return sqlite.prepare('SELECT id, email, password_hash FROM admins WHERE email = ?').get(email) || null;
}

async function createReport(values, trackingHash) {
  assertInitialized();
  if (provider === 'postgres') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(`
        INSERT INTO public.reports
          (tracking_hash, reporter, category, incident_date, location, description, initial_action)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        trackingHash,
        values.reporter,
        values.category,
        values.incidentDate,
        values.location,
        values.description,
        values.initialAction,
      ]);
      const report = inserted.rows[0];
      await client.query(
        'INSERT INTO public.status_updates (report_id, status, note) VALUES ($1, $2, $3)',
        [report.id, 'Baru', 'Laporan diterima.'],
      );
      await client.query('COMMIT');
      return report;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  const create = sqlite.transaction(() => {
    const inserted = sqlite.prepare(`
      INSERT INTO reports
        (tracking_hash, reporter, category, incident_date, location, description, initial_action)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      trackingHash,
      values.reporter,
      values.category,
      values.incidentDate,
      values.location,
      values.description,
      values.initialAction,
    );
    sqlite.prepare('INSERT INTO status_updates (report_id, status, note) VALUES (?, ?, ?)')
      .run(inserted.lastInsertRowid, 'Baru', 'Laporan diterima.');
    return sqlite.prepare('SELECT * FROM reports WHERE id = ?').get(inserted.lastInsertRowid);
  });
  return create();
}

async function findReportByTrackingHash(trackingHash) {
  assertInitialized();
  if (provider === 'postgres') {
    const result = await pool.query(
      'SELECT id, tracking_hash, status, created_at, updated_at FROM public.reports WHERE tracking_hash = $1',
      [trackingHash],
    );
    return result.rows[0] || null;
  }
  return sqlite.prepare(
    'SELECT id, tracking_hash, status, created_at, updated_at FROM reports WHERE tracking_hash = ?',
  ).get(trackingHash) || null;
}

async function listStatusUpdates(reportId) {
  assertInitialized();
  if (provider === 'postgres') {
    const result = await pool.query(`
      SELECT status, note, changed_at AS "changedAt"
      FROM public.status_updates WHERE report_id = $1 ORDER BY id ASC
    `, [reportId]);
    return result.rows;
  }
  return sqlite.prepare(`
    SELECT status, note, changed_at AS changedAt
    FROM status_updates WHERE report_id = ? ORDER BY id ASC
  `).all(reportId);
}

async function listReports() {
  assertInitialized();
  if (provider === 'postgres') {
    const result = await pool.query('SELECT * FROM public.reports ORDER BY created_at DESC, id DESC');
    return result.rows;
  }
  return sqlite.prepare('SELECT * FROM reports ORDER BY created_at DESC, id DESC').all();
}

async function findReportById(id) {
  assertInitialized();
  if (provider === 'postgres') {
    const result = await pool.query('SELECT * FROM public.reports WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
  return sqlite.prepare('SELECT * FROM reports WHERE id = ?').get(id) || null;
}

async function updateReportStatus(id, status, note, updatedAt) {
  assertInitialized();
  const statusNote = note || `Status laporan diperbarui menjadi ${status}.`;
  if (provider === 'postgres') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE public.reports SET status = $1, updated_at = $2 WHERE id = $3',
        [status, updatedAt, id],
      );
      await client.query(
        'INSERT INTO public.status_updates (report_id, status, note, changed_at) VALUES ($1, $2, $3, $4)',
        [id, status, statusNote, updatedAt],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    const update = sqlite.transaction(() => {
      sqlite.prepare('UPDATE reports SET status = ?, updated_at = ? WHERE id = ?').run(status, updatedAt, id);
      sqlite.prepare(
        'INSERT INTO status_updates (report_id, status, note, changed_at) VALUES (?, ?, ?, ?)',
      ).run(id, status, statusNote, updatedAt);
    });
    update();
  }
  return findReportById(id);
}

async function close() {
  if (pool) await pool.end();
  if (sqlite) sqlite.close();
}

module.exports = {
  close,
  createReport,
  findAdminByEmail,
  findReportById,
  findReportByTrackingHash,
  initialize,
  listReports,
  listStatusUpdates,
  updateReportStatus,
};
