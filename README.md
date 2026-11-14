# Portal K3 Universitas Lancang Kuning

Aplikasi ini memigrasikan portal K3 berbasis HTML statis menjadi aplikasi Vue dengan API Express, database SQLite, dashboard admin, dan notifikasi real-time.

## Fitur

- Formulir pengaduan publik tanpa akun/login.
- Kode pelacakan acak yang diberikan setelah pengaduan berhasil disimpan. Kode diperlukan untuk melihat status dan sebaiknya disimpan oleh pelapor.
- Dashboard admin untuk mencari laporan, memfilter status, dan mencatat tindak lanjut.
- Riwayat dan perubahan status tersimpan di SQLite.
- Socket.IO mengirim pemberitahuan laporan baru ke dashboard admin dan perubahan status ke pelapor yang sedang membuka halaman pelacakan.
- Login admin menggunakan cookie HttpOnly dan batas percobaan masuk.

## Persiapan

1. Gunakan Node.js 20 atau lebih baru.
2. Pasang dependensi: `npm install`.
3. Salin `.env.example` menjadi `.env`, lalu isi `ADMIN_EMAIL`, `ADMIN_PASSWORD` (minimal 12 karakter), dan `JWT_SECRET` (rangkaian acak panjang, minimal 32 karakter).
4. Jalankan aplikasi lokal: `npm run dev`.
5. Buka URL Vite yang ditampilkan di terminal. Halaman admin tersedia di `/admin`.

Database lokal akan dibuat di `data/portal-k3.sqlite`. Ubah `DATABASE_PATH` jika diperlukan. Akun admin pertama dibuat dari variabel `ADMIN_EMAIL` dan `ADMIN_PASSWORD` saat server pertama kali berjalan. Mengubah variabel tersebut setelah akun tercipta tidak mengubah kata sandi yang tersimpan di database.

## Build dan production

```sh
npm run build
npm start
```

Set `NODE_ENV=production`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, dan `DATABASE_PATH` pada environment server. Gunakan HTTPS di production agar cookie admin ditandai `Secure`, batasi akses ke berkas database, dan siapkan backup SQLite secara berkala. Tidak ada kredensial admin default.

## Endpoint utama

- `POST /api/reports` — kirim laporan publik dan terima kode pelacakan.
- `GET /api/reports/track/:code` — lihat status serta riwayat menggunakan kode pelacakan.
- `POST /api/admin/login` — login admin.
- `GET /api/admin/reports` — daftar laporan (admin).
- `PATCH /api/admin/reports/:id/status` — ubah status dan catatan yang ditampilkan kepada pelapor (admin).
- Socket.IO `report:new` dan `report:updated` untuk admin; `report:status` untuk pelapor yang bergabung ke kanal menggunakan kode pelacakan.

Status yang tersedia: `Baru`, `Ditinjau`, `Ditindaklanjuti`, dan `Selesai`.

## Catatan operasional

Formulir ini bukan kanal darurat. Denah evakuasi pada halaman adalah ilustrasi edukatif, bukan denah resmi kampus; validasikan konten keselamatan dan kontak darurat sebelum publikasi. Untuk penerapan internet publik, tempatkan aplikasi di belakang HTTPS, siapkan backup dan pemantauan, serta koordinasikan kebijakan privasi dan penanganan laporan dengan pengelola kampus.
