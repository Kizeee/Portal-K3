# Portal K3 Universitas Lancang Kuning

Aplikasi Portal K3 menggunakan Vue, API Express, Supabase PostgreSQL, dashboard admin, dan notifikasi Supabase Realtime. SQLite tetap digunakan otomatis untuk pengembangan lokal apabila `DATABASE_URL` tidak diatur.

## Fitur

- Formulir pengaduan publik tanpa akun/login.
- Tanggal kejadian dan batas tanggal memakai zona waktu kampus Asia/Jakarta.
- Kode pelacakan acak yang diberikan setelah pengaduan berhasil disimpan. Kode diperlukan untuk melihat status dan sebaiknya disimpan oleh pelapor.
- Dashboard admin untuk mencari laporan, memfilter status, dan mencatat tindak lanjut.
- Riwayat dan perubahan status tersimpan di Supabase PostgreSQL ketika `DATABASE_URL` dikonfigurasi.
- Supabase Realtime mengirim sinyal pembaruan tanpa isi laporan; data tetap dimuat melalui API yang dilindungi autentikasi admin atau kode pelacakan.
- Jika Realtime belum tersedia, halaman admin dan pelacakan beralih ke pemeriksaan berkala.
- Login admin menggunakan cookie HttpOnly dan batas percobaan masuk.
- Empat video K3 dari YouTube serta denah evakuasi Gedung Rektorat per lantai dengan PDF dan pencarian ruangan.

## Persiapan

1. Gunakan Node.js 20 atau lebih baru.
2. Pasang dependensi: `npm install`.
3. Salin `.env.example` menjadi `.env`. Isi `DATABASE_URL` dengan connection string PostgreSQL dari Supabase Dashboard → **Project Settings → Database** → **Connection string**. Untuk deployment serverless, gunakan connection string pooler Supabase. Jangan pernah menaruh connection string, password database, atau secret key pada variabel `VITE_*`.
4. Isi `ADMIN_EMAIL`, `ADMIN_PASSWORD` (minimal 12 karakter), dan `JWT_SECRET` (acak, minimal 32 karakter). Untuk Realtime, isi `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `VITE_SUPABASE_URL`, dan `VITE_SUPABASE_PUBLISHABLE_KEY`.
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

### Deployment ke Vercel

Vercel menjalankan API Express sebagai Function; tidak diperlukan server yang berjalan terus-menerus. Socket.IO sudah diganti Supabase Realtime. Database tetap berada di Supabase.

1. Impor repository Git ke Vercel. Konfigurasi `vercel.json` membangun Vite, meneruskan semua `/api/*` ke satu Function, dan mengarahkan halaman SPA seperti `/admin` ke `index.html`.
2. Tambahkan environment variables berikut pada Vercel:
   - `DATABASE_URL` — connection string pooler PostgreSQL Supabase.
   - `JWT_SECRET`, `ADMIN_EMAIL`, dan `ADMIN_PASSWORD`.
   - `SUPABASE_URL` dan `SUPABASE_SECRET_KEY` — hanya untuk Function/server.
   - `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` — dipakai browser; publishable key memang boleh dipublikasikan, secret key tidak.
   - `DB_POOL_MAX=1` — disarankan untuk membatasi koneksi database per Function.
3. Pastikan Realtime aktif dan akses kanal publik diizinkan pada proyek Supabase, lalu deploy ulang setelah semua variabel diatur. Variabel `VITE_*` dibaca saat proses build.
4. Uji halaman `/`, `/admin`, login admin, pengiriman laporan, pelacakan kode, dan perubahan status.

Kanal Realtime `portal-updates` bersifat publik dan hanya membawa event kosong `reports_changed`—tidak membawa isi, identitas, kode pelacakan, atau status laporan. Namun, pihak luar dapat melihat waktu terjadinya pembaruan. Data laporan hanya dikirim melalui API yang dilindungi. Halaman admin dan pelacakan juga memeriksa pembaruan setiap 15 detik untuk mengantisipasi sinyal yang terlewat; notifikasi perubahan tetap muncul bila pembaruan diketahui melalui polling.

Untuk menjalankan server Express biasa, gunakan `npm start`; server tersebut tetap melayani `dist` pada production. Gunakan HTTPS dan lakukan backup database sesuai kebutuhan.

## Endpoint utama

- `POST /api/reports` — kirim laporan publik dan terima kode pelacakan.
- `GET /api/reports/track/:code` — lihat status serta riwayat menggunakan kode pelacakan.
- `POST /api/admin/login` — login admin.
- `GET /api/admin/reports` — daftar laporan (admin).
- `PATCH /api/admin/reports/:id/status` — ubah status dan catatan yang ditampilkan kepada pelapor (admin).
- Supabase Realtime `portal-updates` / `reports_changed` hanya memberi sinyal bahwa data berubah; klien mengambil data terkini dari endpoint API terkait.

Status yang tersedia: `Baru`, `Ditinjau`, `Ditindaklanjuti`, dan `Selesai`.

## Catatan operasional

Formulir ini bukan kanal darurat. Denah dan PDF evakuasi bersumber dari berkas referensi yang disediakan untuk aplikasi; validasikan versi, jalur, titik kumpul, dan informasi keselamatan dengan pengelola kampus sebelum digunakan sebagai panduan operasional. Video dimuat melalui embed YouTube. Untuk penerapan internet publik, tempatkan aplikasi di belakang HTTPS, siapkan backup dan pemantauan, serta koordinasikan kebijakan privasi dan penanganan laporan dengan pengelola kampus.
