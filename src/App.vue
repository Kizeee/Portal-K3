<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { io } from 'socket.io-client';

const isAdminPage = window.location.pathname.startsWith('/admin');
const categories = [
  'Kondisi tidak aman',
  'Tindakan tidak aman',
  'Near miss (nyaris celaka)',
  'Insiden / kecelakaan',
  'Kebakaran / keadaan darurat',
  'Laboratorium / bahan kimia',
  'Kebersihan / kesehatan lingkungan',
  'Lainnya',
];
const statuses = ['Baru', 'Ditinjau', 'Ditindaklanjuti', 'Selesai'];
const articles = [
  {
    icon: '🧯',
    category: 'Darurat',
    title: 'Langkah awal saat terjadi kebakaran',
    description: 'Kenali alarm, pilih jalur keluar aman, dan jangan mengambil risiko untuk menyelamatkan barang.',
    keywords: 'kebakaran evakuasi apar alarm',
    details: [
      'Prioritas utama adalah menyelamatkan jiwa, bukan barang.',
      'Aktifkan alarm atau beri peringatan jika aman dilakukan.',
      'Segera keluar melalui jalur evakuasi yang aman; jangan gunakan lift.',
      'APAR hanya digunakan oleh orang terlatih bila api masih kecil dan jalur keluar tetap aman.',
      'Jangan kembali ke gedung sampai pihak berwenang menyatakan aman.',
    ],
  },
  {
    icon: '🧪',
    category: 'Laboratorium',
    title: 'Praktikum aman dan penggunaan bahan kimia',
    description: 'Pahami SOP, label bahaya, SDS, serta APD yang sesuai sebelum bekerja.',
    keywords: 'laboratorium bahan kimia sds apd sop',
    details: [
      'Baca SOP, label, dan Safety Data Sheet (SDS) sebelum memakai bahan.',
      'Gunakan APD yang ditetapkan berdasarkan bahaya dan penilaian risiko.',
      'Pastikan ventilasi, alat pelindung, dan peralatan darurat berfungsi.',
      'Jangan mencampur bahan tanpa instruksi dan laporkan tumpahan kepada penanggung jawab.',
    ],
  },
  {
    icon: '💻',
    category: 'Ergonomi',
    title: 'Ergonomi saat belajar di depan laptop',
    description: 'Atur posisi layar, dukungan punggung, pencahayaan, dan jeda aktivitas.',
    keywords: 'ergonomi duduk laptop postur istirahat',
    details: [
      'Posisikan layar di depan tubuh dan kurangi tekukan leher.',
      'Dukung punggung, letakkan kaki stabil, dan jaga bahu rileks.',
      'Atur pencahayaan untuk mengurangi silau.',
      'Ambil jeda gerak berkala dan hindari duduk statis terlalu lama.',
    ],
  },
  {
    icon: '⚠️',
    category: 'Lingkungan',
    title: 'Mencegah terpeleset, tersandung, dan terjatuh',
    description: 'Jaga jalur berjalan, tandai tumpahan, rapikan kabel, dan laporkan kerusakan.',
    keywords: 'terpeleset lantai licin kabel tersandung',
    details: [
      'Tandai tumpahan dan laporkan agar dapat dibersihkan dengan aman.',
      'Jangan menutup jalur keluar dengan barang, kabel, atau peralatan.',
      'Gunakan pegangan saat naik-turun tangga dan jangan berlari.',
      'Laporkan ubin rusak, pencahayaan buruk, permukaan licin, dan pegangan longgar.',
    ],
  },
  {
    icon: '🏢',
    category: 'Darurat',
    title: 'Kesiapsiagaan menghadapi gempa bumi',
    description: 'Kenali area perlindungan, lindungi kepala, dan ikuti arahan petugas.',
    keywords: 'gempa bumi berlindung evakuasi',
    details: [
      'Saat guncangan terjadi, merunduk, berlindung di bawah meja kokoh jika tersedia, dan berpegangan.',
      'Lindungi kepala dan leher; jauhi kaca serta benda yang berpotensi jatuh.',
      'Jangan berlari menuju tangga saat bangunan masih berguncang.',
      'Setelah guncangan berhenti, evakuasi dengan tertib sesuai instruksi.',
    ],
  },
  {
    icon: '📝',
    category: 'Lingkungan',
    title: 'Mengapa near miss perlu dilaporkan?',
    description: 'Kejadian nyaris celaka dapat mengungkap risiko sebelum ada korban atau kerusakan.',
    keywords: 'near miss pelaporan bahaya insiden pencegahan',
    details: [
      'Laporkan fakta, lokasi, waktu, dan kondisi yang ditemukan.',
      'Fokus pada faktor penyebab dan pengendalian risiko, bukan menyalahkan individu.',
      'Informasi laporan membantu mencegah kejadian serupa.',
      'Jangan menganggap kejadian aman hanya karena tidak ada korban.',
    ],
  },
];

const reportForm = ref({
  reporter: '',
  category: '',
  incidentDate: localDate(),
  location: '',
  description: '',
  initialAction: '',
});
const submittingReport = ref(false);
const submittedCode = ref('');
const trackCodeInput = ref('');
const trackedCode = ref('');
const trackedReport = ref(null);
const tracking = ref(false);
const trackingError = ref('');
const searchQuery = ref('');
const articleFilter = ref('Semua kategori');
const selectedArticle = ref(null);
const notification = ref('');
const loginForm = ref({ email: '', password: '' });
const loginError = ref('');
const adminEmail = ref('');
const adminLoading = ref(true);
const loginLoading = ref(false);
const reports = ref([]);
const reportFilter = ref('Semua status');
const reportSearch = ref('');
const savingReportId = ref(null);
const adminError = ref('');
const reportEdits = ref({});

let socket;
let notificationTimer;

const filteredArticles = computed(() => articles.filter((article) => {
  const matchesCategory = articleFilter.value === 'Semua kategori' || article.category === articleFilter.value;
  const search = searchQuery.value.trim().toLowerCase();
  const matchesSearch = !search || `${article.title} ${article.description} ${article.keywords}`.toLowerCase().includes(search);
  return matchesCategory && matchesSearch;
}));

const filteredReports = computed(() => reports.value.filter((report) => {
  const matchesStatus = reportFilter.value === 'Semua status' || report.status === reportFilter.value;
  const search = reportSearch.value.trim().toLowerCase();
  const matchesSearch = !search || [
    report.reporter,
    report.category,
    report.location,
    report.description,
  ].join(' ').toLowerCase().includes(search);
  return matchesStatus && matchesSearch;
}));

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function copyTrackingCode() {
  try {
    await navigator.clipboard.writeText(submittedCode.value);
    showNotification('Kode pelacakan disalin.');
  } catch {
    showNotification('Kode tidak dapat disalin otomatis. Silakan salin kode secara manual.');
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    credentials: 'same-origin',
  });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'Permintaan tidak berhasil.');
    error.status = response.status;
    throw error;
  }
  return result;
}

function showNotification(message) {
  notification.value = message;
  clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => {
    notification.value = '';
  }, 5000);
}

function connectSocket() {
  socket = io({ transports: ['websocket', 'polling'] });
  socket.on('connect', () => {
    if (trackedCode.value) {
      socket.emit('report:subscribe', { trackingCode: trackedCode.value });
      loadTrackedReport();
    }
    if (isAdminPage && adminEmail.value) loadReports();
  });
  socket.on('report:status', (update) => {
    if (!trackedCode.value) return;
    loadTrackedReport();
    showNotification(`Status laporan Anda berubah: ${update.status}.`);
  });
  socket.on('report:new', ({ report }) => {
    if (!isAdminPage || !adminEmail.value) return;
    const index = reports.value.findIndex((item) => item.id === report.id);
    if (index >= 0) reports.value[index] = report;
    else reports.value.unshift(report);
    reportEdits.value[report.id] = { status: report.status, note: '' };
    showNotification('Laporan baru diterima.');
  });
  socket.on('report:updated', ({ report }) => {
    if (!isAdminPage || !adminEmail.value) return;
    const index = reports.value.findIndex((item) => item.id === report.id);
    if (index >= 0) reports.value[index] = report;
  });
  socket.on('connect_error', () => {
    if (isAdminPage && adminEmail.value) showNotification('Koneksi real-time terputus. Memuat data secara berkala.');
  });
}

async function submitReport() {
  submittingReport.value = true;
  submittedCode.value = '';
  try {
    const result = await request('/api/reports', {
      method: 'POST',
      body: JSON.stringify(reportForm.value),
    });
    submittedCode.value = result.trackingCode;
    trackCodeInput.value = result.trackingCode;
    reportForm.value = { reporter: '', category: '', incidentDate: localDate(), location: '', description: '', initialAction: '' };
    showNotification('Laporan berhasil dikirim dan tersimpan.');
    await trackReport();
    document.getElementById('pelacakan')?.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    showNotification(error.message);
  } finally {
    submittingReport.value = false;
  }
}

async function trackReport() {
  const code = trackCodeInput.value.trim().toUpperCase();
  if (!code) {
    trackingError.value = 'Masukkan kode pelacakan laporan.';
    return;
  }
  tracking.value = true;
  trackingError.value = '';
  try {
    const result = await request(`/api/reports/track/${encodeURIComponent(code)}`);
    trackedCode.value = code;
    trackedReport.value = result;
    socket?.emit('report:subscribe', { trackingCode: code });
  } catch (error) {
    trackedCode.value = '';
    trackedReport.value = null;
    trackingError.value = error.message;
  } finally {
    tracking.value = false;
  }
}

async function loadTrackedReport(showError = true) {
  if (!trackedCode.value) return;
  try {
    trackedReport.value = await request(`/api/reports/track/${encodeURIComponent(trackedCode.value)}`);
  } catch (error) {
    if (showError) trackingError.value = error.message;
  }
}

async function loadAdminSession() {
  try {
    const result = await request('/api/admin/session');
    adminEmail.value = result.admin.email;
    await loadReports();
  } catch (error) {
    if (error.status !== 401) adminError.value = error.message;
  } finally {
    adminLoading.value = false;
  }
}

async function adminLogin() {
  loginLoading.value = true;
  loginError.value = '';
  try {
    const result = await request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(loginForm.value),
    });
    adminEmail.value = result.admin.email;
    loginForm.value.password = '';
    await loadReports();
    socket?.disconnect();
    connectSocket();
  } catch (error) {
    loginError.value = error.message;
  } finally {
    loginLoading.value = false;
  }
}

async function adminLogout() {
  try {
    await request('/api/admin/logout', { method: 'POST' });
    adminEmail.value = '';
    reports.value = [];
    socket?.disconnect();
    connectSocket();
  } catch (error) {
    showNotification(error.message);
  }
}

async function loadReports() {
  adminError.value = '';
  try {
    const result = await request('/api/admin/reports');
    reports.value = result.reports;
    reportEdits.value = Object.fromEntries(result.reports.map((report) => [
      report.id,
      { status: report.status, note: '' },
    ]));
  } catch (error) {
    adminError.value = error.message;
  }
}

async function updateReport(report) {
  const edit = reportEdits.value[report.id] || { status: report.status, note: '' };
  savingReportId.value = report.id;
  try {
    const result = await request(`/api/admin/reports/${report.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(edit),
    });
    const index = reports.value.findIndex((item) => item.id === report.id);
    if (index >= 0) reports.value[index] = result.report;
    reportEdits.value[report.id] = { status: result.report.status, note: '' };
    showNotification('Status laporan berhasil diperbarui.');
  } catch (error) {
    showNotification(error.message);
  } finally {
    savingReportId.value = null;
  }
}

function formatDate(value) {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(normalized));
}

onMounted(() => {
  connectSocket();
  if (isAdminPage) loadAdminSession();
});

onBeforeUnmount(() => {
  socket?.disconnect();
  clearTimeout(notificationTimer);
});
</script>

<template>
  <div v-if="isAdminPage" class="admin-page">
    <header class="admin-header">
      <a class="brand" href="/">
        <span class="logo">✚</span>
        <span>Portal K3<small>UNIVERSITAS LANCANG KUNING</small></span>
      </a>
      <a class="back-link" href="/">← Kembali ke portal</a>
    </header>
    <main class="admin-main">
      <div v-if="adminLoading" class="panel centered">Memeriksa sesi admin...</div>
      <section v-else-if="!adminEmail" class="login-panel panel">
        <span class="kicker">Area terbatas</span>
        <h1>Masuk sebagai admin</h1>
        <p class="muted">Gunakan akun admin yang dikonfigurasi pada server.</p>
        <form class="stack-form" @submit.prevent="adminLogin">
          <label class="field">Email admin
            <input v-model.trim="loginForm.email" type="email" autocomplete="username" required />
          </label>
          <label class="field">Kata sandi
            <input v-model="loginForm.password" type="password" autocomplete="current-password" required />
          </label>
          <p v-if="adminError" class="error-message" role="alert">{{ adminError }}</p>
          <p v-if="loginError" class="error-message" role="alert">{{ loginError }}</p>
          <button class="btn bluebtn" type="submit" :disabled="loginLoading">
            {{ loginLoading ? 'Memeriksa...' : 'Masuk ke dashboard' }}
          </button>
        </form>
      </section>
      <section v-else class="admin-dashboard">
        <div class="dashboard-title">
          <div>
            <span class="kicker">Dashboard pengelola</span>
            <h1>Laporan masuk</h1>
            <p class="muted">Masuk sebagai {{ adminEmail }} · perubahan diperbarui secara real-time.</p>
          </div>
          <button class="btn lightbtn" type="button" @click="adminLogout">Keluar</button>
        </div>
        <div class="admin-tools">
          <input v-model="reportSearch" type="search" placeholder="Cari lokasi, kategori, deskripsi..." aria-label="Cari laporan" />
          <select v-model="reportFilter" aria-label="Filter status laporan">
            <option>Semua status</option>
            <option v-for="status in statuses" :key="status">{{ status }}</option>
          </select>
          <button class="btn lightbtn" type="button" @click="loadReports">↻ Muat ulang</button>
        </div>
        <p v-if="adminError" class="error-message" role="alert">{{ adminError }}</p>
        <div v-if="!filteredReports.length" class="panel empty-state">
          <span>📭</span><strong>Belum ada laporan yang cocok.</strong>
          <p>Laporan anonim yang masuk akan tampil di halaman ini.</p>
        </div>
        <article v-for="report in filteredReports" :key="report.id" class="report-card panel">
          <div class="report-heading">
            <div>
              <span class="category">{{ report.category }}</span>
              <h2>{{ report.location }}</h2>
              <p class="muted">Dikirim {{ formatDate(report.createdAt) }} · Kejadian {{ report.incidentDate }}</p>
            </div>
            <span class="status-badge" :class="`status-${report.status.toLowerCase()}`">{{ report.status }}</span>
          </div>
          <dl class="report-details">
            <div><dt>Pelapor</dt><dd>{{ report.reporter || 'Anonim' }}</dd></div>
            <div><dt>Deskripsi</dt><dd>{{ report.description }}</dd></div>
            <div v-if="report.initialAction"><dt>Tindakan awal</dt><dd>{{ report.initialAction }}</dd></div>
          </dl>
          <form class="update-form" @submit.prevent="updateReport(report)">
            <label class="field">Perbarui status
              <select v-model="reportEdits[report.id].status">
                <option v-for="status in statuses" :key="status">{{ status }}</option>
              </select>
            </label>
            <label class="field">Catatan untuk pelapor <span class="muted">(opsional)</span>
              <input v-model="reportEdits[report.id].note" maxlength="500" placeholder="Contoh: Tim fasilitas telah menerima laporan." />
            </label>
            <button class="btn bluebtn" type="submit" :disabled="savingReportId === report.id">
              {{ savingReportId === report.id ? 'Menyimpan...' : 'Simpan tindak lanjut' }}
            </button>
          </form>
        </article>
      </section>
    </main>
    <div v-if="notification" class="toast" role="status" aria-live="polite">{{ notification }}</div>
  </div>

  <div v-else>
    <div class="topline"><div class="wrap">Portal edukasi dan pelaporan Keselamatan dan Kesehatan Kerja (K3) kampus</div></div>
    <header class="sitehead">
      <div class="wrap nav">
        <a class="brand" href="#beranda">
          <span class="logo">✚</span>
          <span>Portal K3<small>UNIVERSITAS LANCANG KUNING</small></span>
        </a>
        <nav class="navlinks" aria-label="Navigasi utama">
          <a href="#tentang">Informasi K3</a>
          <a href="#lapor">Pelaporan</a>
          <a href="#pelacakan">Lacak status</a>
          <a href="#evakuasi">Evakuasi</a>
          <a href="#edukasi">Artikel</a>
          <a class="admin-link" href="/admin">Login admin</a>
        </nav>
      </div>
    </header>
    <main>
      <section id="beranda" class="hero">
        <div class="wrap hero-grid">
          <div>
            <span class="eyebrow">● BUDAYA AMAN DIMULAI DARI KITA</span>
            <h1>Kampus aman,<br /><span>belajar nyaman.</span></h1>
            <p>Portal informasi Keselamatan dan Kesehatan Kerja (K3) Universitas Lancang Kuning. Kenali potensi bahaya, pelajari panduan keselamatan, dan laporkan kejadian tanpa perlu membuat akun.</p>
            <div class="actions">
              <a class="btn primary" href="#tentang">Jelajahi Informasi K3 ↗</a>
              <a class="btn outline" href="#lapor">Laporkan Bahaya</a>
            </div>
          </div>
          <div class="hero-art" aria-label="Ilustrasi simbol keselamatan">
            <div class="shield">✚</div>
            <div class="float float-a">🛡️ Utamakan keselamatan<small>Safety first, every day</small></div>
            <div class="float float-b">✓ Kenali · Cegah · Laporkan<small>Semua warga kampus berperan</small></div>
          </div>
        </div>
      </section>

      <div class="wrap quick">
        <div class="quickgrid">
          <a class="quickcard" href="#evakuasi"><span class="quickicon">🚪</span><span><strong>Evakuasi</strong><small>Rute dan titik kumpul</small></span></a>
          <a class="quickcard" href="#lapor"><span class="quickicon">⚠️</span><span><strong>Lapor Bahaya</strong><small>Bahaya dan near miss</small></span></a>
          <a class="quickcard" href="#edukasi"><span class="quickicon">📚</span><span><strong>Edukasi K3</strong><small>Artikel dan panduan</small></span></a>
          <a class="quickcard" href="#rujukan"><span class="quickicon">⚖️</span><span><strong>Rujukan</strong><small>Regulasi dan sumber</small></span></a>
        </div>
      </div>

      <section id="tentang">
        <div class="wrap">
          <div class="sectionhead">
            <span class="kicker">Informasi K3 kampus</span>
            <h2>Keselamatan bukan sekadar aturan.</h2>
            <p>K3 mencakup upaya mengenali bahaya, menilai risiko, dan menerapkan pengendalian agar kegiatan belajar, praktikum, penelitian, serta layanan kampus berlangsung aman dan sehat.</p>
          </div>
          <div class="cards">
            <article class="card"><div class="cardicon">🔎</div><h3>Kenali Potensi Bahaya</h3><p>Waspadai lantai licin, kabel rusak, jalur terhalang, kebakaran, bahan kimia, dan kondisi kerja yang tidak ergonomis.</p><span class="pill">Identifikasi risiko</span></article>
            <article class="card"><div class="cardicon">🧤</div><h3>Praktikum dan Laboratorium</h3><p>Ikuti SOP, pahami label dan SDS bahan kimia, gunakan APD sesuai risiko, dan jangan mengoperasikan alat tanpa supervisi.</p><span class="pill">Patuhi prosedur</span></article>
            <article class="card"><div class="cardicon">🌿</div><h3>Kesehatan Lingkungan</h3><p>Jaga kebersihan, ventilasi, sanitasi, ergonomi ruang belajar, dan pemilahan limbah sesuai prosedur kampus.</p><span class="pill">Sehat dan nyaman</span></article>
            <article class="card"><div class="cardicon">🧯</div><h3>Pencegahan Kebakaran</h3><p>Jaga akses keluar bebas hambatan, kenali alarm dan APAR, serta hindari peralatan listrik rusak atau kelebihan beban.</p><span class="pill">Pencegahan</span></article>
            <article class="card"><div class="cardicon">🩹</div><h3>Pertolongan Pertama</h3><p>Ketahui lokasi kotak P3K dan petugas terlatih. Jangan bertindak di luar kompetensi; segera minta bantuan jika ada korban.</p><span class="pill">Tanggap insiden</span></article>
            <article class="card"><div class="cardicon">🤝</div><h3>Budaya Pelaporan</h3><p>Laporkan kondisi tidak aman dan kejadian nyaris celaka tanpa menunggu munculnya cedera. Informasi cepat membantu pencegahan.</p><span class="pill">Peduli bersama</span></article>
          </div>
        </div>
      </section>

      <section id="lapor" class="tint">
        <div class="wrap">
          <div class="sectionhead">
            <span class="kicker">Pelaporan bahaya</span>
            <h2>Temukan bahaya? Laporkan.</h2>
            <p>Laporan langsung tersimpan di sistem. Anda tidak perlu login; simpan kode pelacakan untuk melihat tindak lanjut admin.</p>
          </div>
          <div class="two-col">
            <div class="steps">
              <div class="step"><span class="num">01</span><div><h3>Utamakan keselamatan</h3><p>Jangan menyentuh sumber bahaya. Jauhkan diri dan orang lain jika aman dilakukan.</p></div></div>
              <div class="step"><span class="num">02</span><div><h3>Catat informasi faktual</h3><p>Tulis lokasi, waktu, jenis bahaya, dan kondisi yang diamati. Hindari dugaan yang belum terverifikasi.</p></div></div>
              <div class="step"><span class="num">03</span><div><h3>Simpan kode pelacakan</h3><p>Kode ditampilkan setelah laporan terkirim. Kode ini diperlukan untuk melihat pembaruan status dan tidak dapat dipulihkan jika hilang.</p></div></div>
              <div class="warning"><strong>Keadaan darurat:</strong> Formulir ini bukan kanal darurat. Jauhkan diri dari bahaya dan segera hubungi petugas kampus atau layanan darurat setempat.</div>
              <div v-if="submittedCode" class="tracking-code-card" role="status">
                <strong>✅ Laporan berhasil dikirim</strong>
                <span>Kode pelacakan Anda (simpan dengan aman):</span>
                <code>{{ submittedCode }}</code>
                <button class="btn lightbtn" type="button" @click="copyTrackingCode">Salin kode</button>
              </div>
            </div>
            <div class="panel">
              <h3>Formulir Laporan K3</h3>
              <p class="sub">Laporan dapat dikirim secara anonim. Hindari memasukkan data pribadi sensitif.</p>
              <form class="formgrid" @submit.prevent="submitReport">
                <label class="field">Nama pelapor <span class="muted">(opsional)</span>
                  <input v-model="reportForm.reporter" maxlength="100" placeholder="Nama Anda" />
                </label>
                <label class="field">Jenis laporan *
                  <select v-model="reportForm.category" required>
                    <option disabled value="">Pilih kategori</option>
                    <option v-for="category in categories" :key="category">{{ category }}</option>
                  </select>
                </label>
                <label class="field">Tanggal kejadian *
                  <input v-model="reportForm.incidentDate" type="date" :max="localDate()" required />
                </label>
                <label class="field">Lokasi spesifik *
                  <input v-model="reportForm.location" minlength="3" maxlength="180" required placeholder="Gedung/ruang/lantai" />
                </label>
                <label class="field full">Deskripsi bahaya atau kejadian *
                  <textarea v-model="reportForm.description" minlength="10" maxlength="2000" required placeholder="Apa yang ditemukan? Apa potensi akibatnya?"></textarea>
                </label>
                <label class="field full">Tindakan awal <span class="muted">(opsional)</span>
                  <textarea v-model="reportForm.initialAction" maxlength="1000" placeholder="Contoh: area dihindari dan petugas diberi tahu."></textarea>
                </label>
                <div class="field full">
                  <button class="btn bluebtn" type="submit" :disabled="submittingReport">
                    {{ submittingReport ? 'Mengirim laporan...' : 'Kirim Laporan →' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section id="pelacakan">
        <div class="wrap tracking-layout">
          <div class="sectionhead">
            <span class="kicker">Pantau tindak lanjut</span>
            <h2>Lacak status laporan Anda.</h2>
            <p>Gunakan kode pelacakan yang diberikan setelah formulir dikirim. Pembaruan status akan muncul langsung selama halaman ini terbuka.</p>
          </div>
          <div class="panel track-panel">
            <form class="track-form" @submit.prevent="trackReport">
              <label class="field">Kode pelacakan
                <input v-model="trackCodeInput" autocomplete="off" spellcheck="false" placeholder="Tempel kode pelacakan" required />
              </label>
              <button class="btn bluebtn" type="submit" :disabled="tracking">{{ tracking ? 'Memeriksa...' : 'Cek status' }}</button>
            </form>
            <p v-if="trackingError" class="error-message" role="alert">{{ trackingError }}</p>
            <div v-if="trackedReport" class="tracking-result">
              <div class="report-heading">
                <div><strong>Status laporan</strong><p class="muted">Dikirim {{ formatDate(trackedReport.createdAt) }}</p></div>
                <span class="status-badge" :class="`status-${trackedReport.status.toLowerCase()}`">{{ trackedReport.status }}</span>
              </div>
              <h3>Riwayat pembaruan</h3>
              <ol class="timeline">
                <li v-for="(update, index) in trackedReport.updates" :key="`${update.changedAt}-${index}`">
                  <span class="timeline-dot"></span>
                  <div><strong>{{ update.status }}</strong><p>{{ update.note }}</p><small>{{ formatDate(update.changedAt) }}</small></div>
                </li>
              </ol>
              <p class="live-note">● Kode valid; status akan diperbarui otomatis saat admin melakukan tindak lanjut.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="evakuasi">
        <div class="wrap">
          <div class="sectionhead"><span class="kicker">Kesiapsiagaan darurat</span><h2>Kenali jalur evakuasi sebelum dibutuhkan.</h2><p>Ikuti rambu dan arahan petugas di gedung tempat Anda berada.</p></div>
          <div class="map-layout">
            <div class="mapbox">
              <div class="maptitle"><h3>Ilustrasi skematis area kampus</h3><p>Visual edukasi, bukan denah resmi Universitas Lancang Kuning.</p></div>
              <div class="schematic">
                <svg viewBox="0 0 620 390" role="img" aria-label="Ilustrasi peta skematis, bukan peta lokasi aktual">
                  <rect width="620" height="390" rx="14" fill="#eef5ec" />
                  <path d="M25 190 H595 M310 20 V365" stroke="#d1dbe2" stroke-width="43" fill="none" />
                  <path d="M25 190 H595 M310 20 V365" stroke="#fff" stroke-width="3" stroke-dasharray="12 10" fill="none" />
                  <rect x="48" y="38" width="190" height="105" rx="9" fill="#d7eafa" stroke="#5b94be" stroke-width="2" />
                  <text x="143" y="88" text-anchor="middle" fill="#153e5d">GEDUNG PERKULIAHAN</text>
                  <rect x="375" y="38" width="195" height="105" rx="9" fill="#ffe7ae" stroke="#c89d35" stroke-width="2" />
                  <text x="472" y="88" text-anchor="middle" fill="#624a0d">LABORATORIUM</text>
                  <rect x="48" y="240" width="190" height="105" rx="9" fill="#e4def7" stroke="#9380c2" stroke-width="2" />
                  <text x="143" y="294" text-anchor="middle" fill="#413469">PERPUSTAKAAN</text>
                  <rect x="375" y="240" width="195" height="105" rx="9" fill="#d8eee3" stroke="#5c9d7d" stroke-width="2" />
                  <text x="472" y="294" text-anchor="middle" fill="#18583e">AREA TERBUKA</text>
                  <path d="M240 95 H270 V190 H355 V290 H420" fill="none" stroke="#16805d" stroke-width="5" stroke-dasharray="8 6" />
                  <circle cx="420" cy="290" r="18" fill="#16805d" stroke="#fff" stroke-width="4" />
                  <text x="420" y="295" text-anchor="middle" fill="#fff">K</text>
                </svg>
              </div>
              <div class="maplegend">● Titik kumpul &nbsp; ● Bangunan ilustratif &nbsp; ● Rute contoh</div>
            </div>
            <div class="mapnotes">
              <article class="mapnote"><h3>🚪 Saat alarm berbunyi</h3><p>Hentikan aktivitas, tetap tenang, ikuti rambu dan instruksi petugas. Jangan gunakan lift saat kebakaran.</p></article>
              <article class="mapnote"><h3>📍 Di titik kumpul</h3><p>Menjauh dari bangunan dan akses kendaraan darurat. Ikuti pendataan petugas dan jangan kembali sebelum dinyatakan aman.</p></article>
              <article class="warning"><strong>Penting:</strong> Ganti skema ini dengan denah resmi tiap gedung yang telah diverifikasi sebelum dipakai sebagai panduan operasional.</article>
            </div>
          </div>
        </div>
      </section>

      <section id="edukasi" class="tint">
        <div class="wrap">
          <div class="sectionhead"><span class="kicker">Artikel dan edukasi</span><h2>Pengetahuan K3 untuk keseharian kampus.</h2><p>Pilih topik pencegahan yang dapat diterapkan oleh seluruh warga kampus.</p></div>
          <div class="article-tools">
            <input v-model="searchQuery" type="search" placeholder="Cari topik edukasi..." aria-label="Cari artikel" />
            <select v-model="articleFilter" aria-label="Filter kategori artikel"><option>Semua kategori</option><option>Darurat</option><option>Laboratorium</option><option>Ergonomi</option><option>Lingkungan</option></select>
          </div>
          <div class="article-grid">
            <article v-for="article in filteredArticles" :key="article.title" class="article">
              <div class="article-top">{{ article.icon }}</div>
              <div class="article-body"><span class="category">{{ article.category }}</span><h3>{{ article.title }}</h3><p>{{ article.description }}</p><button class="read" type="button" @click="selectedArticle = article">Baca panduan →</button></div>
            </article>
          </div>
          <p v-if="!filteredArticles.length" class="empty">Tidak ada artikel yang sesuai dengan pencarian.</p>
        </div>
      </section>

      <section id="rujukan">
        <div class="wrap">
          <div class="sectionhead"><span class="kicker">Rujukan dan bacaan lanjutan</span><h2>Gunakan sumber yang dapat diverifikasi.</h2><p>Penerapan pada kampus perlu mempertimbangkan ruang lingkup aturan dan kebijakan internal yang berlaku.</p></div>
          <div class="refs">
            <a class="ref" href="https://peraturan.bpk.go.id/Details/47614/uu-no-1-tahun-1970" target="_blank" rel="noopener noreferrer"><span>📘</span><div><strong>UU No. 1 Tahun 1970</strong><small>Keselamatan Kerja — basis umum penyelenggaraan keselamatan kerja.</small></div></a>
            <a class="ref" href="https://jdih.kemnaker.go.id/" target="_blank" rel="noopener noreferrer"><span>⚖️</span><div><strong>JDIH Kementerian Ketenagakerjaan</strong><small>Telusuri peraturan dan pedoman resmi terkait K3.</small></div></a>
            <a class="ref" href="https://www.who.int/health-topics/occupational-health" target="_blank" rel="noopener noreferrer"><span>🌐</span><div><strong>WHO — Occupational Health</strong><small>Informasi kesehatan kerja dan pencegahan risiko kesehatan.</small></div></a>
          </div>
        </div>
      </section>
      <section class="emergency-section"><div class="wrap emergency"><div><h2>Dalam keadaan darurat, utamakan keselamatan.</h2><p>Jauhkan diri dari bahaya, beri tahu petugas kampus, dan ikuti instruksi evakuasi.</p></div><a class="btn primary" href="#evakuasi">Buka panduan evakuasi ↗</a></div></section>
    </main>
    <footer><div class="wrap foot"><div><strong>PORTAL K3 · UNIVERSITAS LANCANG KUNING</strong><p>Bangun budaya aman, sehat, dan peduli di lingkungan akademik.</p><small>Prototipe edukasi · Perlu validasi pengelola kampus untuk penggunaan resmi.</small></div><div class="right"><small>© {{ new Date().getFullYear() }} Portal K3 Kampus</small><br /><small><a href="#beranda">Kembali ke atas ↑</a></small></div></div></footer>
    <div v-if="selectedArticle" class="modal" role="dialog" aria-modal="true" :aria-label="selectedArticle.title" @click.self="selectedArticle = null" @keydown.esc="selectedArticle = null">
      <div class="modalbox"><button class="close" type="button" aria-label="Tutup" @click="selectedArticle = null">✕</button><span class="kicker">{{ selectedArticle.category }}</span><h2>{{ selectedArticle.title }}</h2><ul><li v-for="detail in selectedArticle.details" :key="detail">{{ detail }}</li></ul></div>
    </div>
    <div v-if="notification" class="toast" role="status" aria-live="polite">{{ notification }}</div>
  </div>
</template>
