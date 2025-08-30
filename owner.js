const API_URL =
  "https://script.google.com/macros/s/AKfycbxNKw7TocQBlrNpZoPAilWsLOlcKAyR7OxZ_3FIw6jacV3TaEkLcmy5tycoYUZmJusY-w/exec";

// --- Event Listener Utama ---
document.addEventListener("DOMContentLoaded", () => {
  // Cek dulu "saku" (localStorage)
  const savedRole = localStorage.getItem("ownerRole");

  if (savedRole === "owner") {
    // Jika kunci "owner" ditemukan, langsung masuk!
    console.log("Sesi owner ditemukan, langsung masuk ke dashboard.");
    document.getElementById("login-section").classList.add("hidden");
    document.getElementById("dashboard-section").classList.remove("hidden");
    initDashboard(); // Jalankan aplikasi utama
  } else {
    // Jika tidak ada kunci, baru tampilkan form login dan pasang listener
    console.log("Tidak ada sesi, tampilkan halaman login.");
    const loginForm = document.getElementById("ownerLoginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", handleOwnerLogin);
    }
  }
});

// --- Fungsi-fungsi Login & Inisialisasi ---
async function handleOwnerLogin(e) {
  e.preventDefault();
  const username = document.getElementById("owner-username").value;
  const password = document.getElementById("owner-password").value;
  const loginButton = document.querySelector("#ownerLoginForm button");
  loginButton.textContent = "Memverifikasi...";
  loginButton.disabled = true;

  try {
    const loginData = JSON.stringify({ username, password });
    const response = await fetch(
      `${API_URL}?action=login&data=${encodeURIComponent(loginData)}`
    );
    const result = await response.json();

    if (result.status === "success" && result.role === "owner") {
      localStorage.setItem("ownerRole", result.role);
      localStorage.setItem("ownerBranchId", result.idCabang);
      localStorage.setItem("ownerBranchName", result.namaCabang);
      document.getElementById("login-section").classList.add("hidden");
      document.getElementById("dashboard-section").classList.remove("hidden");

      // Setelah login, panggil fungsi setup utama
      initDashboard();
    } else {
      alert(result.message || "Anda tidak memiliki hak akses sebagai Owner.");
      loginButton.textContent = "Login";
      loginButton.disabled = false;
    }
  } catch (error) {
    alert("Gagal terhubung ke server.");
    loginButton.textContent = "Login";
    loginButton.disabled = false;
  }
}

function initDashboard() {
  setupNavigation(); // Pasang semua listener navigasi
  renderOwnerDashboard(); // Tampilkan halaman dashboard sebagai default
}

function setupNavigation() {
  // Tombol Hamburger & Overlay
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const menuPanel = document.getElementById("mobile-menu");
  const menuOverlay = document.getElementById("menu-overlay");

  const toggleMenu = () => {
    menuPanel.classList.toggle("is-active");
    menuOverlay.classList.toggle("is-active");
    document.body.classList.toggle("menu-open");
  };

  if (hamburgerBtn && menuPanel && menuOverlay) {
    hamburgerBtn.addEventListener("click", toggleMenu);
    menuOverlay.addEventListener("click", toggleMenu);
  }

  // Penanganan klik link navigasi (Desktop & Mobile)
  const handleNavClick = (e, renderFunction) => {
    e.preventDefault();
    renderFunction();
    if (document.body.classList.contains("menu-open")) {
      toggleMenu(); // Tutup menu jika sedang terbuka (untuk mobile)
    }
  };

  document
    .getElementById("desktop-nav-dashboard")
    ?.addEventListener("click", (e) => handleNavClick(e, renderOwnerDashboard));
  document
    .getElementById("mobile-nav-dashboard")
    ?.addEventListener("click", (e) => handleNavClick(e, renderOwnerDashboard));

  document
    .getElementById("desktop-nav-laporan")
    ?.addEventListener("click", (e) =>
      handleNavClick(e, renderLaporanTransaksi)
    );
  document
    .getElementById("mobile-nav-laporan")
    ?.addEventListener("click", (e) =>
      handleNavClick(e, renderLaporanTransaksi)
    );
  document
    .getElementById("desktop-nav-analisis")
    ?.addEventListener("click", (e) =>
      handleNavClick(e, renderAnalisisLayanan)
    );
  document
    .getElementById("mobile-nav-analisis")
    ?.addEventListener("click", (e) =>
      handleNavClick(e, renderAnalisisLayanan)
    );
  document
    .getElementById("desktop-nav-logout")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });
  document
    .getElementById("mobile-nav-logout")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });
}

async function renderOwnerDashboard() {
  setActiveNav("desktop-nav-dashboard", "mobile-nav-dashboard");
  const mainContainer = document.querySelector("#dashboard-section main");
  // Tampilkan kerangka HTML dashboard
  mainContainer.innerHTML = `
  <div class="page-header">
            <h2> Dashboard</h2>
            
        </div>
        <div class="summary-cards">
            <div class="card"><h3>Pendapatan Hari Ini</h3><p id="kpi-revenue-today">Memuat...</p></div>
            <div class="card"><h3>Transaksi Hari Ini</h3><p id="kpi-transactions-today">Memuat...</p></div>
            <div class="card"><h3>Pendapatan Bulan Ini</h3><p id="kpi-revenue-month">Memuat...</p></div>
            <div class="card"><h3>Pelanggan Baru (Bulan Ini)</h3><p id="kpi-new-customers">Memuat...</p></div>
        </div>
        <div class="chart-grid">
            <div class="chart-card"><h3>Tren Pendapatan (7 Hari)</h3><div class="chart-wrapper"><canvas id="revenueChart"></canvas></div></div>
            <div class="chart-card"><h3>Komposisi Layanan (Bulan Ini)</h3><div class="chart-wrapper"><canvas id="serviceChart"></canvas></div></div>
        </div>
        <div class="recent-transactions">
            <h2><i class="fas fa-history"></i> Transaksi Terbaru</h2>
            <div class="table-container"><table id="recent-table"><thead><tr>
                        <th>ID Transaksi</th>
                        <th>Pelanggan</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Cabang</th>
                    </tr></thead><tbody></tbody></table></div>
        </div>`;

  // Ambil data dari server
  try {
    const response = await fetch(`${API_URL}?action=getOwnerSummary`);
    if (!response.ok) throw new Error("Gagal mengambil data summary");
    const data = await response.json();
    updateDashboardUI(data); // Panggil fungsi update khusus dashboard
  } catch (error) {
    console.error("Gagal mengambil data owner:", error);
    mainContainer.innerHTML = "<h1>Gagal memuat data.</h1>";
  }
}

function renderRevenueChart(dailyData) {
  const ctx = document.getElementById("revenueChart");
  if (!ctx) return;
  const labels = Object.keys(dailyData).sort();
  const chartData = labels.map((label) => dailyData[label]);

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Pendapatan",
          data: chartData,
          borderColor: "#007bff",
          backgroundColor: "rgba(0, 123, 255, 0.1)",
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

function renderServiceChart(serviceData) {
  const ctx = document.getElementById("serviceChart");
  if (!ctx) return;
  const labels = Object.keys(serviceData);
  const chartData = Object.values(serviceData);

  // Sort data from highest to lowest and take top 5
  const top5 = labels
    .map((label, index) => ({ label, value: chartData[index] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: top5.map((d) => d.label),
      datasets: [
        {
          label: "Omzet",
          data: top5.map((d) => d.value),
          backgroundColor: [
            "#007bff",
            "#28a745",
            "#ffc107",
            "#17a2b8",
            "#6c757d",
          ],
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

// TAMBAHKAN FUNGSI-FUNGSI BARU INI DI owner.js

// Fungsi untuk membuat halaman Laporan Transaksi
function renderLaporanTransaksi() {
  setActiveNav("desktop-nav-laporan", "mobile-nav-laporan");
  const mainContainer = document.querySelector("#dashboard-section main");

  const html = `
  <div class="page-header">
            <h2> Laporan Transaksi</h2>
            
        </div>
        <div class="filter-bar">
            <div>
                <label for="tgl-mulai">Dari Tanggal</label>
                <input type="date" id="tgl-mulai">
            </div>
            <div>
                <label for="tgl-akhir">Sampai Tanggal</label>
                <input type="date" id="tgl-akhir">
            </div>
            <div>
                <label for="filter-status">Status</label>
                <select id="filter-status">
                    <option value="SEMUA">Semua Status</option>
                    <option value="Diterima">Diterima</option>
                    <option value="Proses Cuci">Proses Cuci</option>
                    <option value="Siap Diambil">Siap Diambil</option>
                    <option value="Selesai">Selesai</option>
                </select>
            </div>
            <button id="btn-terapkan-filter" class="btn-primary">Terapkan</button>
        </div>
        <div class="table-container">
            <table id="laporan-transaksi-table">
                <thead>
                    <tr>
                        <th>ID Transaksi</th>
                        <th>Tanggal</th>
                        <th>Pelanggan</th>
                        <th>Total</th>
                        <th>Status Bayar</th>
                        <th>Status Proses</th>
                        <th>Cabang</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="7">Memuat data...</td></tr>
                </tbody>
            </table>
        </div>
    `;
  mainContainer.innerHTML = html;

  // Set tanggal default (misal: bulan ini)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  document.getElementById("tgl-mulai").valueAsDate = firstDay;
  document.getElementById("tgl-akhir").valueAsDate = today;

  // Tambahkan event listener ke tombol
  document
    .getElementById("btn-terapkan-filter")
    .addEventListener("click", loadLaporanData);

  // Langsung muat data saat halaman pertama kali dibuka
  loadLaporanData();
}

// Fungsi untuk memuat data berdasarkan filter
async function loadLaporanData() {
  const tableBody = document.querySelector("#laporan-transaksi-table tbody");
  tableBody.innerHTML = `<tr><td colspan="7">Memuat data...</td></tr>`;

  const filters = {
    tanggalMulai: document.getElementById("tgl-mulai").value,
    tanggalAkhir: document.getElementById("tgl-akhir").value,
    status: document.getElementById("filter-status").value,
    idCabang: "SEMUA", // Nanti bisa kita buat dinamis
  };
  console.log("Filter yang dikirim dari browser:", filters);
  try {
    const response = await fetch(
      `${API_URL}?action=getFilteredTransactions&filters=${encodeURIComponent(
        JSON.stringify(filters)
      )}`
    );
    const data = await response.json();
    populateLaporanTable(data);
  } catch (error) {
    console.error("Gagal memuat laporan:", error);
    tableBody.innerHTML = `<tr><td colspan="7">Gagal memuat data.</td></tr>`;
  }
}

// Fungsi untuk mengisi tabel dengan data
function populateLaporanTable(data) {
  const tableBody = document.querySelector("#laporan-transaksi-table tbody");
  tableBody.innerHTML = ""; // Kosongkan

  if (data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7">Tidak ada data untuk filter yang dipilih.</td></tr>`;
    return;
  }

  data.forEach((trx) => {
    const statusClass =
      trx.Status?.toLowerCase().replace(/ /g, "-") || "default";
    const tglMasuk = new Date(trx.Tanggal_Masuk).toLocaleString("id-ID");
    tableBody.innerHTML += `
            <tr>
                <td>${trx.ID_Transaksi}</td>
                <td>${tglMasuk}</td>
                <td>${trx.Nama_Pelanggan}</td>
                <td>Rp ${Number(trx.Total_Harga).toLocaleString("id-ID")}</td>
                <td>${trx.Status_Bayar}</td>
                <td><span class="status ${statusClass}">${
      trx.Status
    }</span></td>
                <td>${trx.ID_Cabang || "N/A"}</td>
            </tr>`;
  });
}

function updateDashboardUI(data) {
  console.log("Memulai updateUI, data yang diterima:", data);

  // Fungsi bantuan untuk update elemen dengan aman
  const updateElement = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    } else {
      // Jika elemen tidak ditemukan, beri pesan error yang jelas
      console.error(`ERROR: Elemen dengan ID '${id}' TIDAK DITEMUKAN di HTML!`);
    }
  };

  // --- Update Kartu KPI ---
  updateElement(
    "kpi-revenue-today",
    `Rp ${data.kpi.revenueToday.toLocaleString("id-ID")}`
  );
  updateElement("kpi-transactions-today", data.kpi.transactionsToday);
  updateElement(
    "kpi-revenue-month",
    `Rp ${data.kpi.revenueThisMonth.toLocaleString("id-ID")}`
  );
  updateElement("kpi-new-customers", data.kpi.newCustomersThisMonth);

  // --- Render Grafik & Diagram ---
  renderRevenueChart(data.charts.dailyRevenue);
  renderServiceChart(data.charts.serviceComposition);

  // --- Update Tabel Transaksi Terakhir ---
  const tableBody = document.querySelector("#recent-table tbody");

  if (tableBody) {
    tableBody.innerHTML = ""; // Kosongkan
    if (data.recentTransactions && data.recentTransactions.length > 0) {
      data.recentTransactions.forEach((trx) => {
        const statusClass =
          trx.Status?.toLowerCase().replace(/ /g, "-") || "default";
        tableBody.innerHTML += `
            <tr>
                <td data-label="ID Transaksi">${trx.ID_Transaksi}</td>
                <td data-label="Pelanggan">${trx.Nama_Pelanggan}</td>
                <td data-label="Total">Rp ${Number(
                  trx.Total_Harga
                ).toLocaleString("id-ID")}</td>
                <td data-label="Status"><span class="status ${statusClass}">${
          trx.Status
        }</span></td>
                <td data-label="Cabang">${trx.ID_Cabang || "N/A"}</td>
            </tr>`;
      });
    } else {
      tableBody.innerHTML = `<tr><td colspan="5">Belum ada transaksi.</td></tr>`;
    }
  } else {
    // Jika 'tbody' dari tabel tidak ditemukan
    console.error(
      "ERROR: Elemen '#recent-table tbody' TIDAK DITEMUKAN di HTML!"
    );
  }
}

// Fungsi untuk mengatur menu navbar yang aktif
function setActiveNav(desktopId, mobileId) {
  document
    .querySelectorAll(".nav-links a, .mobile-menu a")
    .forEach((link) => link.classList.remove("active"));
  document.getElementById(desktopId)?.classList.add("active");
  document.getElementById(mobileId)?.classList.add("active");
}

// GANTI SELURUH FUNGSI renderAnalisisLayanan ANDA DENGAN INI

function renderAnalisisLayanan() {
  setActiveNav("desktop-nav-analisis", "mobile-nav-analisis");
  const mainContainer = document.querySelector("#dashboard-section main");
  if (!mainContainer) return;

  // 1. Buat kerangka HTML yang LENGKAP, termasuk isi dari .filter-bar
  mainContainer.innerHTML = `
      <div class="page-header">
            <h2> Analisis Layanan</h2>
            
        </div>
        <div class="filter-bar">
            <div>
                <label for="tgl-mulai">Dari Tanggal</label>
                <input type="date" id="tgl-mulai">
            </div>
            <div>
                <label for="tgl-akhir">Sampai Tanggal</label>
                <input type="date" id="tgl-akhir">
            </div>
            <div>
                <label for="filter-cabang">Cabang</label>
                <select id="filter-cabang">
                    <option value="SEMUA">Semua Cabang</option>
                    </select>
            </div>
            <button id="btn-terapkan-filter-layanan" class="btn-primary">Terapkan</button>
        </div>

        <div class="summary-cards" id="layanan-summary">
            <div class="card"><h3>Total Order Layanan</h3><p id="total-order">Memuat...</p></div>
            <div class="card"><h3>Total Omzet Layanan</h3><p id="total-omzet">Memuat...</p></div>
            <div class="card"><h3>Rata-rata per Order</h3><p id="avg-order-value">Memuat...</p></div>
            <div class="card"><h3>Layanan Terlaris</h3><p id="top-service" style="font-size: 18px;">Memuat...</p></div>
        </div>
        <div class="analysis-grid">
            <div class="chart-card">
                <h3>Top 5 Layanan (by Omzet)</h3>
                <div class="chart-wrapper"><canvas id="topServicesChart"></canvas></div>
            </div>
            <div class="table-container">
                <h3>Rangkuman Semua Layanan</h3>
                <table id="layanan-summary-table">
                    <thead>
                        <tr><th>Nama Layanan</th><th>Jumlah Order</th><th>Total Omzet</th></tr>
                    </thead>
                    <tbody id="layanan-table-body">
                        <tr><td colspan="3">Memuat data...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

  // 2. Set tanggal default setelah HTML-nya dijamin ada
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  document.getElementById("tgl-mulai").valueAsDate = firstDay;
  document.getElementById("tgl-akhir").valueAsDate = today;

  // 3. Pasang event listener ke tombol yang sekarang sudah ada
  document
    .getElementById("btn-terapkan-filter-layanan")
    .addEventListener("click", loadLayananData);

  // 4. Muat data saat halaman pertama kali dibuka
  loadLayananData();
}

// GANTI FUNGSI loadLayananData ANDA DENGAN VERSI LENGKAP INI

async function loadLayananData() {
  // Cari tbody
  const tableBody = document.querySelector("#layanan-summary-table tbody");
  if (!tableBody) {
    console.warn("⚠️ Elemen summary layanan belum ada di DOM, skip dulu");
    return; // langsung stop biar gak lanjut fetch
  }

  // Kalau ketemu, kasih indikator loading
  tableBody.innerHTML = `<tr><td colspan="3">Memuat data analisis...</td></tr>`;

  // Ambil nilai filter
  const filters = {
    tanggalMulai: document.getElementById("tgl-mulai").value,
    tanggalAkhir: document.getElementById("tgl-akhir").value,
    idCabang: document.getElementById("filter-cabang").value,
  };

  try {
    // Fetch data
    const response = await fetch(
      `${API_URL}?action=getServiceAnalysis&filters=${encodeURIComponent(
        JSON.stringify(filters)
      )}`
    );
    const data = await response.json();

    console.log("Data dari server:", data);

    // Render tabel & chart
    populateLayananTable(data);
    renderLayananChart(data);
  } catch (error) {
    console.error("Gagal memuat analisis layanan:", error);
    tableBody.innerHTML = `<tr><td colspan="3">Gagal memuat data.</td></tr>`;
  }
}

function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

function populateLayananTable(data) {
  const tableBody = document.getElementById("layanan-table-body");
  if (!tableBody) return;

  tableBody.innerHTML = "";
  if (data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="3">Tidak ada data.</td></tr>`;
  } else {
    data.forEach((item) => {
      tableBody.innerHTML += `
                <tr>
                    <td>${item.layanan}</td>
                    <td>${item.orderCount}</td>
                    <td>${formatRupiah(item.totalRevenue)}</td>
                </tr>`;
    });
  }

  // --- HITUNG DAN UPDATE SUMMARY DI SINI ---
  const totalOrder = data.reduce((sum, item) => sum + item.orderCount, 0);
  const totalOmzet = data.reduce((sum, item) => sum + item.totalRevenue, 0);
  const avgOrderValue = totalOrder > 0 ? totalOmzet / totalOrder : 0;
  let topService = data.length > 0 ? data[0].layanan : "-";

  document.getElementById("total-order").textContent = totalOrder;
  document.getElementById("total-omzet").textContent = formatRupiah(totalOmzet);
  document.getElementById("avg-order-value").textContent =
    formatRupiah(avgOrderValue);
  document.getElementById("top-service").textContent = topService;
}

let layananChart = null;

function renderLayananChart(data) {
  const ctx = document.getElementById("topServicesChart");
  if (!ctx) return;

  if (layananChart) layananChart.destroy(); // Hapus chart lama

  const top5Data = data.slice(0, 5);

  layananChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top5Data.map((d) => d.layanan),
      datasets: [
        {
          label: "Total Omzet",
          data: top5Data.map((d) => d.totalRevenue),
          backgroundColor: "#007bff",
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });
}

function handleLogout() {
  // 1. Hapus semua "kunci" owner dari localStorage
  localStorage.removeItem("ownerRole");
  localStorage.removeItem("ownerBranchId");
  localStorage.removeItem("ownerBranchName");

  // 2. Muat ulang halaman
  location.reload();
}
