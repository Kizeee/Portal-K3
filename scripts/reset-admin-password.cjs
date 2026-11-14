require('dotenv').config();

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL belum diatur. Isi connection string Supabase di .env.');
  }
  if (!email || !password || password.length < 12) {
    throw new Error('Atur ADMIN_EMAIL dan ADMIN_PASSWORD baru minimal 12 karakter di .env.');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
    application_name: 'portal-k3-admin-password-reset',
  });
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'UPDATE public.admins SET password_hash = $1 WHERE email = $2 RETURNING id',
      [passwordHash, email],
    );
    if (result.rowCount !== 1) {
      throw new Error('Akun admin tidak ditemukan. Pastikan migrasi akun selesai dan ADMIN_EMAIL benar.');
    }
    console.info('Password admin Supabase berhasil diganti.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Penggantian password admin gagal:', error.message);
  process.exitCode = 1;
});
