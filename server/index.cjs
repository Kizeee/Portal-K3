require('dotenv').config();

const path = require('node:path');
const express = require('express');
const { createServer } = require('node:http');
const app = require('./app.cjs');
const db = require('./database.cjs');

const PORT = Number(process.env.PORT || 3000);
const httpServer = createServer(app);

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
