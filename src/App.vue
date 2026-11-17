<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const realtimeClient = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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

const videos = [
  { id: 'xFDiuIccymc', title: 'SAFETY INDUCTION DI GEDUNG REKTORAT', description: 'Pengenalan keselamatan di Gedung Rektorat.' },
  { id: 'RJPAgp8m2AM', title: '4 Bahaya di Sekitar Kita yang Sering Diabaikan | Edukasi K3', description: 'Kenali potensi bahaya di sekitar kita.' },
  { id: '0rGvhaeSFJY', title: 'Cara Menggunakan APAR dengan Benar: TARIK, ARAHKAN, TEKAN, SAPU | Edukasi K3', description: 'Pelajari informasi penggunaan alat pemadam api.' },
  { id: '_ie6JL0MDhQ', title: 'Apa yang Harus Dilakukan Saat dan Setelah Gempa? Tenang, Lindungi Kepala, Selamatkan Diri|Edukasi K3', description: 'Materi edukasi keselamatan dan kesehatan kerja.' },
  { id: 'RGFhtjXwizc', title: 'SAFEMATE -always safe, always ready!', description: 'Mengenal SafeMate dan penggunaannya.' },
];

const evacuationFloors = [
  {
    name: 'Lantai 1',
    image: '/evacuation/lantai-1.png',
    pdf: '/evacuation/lantai-1.pdf',
    rooms: [
      'R. Hasan Junus',
      'R. Abdurrahman Sidik',
      'R. Aisyah Sulaiman',
      'R. Tenas Efendi',
      'R. Sariamin Ismail',
      'R. BPM',
      'R. Bank Riau Kepri',
      'R. Lobby',
      'R. Lab. Bahasa B',
      'R. Lab. Bahasa A',
      'R. Balai Bahasa',
      'R. Pelayanan dan Administrasi',
      'R. Raja Ali Haji',
      'R. Idrus Titin',
      'R. Soeman HS',
      'ATM Gallery',
    ],
  },
  {
    name: 'Lantai 2',
    image: '/evacuation/lantai-2.png',
    pdf: '/evacuation/lantai-2.pdf',
    rooms: [
      'Gudang',
      'R. Edi Ruskan',
      'R. SPI/pendaftaran Mahasiswa Baru',
      'R. BAAK',
      'R. Wakil Rektor II',
      'R. Bagian Umum',
      'R. Kepala Biro Administrasi Umum',
      'R. Bag. Keuangan',
      'R. Humas',
      'Kantor Urusan Internasional dan Kerjasama',
      'R. Pend. Ilmu Perpustakaan',
      'R. Tata Usaha Pend. Sastra Inggris',
      'Fakultas Ilmu Budaya/ Pend. Sastra Daerah Melayu',
      'R. Administrasi',
      'R. Dekan',
      'R. Seminar',
      'Lab. Komputer FIB',
      'Gudang',
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
const menuOpen = ref(false);
const selectedFloor = ref(0);
const roomQuery = ref('');
const planPreviewOpen = ref(false);
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

let realtimeChannel;
let pollingTimer;
let notificationTimer;

const filteredArticles = computed(() => articles.filter((article) => {
  const matchesCategory = articleFilter.value === 'Semua kategori' || article.category === articleFilter.value;
  const search = searchQuery.value.trim().toLowerCase();
  const matchesSearch = !search || `${article.title} ${article.description} ${article.keywords}`.toLowerCase().includes(search);
  return matchesCategory && matchesSearch;
}));

const activeEvacuationFloor = computed(() => evacuationFloors[selectedFloor.value]);
const filteredRooms = computed(() => {
  const query = roomQuery.value.trim().toLowerCase();
  return activeEvacuationFloor.value.rooms
    .map((name, index) => ({ name, number: index + 1 }))
    .filter((room) => !query || room.name.toLowerCase().includes(query));
});

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
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
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
    const error = new Error(result.error || 'permintaan tidak berhasil!');
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

function refreshVisibleReports() {
  if (isAdminPage && adminEmail.value) void loadReports(true);
  if (trackedCode.value) void loadTrackedReport(false);
}

function startPolling() {
  if (pollingTimer) return;
  pollingTimer = setInterval(refreshVisibleReports, 15000);
}

function connectRealtime() {
  startPolling();
  if (!realtimeClient) {
    if (isAdminPage) {
      showNotification('Realtime belum dikonfigurasi. Perubahan akan diperiksa otomatis setiap 15 detik.');
    }
    return;
  }

  realtimeChannel = realtimeClient
    .channel('portal-updates')
    .on('broadcast', { event: 'reports_changed' }, () => {
      refreshVisibleReports();
    })
    .subscribe((status, error) => {
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        console.error('Koneksi Supabase Realtime gagal:', error || status);
        if (isAdminPage && adminEmail.value) {
          showNotification('Koneksi real-time terputus. Data diperiksa otomatis setiap 15 detik.');
        }
      }
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
    if (!result.realtimeNotified) {
      startPolling();
      showNotification('Laporan tersimpan, tetapi pembaruan langsung tidak tersedia. Data akan diperbarui berkala.');
    }
    reportForm.value = { reporter: '', category: '', incidentDate: localDate(), location: '', description: '', initialAction: '' };
    if (result.realtimeNotified) showNotification('Laporan berhasil dikirim dan tersimpan.');
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
    if (!realtimeClient) {
      showNotification('Realtime belum dikonfigurasi. Status akan diperiksa otomatis setiap 15 detik.');
    }
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
    const previousStatus = trackedReport.value?.status;
    const result = await request(`/api/reports/track/${encodeURIComponent(trackedCode.value)}`);
    trackedReport.value = result;
    if (previousStatus && result.status !== previousStatus) {
      showNotification(`Status laporan Anda berubah: ${result.status}.`);
    }
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
  } catch (error) {
    showNotification(error.message);
  }
}

async function loadReports(preserveEdits = false) {
  adminError.value = '';
  try {
    const result = await request('/api/admin/reports');
    const previousReports = reports.value;
    const previousEdits = reportEdits.value;
    const newReportCount = result.reports.filter((report) =>
      !previousReports.some((previousReport) => previousReport.id === report.id)).length;
    const changedStatusCount = result.reports.filter((report) => {
      const previousReport = previousReports.find((item) => item.id === report.id);
      return previousReport && previousReport.status !== report.status;
    }).length;
    reports.value = result.reports;
    reportEdits.value = Object.fromEntries(result.reports.map((report) => {
      const previousReport = previousReports.find((item) => item.id === report.id);
      const previousEdit = previousEdits[report.id];
      const hasUnsavedStatus = preserveEdits && previousReport && previousEdit &&
        previousEdit.status !== previousReport.status;
      return [
        report.id,
        {
          status: hasUnsavedStatus ? previousEdit.status : report.status,
          note: preserveEdits ? previousEdit?.note || '' : '',
        },
      ];
    }));
    if (preserveEdits && newReportCount > 0) {
      showNotification(`${newReportCount} laporan baru diterima.`);
    } else if (preserveEdits && changedStatusCount > 0) {
      showNotification('Status laporan diperbarui.');
    }
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
    if (result.realtimeNotified) {
      showNotification('Status laporan berhasil diperbarui.');
    } else {
      startPolling();
      showNotification('Status tersimpan, tetapi pembaruan langsung tidak tersedia. Data akan diperbarui berkala.');
    }
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
  connectRealtime();
  if (isAdminPage) loadAdminSession();
});

onBeforeUnmount(() => {
  if (realtimeChannel) void realtimeClient?.removeChannel(realtimeChannel);
  clearInterval(pollingTimer);
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
    <svg class="icon-sprite" aria-hidden="true">
      <symbol id="safemate-k3-logo" viewBox="180 112 440 446">
        <g fill="none" stroke="#3C9A47" stroke-width="8" stroke-linecap="round">
          <path d="M205 330 q-18 20 0 40" />
          <path d="M188 316 q-32 34 0 68" />
          <path d="M595 330 q18 20 0 40" />
          <path d="M612 316 q32 34 0 68" />
        </g>
        <path d="M250 255 Q330 250 400 215 Q470 250 550 255 L550 380 Q550 470 400 550 Q250 470 250 380 Z" fill="#FFFFFF" />
        <path d="M400 215 Q330 250 250 255 L250 380 Q250 470 400 550" fill="none" stroke="#1B3A6B" stroke-width="14" stroke-linejoin="round" stroke-linecap="round" />
        <path d="M400 215 Q470 250 550 255 L550 380 Q550 470 400 550" fill="none" stroke="#3C9A47" stroke-width="14" stroke-linejoin="round" stroke-linecap="round" />
        <path d="M375 304 v-18 q0-10 10-10 h30 q10 0 10 10 v18" fill="none" stroke="#1B3A6B" stroke-width="8" />
        <rect x="322" y="400" width="14" height="50" rx="7" fill="#1B3A6B" />
        <rect x="464" y="400" width="14" height="50" rx="7" fill="#1B3A6B" />
        <rect x="335" y="300" width="130" height="175" rx="45" fill="#1B3A6B" />
        <circle cx="400" cy="336" r="14" fill="#3C9A47" />
        <path d="M400 328 v16 M392 336 h16" stroke="#fff" stroke-width="5" stroke-linecap="round" />
        <rect x="352" y="370" width="96" height="92" rx="16" fill="#FFFFFF" />
        <g fill="none" stroke="#1B3A6B" stroke-width="3">
          <rect x="367" y="381" width="18" height="18" />
          <rect x="415" y="381" width="18" height="18" />
          <rect x="367" y="433" width="18" height="18" />
        </g>
        <g fill="#1B3A6B">
          <rect x="372" y="386" width="8" height="8" />
          <rect x="420" y="386" width="8" height="8" />
          <rect x="372" y="438" width="8" height="8" />
          <rect x="392" y="383" width="5" height="5" />
          <rect x="402" y="388" width="5" height="5" />
          <rect x="392" y="395" width="5" height="5" />
          <rect x="368" y="408" width="5" height="5" />
          <rect x="378" y="412" width="5" height="5" />
          <rect x="418" y="408" width="5" height="5" />
          <rect x="428" y="414" width="5" height="5" />
          <rect x="392" y="440" width="5" height="5" />
          <rect x="414" y="436" width="5" height="5" />
          <rect x="426" y="444" width="5" height="5" />
          <rect x="404" y="448" width="5" height="5" />
        </g>
        <rect x="389" y="410" width="22" height="17" rx="3" fill="#F9B810" />
        <text x="400" y="423" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="11" fill="#1B3A6B">K3</text>
        <path d="M335 190 v36 q65 32 130 0 v-36 z" fill="#E0A000" />
        <polygon points="400,120 530,172 400,224 270,172" fill="#F9B810" />
        <path d="M520 176 v52" stroke="#E0A000" stroke-width="5" stroke-linecap="round" />
        <rect x="512" y="224" width="16" height="22" rx="5" fill="#F9B810" />
      </symbol>
    </svg>
    <div class="topline"><div class="wrap"><span>UNIVERSITAS LANCANG KUNING · PORTAL EDUKASI K3</span><span>Kenali Bahaya · Cegah Risiko · Jaga Sesama</span></div></div>
    <header class="sitehead">
      <div class="wrap nav">
        <a class="brand" href="#beranda">
          <svg class="site-logo" aria-hidden="true"><use href="#safemate-k3-logo" /></svg>
          <span>PORTAL K3<small>UNIVERSITAS LANCANG KUNING</small></span>
        </a>
        <button class="menu" type="button" aria-controls="primary-nav" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
          {{ menuOpen ? '✕ Tutup' : '☰ Menu' }}
        </button>
        <nav id="primary-nav" class="navlinks" :class="{ open: menuOpen }" aria-label="Navigasi utama">
          <a href="#video" @click="menuOpen = false">Video</a>
          <a href="#tentang" @click="menuOpen = false">Informasi K3</a>
          <a href="#lapor" @click="menuOpen = false">Pelaporan</a>
          <a href="#pelacakan" @click="menuOpen = false">Lacak status</a>
          <a href="#evakuasi" @click="menuOpen = false">Peta evakuasi</a>
          <a href="#edukasi" @click="menuOpen = false">Artikel</a>
          <a class="admin-link" href="/admin">Login admin</a>
          <a class="navbtn" href="#lapor" @click="menuOpen = false">＋ Lapor Bahaya</a>
        </nav>
      </div>
    </header>
    <main>
      <section id="beranda" class="hero">
        <div class="wrap hero-grid">
          <div>
            <span class="eyebrow">● BUDAYA AMAN DIMULAI DARI KITA</span>
            <h1>Kampus aman,<br /><span>belajar nyaman.</span></h1>
            <p>Portal informasi Keselamatan dan Kesehatan Kerja (K3) Universitas Lancang Kuning. Temukan panduan keselamatan, kenali potensi bahaya, dan ikut membangun lingkungan belajar yang sehat serta selamat.</p>
            <div class="actions">
              <a class="btn primary" href="#tentang">Jelajahi Informasi K3 ↗</a>
              <a class="btn outline" href="#lapor">Laporkan Bahaya</a>
            </div>
          </div>
          <div class="hero-art" aria-label="Logo SAFEMATE K3 dan pesan keselamatan">
            <div class="herologo"><svg aria-hidden="true"><use href="#safemate-k3-logo" /></svg></div>
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

      <section id="video" class="video-section">
        <div class="wrap">
          <div class="sectionhead">
            <span class="kicker">Video singkat</span>
            <h2>Belajar K3 lewat video singkat.</h2>
            <p>Tonton materi tentang bahaya, APAR, keselamatan, dan SafeMate.</p>
          </div>
          <div class="video-grid">
            <article v-for="video in videos" :key="video.id" class="video-card">
              <div class="video-frame">
                <iframe
                  :src="`https://www.youtube-nocookie.com/embed/${video.id}`"
                  :title="video.title"
                  loading="lazy"
                  referrerpolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowfullscreen
                ></iframe>
              </div>
              <div class="video-copy">
                <h3>{{ video.title }}</h3>
                <p>{{ video.description }}</p>
                <a :href="`https://youtu.be/${video.id}`" target="_blank" rel="noopener noreferrer">Tonton di YouTube ↗</a>
              </div>
            </article>
          </div>
        </div>
      </section>

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
          <div class="sectionhead"><span class="kicker">Kesiapsiagaan darurat</span><h2>Denah dan jalur evakuasi Gedung Rektorat.</h2><p>Pelajari jalur evakuasi, letak APAR, kotak P3K, pintu keluar, dan daftar ruangan di setiap lantai sebelum keadaan darurat terjadi.</p></div>
          <div class="map-layout">
            <div class="mapbox">
              <div class="tabs" aria-label="Pilih lantai">
                <button
                  v-for="(floor, index) in evacuationFloors"
                  :key="floor.name"
                  class="tab"
                  type="button"
                  :aria-pressed="selectedFloor === index"
                  @click="selectedFloor = index"
                >
                  {{ floor.name }}
                </button>
              </div>
              <div class="maptitle">
                <h3>Denah evakuasi {{ activeEvacuationFloor.name }} · Gedung Rektorat</h3>
                <p>Klik denah untuk memperbesar.</p>
              </div>
              <div class="schematic">
                <button class="plan-trigger" type="button" :aria-label="`Perbesar denah ${activeEvacuationFloor.name}`" @click="planPreviewOpen = true">
                  <img
                    class="plan"
                    :src="activeEvacuationFloor.image"
                    :alt="`Denah dan jalur evakuasi ${activeEvacuationFloor.name} Gedung Rektorat Universitas Lancang Kuning`"
                  />
                </button>
              </div>
              <div class="planact">
                <a
                  class="btn lightbtn"
                  :href="activeEvacuationFloor.pdf"
                  :download="`Denah-Evakuasi-Rektorat-${activeEvacuationFloor.name.replace(' ', '-')}.pdf`"
                >
                  Unduh PDF ↓
                </a>
              </div>
            </div>
            <div class="mapnotes">
              <article class="mapnote"><h3>🚪 Saat alarm berbunyi</h3><p>Hentikan aktivitas, tetap tenang, ikuti rambu dan instruksi petugas, serta gunakan tangga darurat jika tersedia. Jangan menggunakan lift saat kebakaran.</p></article>
              <article class="mapnote"><h3>📍 Di titik kumpul</h3><p>Menjauh dari bangunan dan akses kendaraan darurat. Ikuti pendataan petugas dan jangan kembali sebelum dinyatakan aman.</p></article>
              <article class="mapnote"><h3>🧯 Jika terjadi kebakaran</h3><p>Aktifkan alarm atau beri peringatan jika aman, lalu segera evakuasi. APAR hanya digunakan oleh orang terlatih apabila api masih kecil dan jalur keluar tetap aman.</p></article>
              <div class="warning"><strong>Penting:</strong> Denah bersumber dari berkas Denah dan Jalur Evakuasi Gedung Rektorat Universitas Lancang Kuning. Tetap ikuti rambu terpasang dan arahan petugas di lokasi.</div>
            </div>
          </div>
          <div class="panel dir">
            <h3>Daftar ruangan</h3>
            <p class="sub">{{ activeEvacuationFloor.name }} · {{ activeEvacuationFloor.rooms.length }} ruangan</p>
            <label class="field room-search">
              <span class="visually-hidden">Cari ruangan</span>
              <input v-model="roomQuery" type="search" placeholder="Cari ruangan..." aria-label="Cari ruangan" />
            </label>
            <div v-if="filteredRooms.length" class="roomgrid">
              <div v-for="room in filteredRooms" :key="`${room.number}-${room.name}`" class="room">
                <b>{{ room.number }}</b><span>{{ room.name }}</span>
              </div>
            </div>
            <p v-else class="empty">Ruangan tidak ditemukan.</p>
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
    <div v-if="planPreviewOpen" class="modal" role="dialog" aria-modal="true" aria-label="Perbesar denah evakuasi" tabindex="-1" @click.self="planPreviewOpen = false" @keydown.esc="planPreviewOpen = false">
      <div class="modalbox wide">
        <button class="close" type="button" aria-label="Tutup denah" @click="planPreviewOpen = false">✕</button>
        <h2>Denah evakuasi {{ activeEvacuationFloor.name }} · Gedung Rektorat</h2>
        <div class="plan-large-wrap"><img class="plan-large" :src="activeEvacuationFloor.image" :alt="`Denah evakuasi ${activeEvacuationFloor.name}`" /></div>
      </div>
    </div>
    <div v-if="notification" class="toast" role="status" aria-live="polite">{{ notification }}</div>
  </div>
</template>
