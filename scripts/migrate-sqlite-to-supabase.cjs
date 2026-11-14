require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL belum diatur. Isi dengan connection string Supabase di .env.');
  }

  const sourcePath = path.resolve(process.env.DATABASE_PATH || './data/portal-k3.sqlite');
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Database SQLite sumber tidak ditemukan: ${sourcePath}`);
  }

  const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
    application_name: 'portal-k3-migration',
  });

  try {
    const admins = source.prepare('SELECT id, email, password_hash, created_at FROM admins ORDER BY id').all();
    const reports = source.prepare('SELECT * FROM reports ORDER BY id').all();
    const updates = source.prepare('SELECT * FROM status_updates ORDER BY id').all();

    await pool.query(fs.readFileSync(path.resolve(__dirname, '../supabase/schema.sql'), 'utf8'));
    const existing = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM public.reports) AS reports,
        (SELECT COUNT(*) FROM public.status_updates) AS status_updates
    `);
    if (Number(existing.rows[0].reports) > 0 || Number(existing.rows[0].status_updates) > 0) {
      throw new Error('Supabase sudah berisi laporan. Migrasi dibatalkan agar data yang ada tidak tertimpa.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const admin of admins) {
        await client.query(`
          INSERT INTO public.admins (id, email, password_hash, created_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (email) DO NOTHING
        `, [admin.id, admin.email, admin.password_hash, admin.created_at]);
      }

      for (const report of reports) {
        await client.query(`
          INSERT INTO public.reports
            (id, tracking_hash, reporter, category, incident_date, location, description,
             initial_action, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          report.id,
          report.tracking_hash,
          report.reporter,
          report.category,
          report.incident_date,
          report.location,
          report.description,
          report.initial_action,
          report.status,
          report.created_at,
          report.updated_at,
        ]);
      }

      for (const update of updates) {
        await client.query(`
          INSERT INTO public.status_updates (id, report_id, status, note, changed_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [update.id, update.report_id, update.status, update.note, update.changed_at]);
      }

      for (const table of ['admins', 'reports', 'status_updates']) {
        await client.query(`
          SELECT setval(
            pg_get_serial_sequence('public.${table}', 'id'),
            COALESCE((SELECT MAX(id) FROM public.${table}), 1),
            EXISTS (SELECT 1 FROM public.${table})
          )
        `);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    console.info(`Migrasi berhasil: ${admins.length} akun admin, ${reports.length} laporan, ${updates.length} pembaruan status.`);
    console.info('Database SQLite sumber tidak dihapus.');
  } finally {
    source.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Migrasi SQLite ke Supabase gagal:', error.message);
  process.exitCode = 1;
});
