const API_URL =
  "https://script.google.com/macros/s/AKfycbwQKdKGEYgg3o-9Nes9FlX5fxiSmvyErlDNYza49-a99g2JelAdEnzpHRWtZUptpUXDfg/exec";

let dataLaporanSaatIni = [];
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

let daftarCabang = [];
function initDashboard() {
  setupNavigation(); // Pasang semua listener navigasi
  renderOwnerDashboard(); // Tampilkan halaman dashboard sebagai default
  fetch(`${API_URL}?action=getBranchList`)
    .then((res) => res.json())
    .then((data) => {
      daftarCabang = data; // Simpan ke variabel global
      renderOwnerDashboard(); // Baru render dashboard setelah daftar cabang ada
    })
    .catch((err) => console.error("Gagal memuat daftar cabang:", err));
}

// GANTI SELURUH FUNGSI setupNavigation ANDA DENGAN INI

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

  // Fungsi bantuan untuk menangani klik link navigasi
  const handleNavClick = (e, renderFunction) => {
    e.preventDefault();
    renderFunction();
    if (document.body.classList.contains("menu-open")) {
      toggleMenu(); // Otomatis tutup menu jika di HP
    }
  };

  // --- PASANG SEMUA EVENT LISTENER DI SINI ---

  // Dashboard
  document
    .getElementById("desktop-nav-dashboard")
    ?.addEventListener("click", (e) => handleNavClick(e, renderOwnerDashboard));
  document
    .getElementById("mobile-nav-dashboard")
    ?.addEventListener("click", (e) => handleNavClick(e, renderOwnerDashboard));

  // Laporan Transaksi
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

  // Analisis Layanan (INI YANG BARU DITAMBAHKAN)
  document
    .getElementById("desktop-nav-analisis-layanan")
    ?.addEventListener("click", (e) =>
      handleNavClick(e, renderAnalisisLayanan)
    );
  document
    .getElementById("mobile-nav-analisis-layanan")
    ?.addEventListener("click", (e) =>
      handleNavClick(e, renderAnalisisLayanan)
    );

  // Analisis Pelanggan
  document
    .getElementById("desktop-nav-analisis-pelanggan")
    ?.addEventListener("click", (e) =>
      handleNavClick(e, renderAnalisisPelanggan)
    );
  document
    .getElementById("mobile-nav-analisis-pelanggan")
    ?.addEventListener("click", (e) =>
      handleNavClick(e, renderAnalisisPelanggan)
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
  const existingChart = Chart.getChart(ctx);
  if (existingChart) {
    existingChart.destroy(); // Jika ada, hancurkan grafik lama
  }
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
  const existingChart = Chart.getChart(ctx);
  if (existingChart) {
    existingChart.destroy(); // Jika ada, hancurkan grafik lama
  }
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

// GANTI SELURUH FUNGSI renderLaporanTransaksi ANDA DENGAN INI

function renderLaporanTransaksi() {
  setActiveNav("desktop-nav-laporan", "mobile-nav-laporan");
  const mainContainer = document.querySelector("#dashboard-section main");
  if (!mainContainer) return;

  mainContainer.innerHTML = `
        <div class="page-header">
            <h2><i class="fas fa-file-invoice-dollar"></i> Laporan Transaksi</h2>

        </div>
        <div class="filter-bar">
            <div><label for="tgl-mulai">Dari Tanggal</label><input type="date" id="tgl-mulai"></div>
            <div><label for="tgl-akhir">Sampai Tanggal</label><input type="date" id="tgl-akhir"></div>
            <div>
                <label for="filter-cabang">Cabang</label>
                <select id="filter-cabang">
                    <option value="SEMUA">Semua Cabang</option>
                </select>
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
            <button id="btn-ekspor-excel" class="btn-secondary">
            <i class="fas fa-file-excel"></i> Ekspor
        </button>
        </div>
        <div class="table-container">
            <table id="laporan-transaksi-table">
                <thead>
                    <tr>
                        <th>ID Transaksi</th><th>Tanggal</th><th>Pelanggan</th><th>Total</th><th>Status Bayar</th><th>Status Proses</th><th>Cabang</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="7">Memuat data...</td></tr>
                </tbody>
            </table>
        </div>
    `;

  setTimeout(() => {
    // Set tanggal default
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById("tgl-mulai").valueAsDate = firstDay;
    document.getElementById("tgl-akhir").valueAsDate = today;

    // Isi dropdown cabang
    const selectCabang = document.getElementById("filter-cabang");
    if (selectCabang && daftarCabang) {
      daftarCabang.forEach((cabang) => {
        if (cabang.ID_Cabang !== "ALL") {
          selectCabang.innerHTML += `<option value="${cabang.ID_Cabang}">${cabang.Nama_Cabang}</option>`;
        }
      });
    }

    // Tambahkan event listener ke tombol
    document
      .getElementById("btn-terapkan-filter")
      .addEventListener("click", loadLaporanData);
    document
      .getElementById("btn-ekspor-excel")
      .addEventListener("click", () => {
        const tglMulai = document.getElementById("tgl-mulai").value;
        const tglAkhir = document.getElementById("tgl-akhir").value;
        exportToCsv(
          dataLaporanSaatIni,
          `Laporan Transaksi ${tglMulai} - ${tglAkhir}.csv`
        );
      });

    // Langsung muat data saat halaman pertama kali dibuka
    loadLaporanData(); // <-- PINDAHKAN KE SINI, DI DALAM setTimeout
  }, 0);

  // HAPUS DARI SINI
}

// Fungsi untuk memuat data berdasarkan filter
async function loadLaporanData() {
  const tableBody = document.querySelector("#laporan-transaksi-table tbody");
  tableBody.innerHTML = `<tr><td colspan="7">Memuat data...</td></tr>`;

  const filters = {
    tanggalMulai: document.getElementById("tgl-mulai").value,
    tanggalAkhir: document.getElementById("tgl-akhir").value,
    status: document.getElementById("filter-status").value,
    idCabang: document.getElementById("filter-cabang").value,
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
  dataLaporanSaatIni = data;
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
            <h2><i class="fas fa-tools"></i> Analisis Layanan</h2>

            
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

  const selectCabang = document.getElementById("filter-cabang");
  if (selectCabang && daftarCabang) {
    daftarCabang.forEach((cabang) => {
      // Jangan tampilkan 'ALL' sebagai pilihan cabang
      if (cabang.ID_Cabang !== "ALL") {
        selectCabang.innerHTML += `<option value="${cabang.ID_Cabang}">${cabang.Nama_Cabang}</option>`;
      }
    });
  }
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

// FUNGSI BARU UNTUK EKSPOR KE CSV
function exportToCsv(data, filename) {
  if (data.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }

  // 1. Buat Header CSV dari nama kolom objek pertama
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(";")]; // ['ID_Transaksi,Nama_Pelanggan,...']

  // 2. Buat baris data
  for (const row of data) {
    const values = headers.map((header) => {
      let value = row[header];
      // Tangani koma di dalam data dengan membungkusnya dalam tanda kutip
      if (typeof value === "string" && value.includes(",")) {
        value = `"${value}"`;
      }
      return value;
    });
    csvRows.push(values.join(";"));
  }

  // 3. Gabungkan semua baris menjadi satu teks besar
  const csvString = csvRows.join("\n");

  // 4. Buat file dan picu download
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// GANTI FUNGSI renderAnalisisPelanggan ANDA DENGAN INI

// GANTI SELURUH FUNGSI INI DI owner.js

function renderAnalisisPelanggan() {
  console.log("1. Memulai renderAnalisisPelanggan...");
  setActiveNav(
    "desktop-nav-analisis-pelanggan",
    "mobile-nav-analisis-pelanggan"
  );

  const mainContainer = document.querySelector("#dashboard-section main");
  console.log("2. Mencari '#dashboard-section main':", mainContainer); // <-- INI LOG PALING PENTING

  if (!mainContainer) {
    console.error(
      "3. GAGAL: Kontainer utama tidak ditemukan! Proses render berhenti."
    );
    return; // Hentikan fungsi
  }

  console.log("3. SUKSES: Kontainer ditemukan. Mulai menggambar HTML...");
  mainContainer.innerHTML = `
        <div class="page-header">
            <h2><i class="fas fa-users"></i> Analisis Pelanggan</h2>
            
        </div>
        <div class="filter-bar">
            <div><label for="tgl-mulai">Dari Tanggal</label><input type="date" id="tgl-mulai"></div>
            <div><label for="tgl-akhir">Sampai Tanggal</label><input type="date" id="tgl-akhir"></div>
            <div>
                <label for="filter-cabang">Cabang</label>
                <select id="filter-cabang"><option value="SEMUA">Semua Cabang</option></select>
            </div>
            <button id="btn-terapkan-filter-pelanggan" class="btn-primary">Terapkan</button>
        </div>
        <div class="segment-tabs">
            <button class="segment-btn active" data-segment="top-spender">Top Spender</button>
            <button class="segment-btn" data-segment="most-frequent">Paling Sering Datang</button>
            <button class="segment-btn" data-segment="new-customers">Pelanggan Baru</button>
            <button class="segment-btn" data-segment="lost-customers">Pelanggan Hilang</button>
        </div>
        <div class="table-container">
            <h3 id="table-title">Memuat...</h3>
            <table id="pelanggan-summary-table">
                <thead id="pelanggan-table-head"></thead>
                <tbody id="pelanggan-table-body">
                    <tr><td colspan="4">Memuat data...</td></tr>
                </tbody>
            </table>
        </div>
    `;
  console.log("4. HTML untuk Analisis Pelanggan selesai digambar.");

  const selectCabang = document.getElementById("filter-cabang");
  if (selectCabang && daftarCabang) {
    daftarCabang.forEach((cabang) => {
      // Jangan tampilkan 'ALL' sebagai pilihan cabang
      if (cabang.ID_Cabang !== "ALL") {
        selectCabang.innerHTML += `<option value="${cabang.ID_Cabang}">${cabang.Nama_Cabang}</option>`;
      }
    });
  }
  setTimeout(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById("tgl-mulai").valueAsDate = firstDay;
    document.getElementById("tgl-akhir").valueAsDate = today;

    document
      .getElementById("btn-terapkan-filter-pelanggan")
      .addEventListener("click", loadCustomerData);
    document.querySelectorAll(".segment-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const segment = button.dataset.segment;
        displayPelangganSegment(segment);
      });
    });

    loadCustomerData();
  }, 0);
}

// GANTI FUNGSI loadCustomerData ANDA
// 1. Fungsi untuk Laporan Transaksi
async function loadLaporanData() {
  const tableBody = document.querySelector("#laporan-transaksi-table tbody");
  if (!tableBody) return;
  tableBody.innerHTML = `<tr><td colspan="7">Memuat data...</td></tr>`;

  const filters = {
    tanggalMulai: document.getElementById("tgl-mulai").value,
    tanggalAkhir: document.getElementById("tgl-akhir").value,
    status: document.getElementById("filter-status").value,
    idCabang: document.getElementById("filter-cabang").value,
  };

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

// 2. Fungsi untuk Analisis Pelanggan
async function loadCustomerData() {
  const tableBody = document.querySelector("#pelanggan-summary-table tbody");
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="4">Memuat data...</td></tr>';

  const filters = {
    tanggalMulai: document.getElementById("tgl-mulai").value,
    tanggalAkhir: document.getElementById("tgl-akhir").value,
    idCabang: document.getElementById("filter-cabang").value,
  };

  try {
    const response = await fetch(
      `${API_URL}?action=getCustomerAnalysis&filters=${encodeURIComponent(
        JSON.stringify(filters)
      )}`
    );
    dataAnalisisPelanggan = await response.json();

    const activeSegment =
      document.querySelector(".segment-btn.active")?.dataset.segment ||
      "top-spender";
    displayPelangganSegment(activeSegment);
  } catch (error) {
    console.error("Gagal memuat analisis pelanggan:", error);
    tableBody.innerHTML = '<tr><td colspan="4">Gagal memuat data.</td></tr>';
  }
}

// GANTI FUNGSI displayPelangganSegment LAMA ANDA DENGAN INI
function displayPelangganSegment(segment) {
  document.querySelectorAll(".segment-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.segment === segment);
  });

  const tableHead = document.querySelector("#pelanggan-table-head");
  const tableBody = document.querySelector("#pelanggan-table-body");
  const tableTitle = document.getElementById("table-title");
  tableBody.innerHTML = "";

  let processedData = [];
  let tableHeaders = `<th>Peringkat</th><th>Nama Pelanggan</th><th>Jumlah Kunjungan</th><th>Total Belanja</th>`; // Default headers

  const now = new Date();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(now.getDate() - 90);

  switch (segment) {
    case "top-spender":
      tableTitle.textContent = "Top Pelanggan (Berdasarkan Total Belanja)";
      processedData = [...dataAnalisisPelanggan].sort(
        (a, b) => b.totalSpending - a.totalSpending
      );
      break;

    case "most-frequent":
      tableTitle.textContent = "Top Pelanggan (Berdasarkan Jumlah Kunjungan)";
      processedData = [...dataAnalisisPelanggan].sort(
        (a, b) => b.visitCount - a.visitCount
      );
      break;

    case "new-customers":
      tableTitle.textContent = "Pelanggan Baru (Berdasarkan Tanggal Daftar)";
      tableHeaders = `<th>Nama Pelanggan</th><th>Tanggal Daftar</th><th>Jumlah Kunjungan</th><th>Total Belanja</th>`;
      processedData = dataAnalisisPelanggan
        .filter(
          (c) =>
            c.tanggalDaftar &&
            new Date(c.tanggalDaftar) >=
              new Date(document.getElementById("tgl-mulai").value)
        )
        .sort((a, b) => new Date(b.tanggalDaftar) - new Date(a.tanggalDaftar));
      break;

    case "lost-customers":
      tableTitle.textContent = 'Pelanggan "Hilang" (Tidak Transaksi > 90 Hari)';
      tableHeaders = `<th>Nama Pelanggan</th><th>Kunjungan Terakhir</th><th>Total Belanja</th>`;
      processedData = dataAnalisisPelanggan
        .filter((c) => c.lastVisit && new Date(c.lastVisit) < ninetyDaysAgo)
        .sort((a, b) => new Date(a.lastVisit) - new Date(b.lastVisit));
      break;
  }

  tableHead.innerHTML = `<tr>${tableHeaders}</tr>`;

  if (processedData.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4">Tidak ada data untuk segmen ini.</td></tr>`;
    return;
  }

  processedData.slice(0, 20).forEach((cust, index) => {
    let rowHtml = "";
    if (segment === "new-customers") {
      rowHtml = `
                <td><a href="#" onclick="renderCustomerDetails('${cust.id}')">${
        cust.nama
      }</a></td>
                <td>${new Date(cust.tanggalDaftar).toLocaleDateString(
                  "id-ID"
                )}</td>
                <td>${cust.visitCount} kali</td>
                <td>${formatRupiah(cust.totalSpending)}</td>
            `;
    } else if (segment === "lost-customers") {
      rowHtml = `
                <td><a href="#" onclick="renderCustomerDetails('${cust.id}')">${
        cust.nama
      }</a></td>
                <td>${new Date(cust.lastVisit).toLocaleDateString("id-ID")}</td>
                <td>${formatRupiah(cust.totalSpending)}</td>
            `;
    } else {
      rowHtml = `
                <td>${index + 1}</td>
                <td><a href="#" onclick="renderCustomerDetails('${cust.id}')">${
        cust.nama
      }</a></td>
                <td>${cust.visitCount} kali</td>
                <td>${formatRupiah(cust.totalSpending)}</td>
            `;
    }
    tableBody.innerHTML += `<tr>${rowHtml}</tr>`;
  });
}

// TAMBAHKAN FUNGSI BARU INI DI owner.js

// GANTI SELURUH FUNGSI renderCustomerDetails ANDA DENGAN INI

async function renderCustomerDetails(customerId) {
  const mainContainer = document.querySelector("#dashboard-section main");
  if (!mainContainer) return;

  // Tampilkan kerangka loading dulu
  mainContainer.innerHTML = `
        <div class="page-header">
            <h2><i class="fas fa-user-tag"></i> Detail Pelanggan</h2>
            <p>Memuat riwayat untuk ID: ${customerId}...</p>
        </div>
        <div class="loading-placeholder">Memuat data pelanggan...</div>
    `;

  try {
    // 1. Ambil data detail dari server
    const response = await fetch(
      `${API_URL}?action=getCustomerDetails&id=${customerId}`
    );
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    const profile = data.profile;
    const history = data.history;

    // 2. Siapkan HTML untuk kartu profil
    const profileHtml = `
            <div class="profile-grid">
                <div class="profile-card">
                    <h3>Status Member</h3>
                    <p class="${
                      profile.Status_Member === "Aktif" ? "status-aktif" : ""
                    }">${profile.Status_Member}</p>
                </div>
                <div class="profile-card">
                    <h3>Total Poin</h3>
                    <p>${profile.Total_Poin || 0}</p>
                </div>
                <div class="profile-card">
                    <h3>Total Belanja</h3>
                    <p>${formatRupiah(
                      history.reduce(
                        (sum, trx) => sum + Number(trx.Total_Harga),
                        0
                      )
                    )}</p>
                </div>
                <div class="profile-card">
                    <h3>Jumlah Kunjungan</h3>
                    <p>${history.length} kali</p>
                </div>
            </div>
        `;

    // 3. Siapkan HTML untuk tabel riwayat transaksi
    const historyHtml = history
      .map((trx) => {
        const statusClass =
          trx.Status?.toLowerCase().replace(/ /g, "-") || "default";
        const tglMasuk = new Date(trx.Tanggal_Masuk).toLocaleDateString(
          "id-ID",
          { day: "2-digit", month: "short", year: "numeric" }
        );
        return `
                <tr>
                    <td>${trx.ID_Transaksi}</td>
                    <td>${tglMasuk}</td>
                    <td>Rp ${Number(trx.Total_Harga).toLocaleString(
                      "id-ID"
                    )}</td>
                    <td><span class="status ${statusClass}">${
          trx.Status
        }</span></td>
                    <td>${trx.ID_Cabang || "N/A"}</td>
                </tr>
            `;
      })
      .join("");

    // 4. Gabungkan semua HTML dan render ke halaman
    mainContainer.innerHTML = `
            <div class="page-header">
                <h2>${profile.Nama_Pelanggan}</h2>
                <p>${profile.No_HP || "No HP tidak terdaftar"}</p>
            </div>
            ${profileHtml}
            <div class="table-container">
                <h3>Riwayat Transaksi</h3>
                <table id="customer-history-table">
                    <thead>
                        <tr>
                            <th>ID Transaksi</th>
                            <th>Tanggal Masuk</th>
                            <th>Total</th>
                            <th>Status Proses</th>
                            <th>Cabang</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historyHtml}
                    </tbody>
                </table>
            </div>
        `;
  } catch (error) {
    console.error("Gagal memuat detail pelanggan:", error);
    mainContainer.innerHTML = `<h1>Gagal memuat data.</h1><p>${error.message}</p>`;
  }
}

function handleLogout() {
  // 1. Hapus semua "kunci" owner dari localStorage
  localStorage.removeItem("ownerRole");
  localStorage.removeItem("ownerBranchId");
  localStorage.removeItem("ownerBranchName");

  // 2. Muat ulang halaman
  location.reload();
}
