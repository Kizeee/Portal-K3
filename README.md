# Portal K3 Universitas Lancang Kuning

Aplikasi portal K3 menggunakan Vue, API Express, Supabase PostgreSQL, dashboard admin, dan notifikasi real-time. SQLite tetap digunakan otomatis untuk pengembangan lokal apabila `DATABASE_URL` tidak diatur.

## Fitur

- Formulir pengaduan publik tanpa akun/login.
- Kode pelacakan acak yang diberikan setelah pengaduan berhasil disimpan. Kode diperlukan untuk melihat status dan sebaiknya disimpan oleh pelapor.
- Dashboard admin untuk mencari laporan, memfilter status, dan mencatat tindak lanjut.
- Riwayat dan perubahan status tersimpan di Supabase PostgreSQL ketika `DATABASE_URL` dikonfigurasi.
- Socket.IO mengirim pemberitahuan laporan baru ke dashboard admin dan perubahan status ke pelapor yang sedang membuka halaman pelacakan.
- Login admin menggunakan cookie HttpOnly dan batas percobaan masuk.
- Empat video K3 dari YouTube serta denah evakuasi Gedung Rektorat per lantai dengan PDF dan pencarian ruangan.

## Persiapan

1. Gunakan Node.js 20 atau lebih baru.
2. Pasang dependensi: `npm install`.
3. Salin `.env.example` menjadi `.env`. Untuk Supabase, isi `DATABASE_URL` dengan connection string PostgreSQL yang diambil dari Supabase Dashboard → **Project Settings → Database** → **Connection string**. Untuk deployment serverless, pilih connection string pooler yang direkomendasikan Supabase. Jangan pernah menggunakan connection string atau password database sebagai variabel frontend `VITE_*`.
4. Isi `ADMIN_EMAIL`, `ADMIN_PASSWORD` (minimal 12 karakter), dan `JWT_SECRET` (acak, minimal 32 karakter).
5. Jalankan aplikasi lokal: `npm run dev`.
6. Buka URL Vite yang ditampilkan di terminal. Halaman admin tersedia di `/admin`.

Jika `DATABASE_URL` kosong, server lokal menggunakan `data/portal-k3.sqlite`. File SQLite yang sudah ada tidak dihapus atau diubah oleh aplikasi.

## Menyiapkan database Supabase

1. Buat proyek Supabase dan simpan password database dengan aman.
2. Buka **SQL Editor** pada proyek tersebut dan jalankan seluruh isi `supabase/schema.sql`. Server juga menerapkan skema yang sama ketika koneksi pertama berhasil.
3. Salin connection string PostgreSQL ke `DATABASE_URL` di `.env` lokal atau ke Environment Variables pada layanan hosting. URL tersebut rahasia dan hanya boleh digunakan oleh backend.
4. Saat aplikasi pertama kali berjalan, akun admin dibuat dari `ADMIN_EMAIL` dan `ADMIN_PASSWORD` jika email tersebut belum ada di database. Mengganti environment variable password setelah akun dibuat tidak mengubah hash password yang tersimpan.
5. Untuk mengganti password akun admin yang sudah tersimpan, atur `ADMIN_EMAIL` dan password baru pada `ADMIN_PASSWORD`, lalu jalankan `npm run admin:reset-password`. Perintah ini memperbarui hash di Supabase tanpa menampilkan password.

Tabel memiliki Row Level Security (RLS) dan tidak memberi akses tabel kepada peran `anon` atau `authenticated`. Backend memakai connection string PostgreSQL privat; jangan letakkan `DATABASE_URL` pada kode browser. Jangan membagikan Supabase service-role key atau password database.

## Memindahkan data SQLite lama

Skrip migrasi menyalin akun admin, laporan, dan seluruh riwayat status ke Supabase. Skrip tidak menghapus atau mengubah SQLite sumber. Hentikan server aplikasi terlebih dahulu dan buat salinan cadangan database sebelum menjalankannya:

1. Atur `DATABASE_URL` dan `DATABASE_PATH` pada `.env`.
2. Pastikan skema `supabase/schema.sql` telah dibuat. Skrip migrasi juga menerapkannya secara aman.
3. Jalankan `npm run db:migrate:sqlite`.

Untuk menghindari data tertimpa/duplikat, migrasi dibatalkan bila Supabase sudah berisi laporan. Bila email admin yang sama sudah ada di Supabase, password admin Supabase yang sudah ada dipertahankan. Verifikasi jumlah laporan serta riwayat sebelum memindahkan aplikasi ke database baru.

Jika password admin pernah dibagikan atau terlihat di tangkapan layar, ganti dengan password baru dan jalankan `npm run admin:reset-password` setelah akun berada di Supabase. Jika `JWT_SECRET` pernah terekspos, ganti juga nilainya pada environment backend; semua sesi admin lama akan tidak berlaku.

## Build dan deployment

```sh
npm run build
npm start
```

Production wajib memiliki `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD`; server akan menolak berjalan tanpa database PostgreSQL. Gunakan HTTPS dan lakukan backup database sesuai kebutuhan.

Migrasi ini hanya mengganti penyimpanan database. Aplikasi masih memakai Express server dan Socket.IO; untuk hosting Vercel, API dan notifikasi real-time masih perlu diadaptasi terpisah ke model Functions/Realtimes Vercel.

## Endpoint utama

- `POST /api/reports` — kirim laporan publik dan terima kode pelacakan.
- `GET /api/reports/track/:code` — lihat status serta riwayat menggunakan kode pelacakan.
- `POST /api/admin/login` — login admin.
- `GET /api/admin/reports` — daftar laporan (admin).
- `PATCH /api/admin/reports/:id/status` — ubah status dan catatan yang ditampilkan kepada pelapor (admin).
- Socket.IO `report:new` dan `report:updated` untuk admin; `report:status` untuk pelapor yang bergabung ke kanal menggunakan kode pelacakan.

Status yang tersedia: `Baru`, `Ditinjau`, `Ditindaklanjuti`, dan `Selesai`.

## Catatan operasional

Formulir ini bukan kanal darurat. Denah dan PDF evakuasi bersumber dari berkas referensi yang disediakan untuk aplikasi; validasikan versi, jalur, titik kumpul, dan informasi keselamatan dengan pengelola kampus sebelum digunakan sebagai panduan operasional. Video dimuat melalui embed YouTube. Untuk penerapan internet publik, tempatkan aplikasi di belakang HTTPS, siapkan backup dan pemantauan, serta koordinasikan kebijakan privasi dan penanganan laporan dengan pengelola kampus.
