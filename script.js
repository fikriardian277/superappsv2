// =================================================================
// PENGATURAN - WAJIB DIISI
// =================================================================
const API_URL =
  "https://script.google.com/macros/s/AKfycbwhNlD0p0r6beOlDie6LIBJSJIRS1GHXM-rmuih9f7vRuxStEElnrthvgn4Hv48zAD0yg/exec";

// =================================================================
// Variabel Global
// =================================================================
let daftarLayanan = [],
  semuaTransaksi = [],
  daftarPelanggan = [];
const appContainer = document.getElementById("app-container");
const loadingSpinner = document.getElementById("loading-spinner");

// =================================================================
// TITIK START APLIKASI
// =================================================================
document.addEventListener("DOMContentLoaded", init);

// =================================================================
// LOGIKA UTAMA APLIKASI
// =================================================================

// Fungsi init dipanggil sekali saat aplikasi pertama kali dimuat
async function init() {
  if (loadingSpinner) loadingSpinner.classList.remove("hidden");

  // Pasang event listener ke tombol navigasi
  document
    .getElementById("nav-dashboard")
    .addEventListener("click", renderDashboard);
  document
    .getElementById("nav-tambah")
    .addEventListener("click", renderFormKasir);
  document
    .getElementById("nav-proses")
    .addEventListener("click", () => renderKanban("semua"));
  document
    .getElementById("nav-riwayat")
    .addEventListener("click", () => renderRiwayat());
  document
    .getElementById("nav-pelanggan")
    .addEventListener("click", renderPelanggan);
  // Muat semua data dari Google Sheets
  await muatDataAwal();

  // Tampilkan halaman dashboard sebagai halaman pertama
  renderDashboard();

  // Coba sinkronkan data offline jika ada
  sinkronkanDataOffline();

  // Sembunyikan loading spinner setelah semua siap
  if (loadingSpinner) loadingSpinner.classList.add("hidden");
}

// Fungsi untuk mengambil semua data dari backend
async function muatDataAwal() {
  try {
    const [servicesRes, transactionsRes, customersRes] = await Promise.all([
      fetch(`${API_URL}?action=getServices`),
      fetch(API_URL), // Default action adalah getTransactions
      fetch(`${API_URL}?action=getCustomers`),
    ]);
    daftarLayanan = await servicesRes.json();
    semuaTransaksi = await transactionsRes.json();
    daftarPelanggan = await customersRes.json();
  } catch (error) {
    console.error("Gagal memuat data awal:", error);
    alert(
      "Gagal memuat data awal. Cek koneksi internet atau coba Re-Deploy Apps Script."
    );
  }
}

// =================================================================
// FUNGSI-FUNGSI RENDER HALAMAN
// =================================================================

function renderPage(html) {
  appContainer.innerHTML = html;
}

function updateRiwayatList(filter = "") {
  const listContainer = document.querySelector(".history-list");
  if (!listContainer) return; // Keluar jika container list tidak ditemukan

  let transaksiTersaring = [...semuaTransaksi].reverse();

  const filterText = String(filter || "")
    .trim()
    .toLowerCase();

  if (filterText) {
    transaksiTersaring = transaksiTersaring.filter(
      (trx) =>
        (trx.Nama_Pelanggan &&
          trx.Nama_Pelanggan.toLowerCase().includes(filterText)) ||
        (trx.ID_Transaksi &&
          trx.ID_Transaksi.toLowerCase().includes(filterText))
    );
  }

  let listItems = transaksiTersaring
    .map((trx) => {
      const statusClass = (trx.Status || "N/A")
        .replace(/ /g, "-")
        .toLowerCase();
      return `
        <li class="history-item" data-id="${trx.ID_Transaksi}">
            <div class="history-item-main">
                <strong class="history-item-name">${
                  trx.Nama_Pelanggan || "Tanpa Nama"
                }</strong>
                <span class="history-item-id">${trx.ID_Transaksi}</span>
            </div>
            <div class="history-item-details">
                <span>${
                  trx.Tanggal_Masuk
                    ? new Date(trx.Tanggal_Masuk).toLocaleDateString("id-ID")
                    : "N/A"
                }</span>
                <span class="status-badge status-${statusClass}">${
        trx.Status || "N/A"
      }</span>
            </div>
        </li>
      `;
    })
    .join("");

  // Update HANYA bagian list-nya saja
  listContainer.innerHTML =
    listItems.length > 0
      ? listItems
      : "<li>Tidak ada transaksi ditemukan.</li>";

  // Pasang ulang event listener untuk item yang baru
  document.querySelectorAll(".history-item").forEach((item) => {
    item.addEventListener("click", () =>
      renderDetailTransaksi(item.dataset.id)
    );
  });
}

// FUNGSI LAMA YANG DIPERBAIKI: Hanya untuk render kerangka halaman
function renderRiwayat() {
  // Hapus parameter filter
  setActiveNav("riwayat");
  renderPage(`
        <div class="page-container">
            <header class="header-simple"><h1>Riwayat Order</h1></header>
            <main>
                <div class="search-container">
                    <input type="text" id="searchRiwayat" placeholder="Cari nama atau ID transaksi...">
                </div>
                <ul class="history-list">
                    </ul>
            </main>
        </div>
    `);

  // Panggil update list untuk menampilkan data awal
  updateRiwayatList();

  // Event listener sekarang memanggil fungsi update, bukan render ulang
  document
    .getElementById("searchRiwayat")
    .addEventListener("input", (e) => updateRiwayatList(e.target.value));
}

function renderDashboard() {
  setActiveNav("dashboard");
  renderPage(`
        <div class="page-container">
            <header><img src="logo.png" alt="Logo" class="logo"><h1>Dashboard</h1></header>
            <main>
                <div class="chart-container"><canvas id="statusChart"></canvas></div>
                <div class="summary-grid">
                    <div class="summary-card" onclick="renderKanban()"><h3>Order Aktif</h3><p id="active-orders">0</p></div>
                    <div class="summary-card" onclick="renderKanban('Siap Diambil')"><h3>Belum Diambil</h3><p id="ready-orders">0</p></div>
                    <div class="summary-card"><h3>Revenue Hari Ini</h3><p id="revenue-today">Rp 0</p></div>
                    <div class="summary-card"><h3>Order Hari Ini</h3><p id="orders-today">0</p></div>
                </div>
            </main>
        </div>`);
  hitungStatistik();
  renderStatusChart();
}

// GANTI SELURUH FUNGSI renderFormKasir DENGAN VERSI INI
function renderFormKasir(pelanggan = null) {
  setActiveNav("tambah");

  // Hapus baris ini:
  // const notif = pelanggan ? `<div class="notif-pelanggan">Pelanggan sudah terdaftar: **${pelanggan.Nama_Pelanggan}**</div>` : "";

  renderPage(`
        <div class="page-container">
            <header class="header-simple"><h1>Tambah Order Baru</h1></header>
            <main class="form-container">
                <form id="laundryForm">
                    ${
                      !pelanggan
                        ? `
                    <div class="form-group">
                        <label for="searchPelanggan">Cari Pelanggan (Nama/HP)</label>
                        <input type="text" id="searchPelanggan" list="pelanggan-list" placeholder="Ketik untuk mencari...">
                        <datalist id="pelanggan-list"></datalist>
                    </div>`
                        : ""
                    }
                    
                    <input type="hidden" id="idPelanggan" value="${
                      pelanggan ? pelanggan.ID_Pelanggan || "" : ""
                    }">
                    <div class="form-group">
                        <label for="namaPelanggan">Nama Pelanggan</label>
                        <input type="text" id="namaPelanggan" value="${
                          pelanggan ? pelanggan.Nama_Pelanggan || "" : ""
                        }" required>
                    </div>
                    <div class="form-group">
                        <label for="noHp">Nomor HP</label>
                        <input type="number" id="noHp" value="${
                          pelanggan ? pelanggan.No_HP || "" : ""
                        }" placeholder="62812..." required>
                    </div>
                    
                    <div class="form-group"><label for="kategori">Kategori</label><select id="kategori" required><option value="">-- Pilih --</option></select></div>
                    <div class="form-group"><label for="layanan">Layanan</label><select id="layanan" required disabled><option value="">-- Pilih --</option></select></div>
                    <div class="form-group"><label for="paket">Paket</label><select id="paket" required disabled><option value="">-- Pilih --</option></select></div>
                    <div class="form-group"><label for="jumlah">Jumlah (KG/Pcs)</label><input type="number" id="jumlah" step="0.1" required disabled></div>
                    <div id="info-harga">Estimasi Harga: Rp 0</div>
                    <div class="form-group"><label for="statusBayar">Status Pembayaran</label><select id="statusBayar" required><option value="Belum Lunas">Belum Lunas</option><option value="Lunas">Lunas</option></select></div>
                    <button type="submit" id="submitButton">Simpan & Cetak Struk</button>
                </form>
            </main>
        </div>`);
  setupFormKasir();
}

function updatePelangganList(filter = "") {
  const listContainer = document.querySelector(".history-list");
  if (!listContainer) return;

  const filterText = String(filter || "")
    .trim()
    .toLowerCase();

  let pelangganTersaring = [...daftarPelanggan];
  if (filterText) {
    pelangganTersaring = pelangganTersaring.filter(
      (p) =>
        (p.Nama_Pelanggan &&
          p.Nama_Pelanggan.toLowerCase().includes(filterText)) ||
        (p.No_HP && String(p.No_HP).includes(filterText))
    );
  }

  let listItems = pelangganTersaring
    .map((p) => {
      return `
                <li class="history-item" onclick='renderFormKasir(${JSON.stringify(
                  p
                )})'>
                    <div class="history-item-main">
                        <strong class="history-item-name">${
                          p.Nama_Pelanggan
                        }</strong>
                        <span class="history-item-id">${p.No_HP}</span>
                    </div>
                </li>
            `;
    })
    .join("");

  listContainer.innerHTML =
    listItems.length > 0
      ? listItems
      : "<li>Tidak ada pelanggan ditemukan.</li>";
}

function renderPelanggan() {
  setActiveNav("pelanggan");

  renderPage(`
        <div class="page-container">
            <header class="header-simple"><h1>Daftar Pelanggan</h1></header>
            <main>
                <div class="search-container">
                    <input type="text" id="searchPelanggan" placeholder="Cari nama atau nomor HP...">
                </div>
                <ul class="history-list">
                </ul>
            </main>
        </div>
    `);

  // Panggil fungsi baru untuk menampilkan data awal
  updatePelangganList();

  // Event listener sekarang memanggil fungsi update, bukan merender ulang halaman
  document
    .getElementById("searchPelanggan")
    .addEventListener("input", (e) => updatePelangganList(e.target.value));
}

function renderKanban(filter = "semua") {
  setActiveNav("proses");
  renderPage(`
        <div class="page-container">
            <header class="header-simple"><h1>Proses Cucian</h1></header>
            <main class="kanban-main">
                <div class="kanban-container">
                    <div class="kanban-column" id="col-diterima"><div class="kanban-header"><h2>Diterima</h2><span class="card-count" id="count-diterima">0</span></div><div class="kanban-cards"></div></div>
                    <div class="kanban-column" id="col-proses-cuci"><div class="kanban-header"><h2>Proses Cuci</h2><span class="card-count" id="count-proses-cuci">0</span></div><div class="kanban-cards"></div></div>
                    <div class="kanban-column" id="col-siap-diambil"><div class="kanban-header"><h2>Siap Diambil</h2><span class="card-count" id="count-siap-diambil">0</span></div><div class="kanban-cards"></div></div>
                </div>
            </main>
        </div>`);
  renderKanbanCards(filter);
}

function renderStruk(transaksi) {
  let transaksiSaatIni = transaksi;
  renderPage(`
    <div class="page-container struk-container">
      <header class="header-simple"><h1>Struk Transaksi</h1></header>
      <main>
        <div id="struk-content">
          <h3>SuperClean Laundry</h3><p>==============================</p>
          <p><strong>ID Transaksi:</strong> ${transaksi.id}</p>
          <p><strong>Tanggal:</strong> ${new Date(
            transaksi.tanggal
          ).toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
          })}</p>
          <p><strong>Pelanggan:</strong> ${transaksi.nama}</p>
          <p>==============================</p>
          <p>${transaksi.layanan} (${transaksi.paket})</p>
          <p>${transaksi.jumlah} x Rp ${(
    transaksi.total / transaksi.jumlah
  ).toLocaleString("id-ID")}</p>
          <p>------------------------------</p>
          <h4>TOTAL: Rp ${transaksi.total.toLocaleString("id-ID")}</h4>
          <p><strong>Status: ${transaksi.statusBayar}</strong></p>
          <p>==============================</p>
          <p>Terima kasih!</p>
        </div>
        <div class="struk-actions">
          <button id="tombol-cetak">🖨️ Cetak Struk</button>
          <button id="tombol-wa">💬 Kirim via WhatsApp</button>
          <button id="tombol-kembali">Kembali ke Dashboard</button>
        </div>
      </main>
    </div>`);
  document
    .getElementById("tombol-cetak")
    .addEventListener("click", () => window.print());
  document
    .getElementById("tombol-wa")
    .addEventListener("click", () => kirimStrukWa(transaksiSaatIni));
  document
    .getElementById("tombol-kembali")
    .addEventListener("click", renderDashboard);
}

// Render Halaman Detail Transaksi dari Riwayat
function renderDetailTransaksi(transactionId) {
  const trx = semuaTransaksi.find((t) => t.ID_Transaksi === transactionId);
  if (!trx) {
    alert("Transaksi tidak ditemukan!");
    return;
  }

  // Ubah data dari sheet menjadi format yang sama dengan objek transaksi saat dibuat
  const transaksiUntukStruk = {
    id: trx.ID_Transaksi,
    tanggal: trx.Tanggal_Masuk,
    nama: trx.Nama_Pelanggan,
    noHp: trx.No_HP,
    layanan: trx.Layanan,
    paket: trx.Paket,
    jumlah: trx.Jumlah,
    total: trx.Total_Harga,
    statusBayar: trx.Status_Bayar,
  };

  // Kita gunakan kembali fungsi renderStruk yang sudah ada!
  renderStruk(transaksiUntukStruk);
}

// =================================================================
// FUNGSI-FUNGSI LOGIKA (Tidak ada perubahan signifikan di sini)
// =================================================================

function hitungStatistik() {
  const today = new Date().toISOString().slice(0, 10);
  if (!Array.isArray(semuaTransaksi)) return; // Pengaman jika data belum siap
  const transaksiHariIni = semuaTransaksi.filter(
    (t) =>
      t.Tanggal_Masuk &&
      typeof t.Tanggal_Masuk.slice === "function" &&
      t.Tanggal_Masuk.slice(0, 10) === today
  );
  const revenueToday = transaksiHariIni.reduce(
    (sum, t) => sum + (Number(t.Total_Harga) || 0),
    0
  );
  const ordersToday = transaksiHariIni.length;
  const activeOrders = semuaTransaksi.filter(
    (t) => t.Status && t.Status !== "Selesai"
  ).length;
  const readyOrders = semuaTransaksi.filter(
    (t) => t.Status === "Siap Diambil"
  ).length;
  const revenueEl = document.getElementById("revenue-today");
  const ordersEl = document.getElementById("orders-today");
  const activeEl = document.getElementById("active-orders");
  const readyEl = document.getElementById("ready-orders");
  if (revenueEl)
    revenueEl.textContent = `Rp ${revenueToday.toLocaleString("id-ID")}`;
  if (ordersEl) ordersEl.textContent = ordersToday;
  if (activeEl) activeEl.textContent = activeOrders;
  if (readyEl) readyEl.textContent = readyOrders;
}

function renderStatusChart() {
  const ctx = document.getElementById("statusChart");
  if (!ctx || !Array.isArray(semuaTransaksi)) return;
  const statusCounts = { Diterima: 0, "Proses Cuci": 0, "Siap Diambil": 0 };
  semuaTransaksi.forEach((trx) => {
    if (trx.Status && statusCounts.hasOwnProperty(trx.Status)) {
      statusCounts[trx.Status]++;
    }
  });
  const data = {
    labels: Object.keys(statusCounts),
    datasets: [
      {
        label: " Jumlah Order",
        data: Object.values(statusCounts),
        backgroundColor: ["#3498db", "#f1c40f", "#2ecc71"],
        borderColor: "#fff",
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };
  new Chart(ctx, {
    type: "pie",
    data: data,
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Komposisi Order Aktif" },
      },
    },
  });
}

// GANTI SELURUH FUNGSI setupFormKasir DENGAN VERSI INI
function setupFormKasir() {
  const form = document.getElementById("laundryForm"),
    selectKategori = document.getElementById("kategori"),
    selectLayanan = document.getElementById("layanan"),
    selectPaket = document.getElementById("paket"),
    inputJumlah = document.getElementById("jumlah"),
    infoHarga = document.getElementById("info-harga"),
    submitButton = document.getElementById("submitButton"),
    namaPelanggan = document.getElementById("namaPelanggan"),
    noHp = document.getElementById("noHp"),
    idPelanggan = document.getElementById("idPelanggan");

  // Jika form dimuat dengan data pelanggan dari halaman pelanggan,
  // pastikan input terkunci dan tidak bisa diubah
  if (idPelanggan.value) {
    namaPelanggan.readOnly = true;
    noHp.readOnly = true;
  }

  const searchPelanggan = document.getElementById("searchPelanggan");
  if (searchPelanggan) {
    const datalist = document.getElementById("pelanggan-list");
    const notifContainer = document.createElement("p");
    notifContainer.className = "notif-message";
    namaPelanggan.parentNode.insertBefore(
      notifContainer,
      namaPelanggan.nextSibling
    );

    // Mengisi datalist pelanggan
    datalist.innerHTML = "";
    daftarPelanggan.forEach((p) => {
      const option = document.createElement("option");
      let noHpClipped = "----";
      if (p.No_HP) {
        const noHpString = String(p.No_HP);
        noHpClipped = noHpString.slice(-4);
      }
      option.value = `${p.Nama_Pelanggan} (...${noHpClipped})`;
      option.dataset.id = p.ID_Pelanggan;
      option.dataset.nama = p.Nama_Pelanggan;
      option.dataset.nohp = p.No_HP;
      datalist.appendChild(option);
    });

    // Event listener untuk kolom pencarian
    searchPelanggan.addEventListener("input", (e) => {
      const value = e.target.value;
      const option = Array.from(datalist.options).find(
        (opt) => opt.value === value
      );

      if (option) {
        // Jika opsi dipilih, isi form dan kunci input
        idPelanggan.value = option.dataset.id;
        namaPelanggan.value = option.dataset.nama;
        noHp.value = option.dataset.nohp;
        namaPelanggan.readOnly = true;
        noHp.readOnly = true;
        notifContainer.textContent = `Pelanggan sudah terdaftar.`;
        submitButton.disabled = false;
      } else if (value === "") {
        // Jika kolom pencarian dikosongkan, buka kunci input dan bersihkan form
        idPelanggan.value = "";
        namaPelanggan.value = "";
        noHp.value = "";
        namaPelanggan.readOnly = false;
        noHp.readOnly = false;
        notifContainer.textContent = "";
        submitButton.disabled = false;
      }
    });

    // Logika utama: cek duplikat saat mengetik di nama atau noHP
    function cekDuplikat() {
      // Abaikan jika input sudah terkunci
      if (namaPelanggan.readOnly || noHp.readOnly) {
        return;
      }

      const namaInput = namaPelanggan.value.trim().toLowerCase();
      let noHpInput = noHp.value.trim();
      notifContainer.textContent = "";
      submitButton.disabled = false;

      if (!namaInput && !noHpInput) {
        return;
      }

      if (noHpInput && noHpInput.startsWith("0")) {
        noHpInput = "62" + noHpInput.substring(1);
      }

      const duplikat = daftarPelanggan.find(
        (p) =>
          (p.Nama_Pelanggan && p.Nama_Pelanggan.toLowerCase() === namaInput) ||
          (p.No_HP && String(p.No_HP) === noHpInput)
      );

      if (duplikat) {
        notifContainer.textContent = `*Pelanggan sudah terdaftar. Silakan pilih dari daftar pelanggan di atas.`;
        submitButton.disabled = true;
      }
    }

    namaPelanggan.addEventListener("input", cekDuplikat);
    noHp.addEventListener("input", cekDuplikat);
    noHp.addEventListener("change", cekDuplikat);
  }

  // Sisa kode tidak berubah
  const kategoriUnik = [...new Set(daftarLayanan.map((item) => item.Kategori))];
  selectKategori.innerHTML = '<option value="">-- Pilih --</option>';
  kategoriUnik.forEach((kategori) => {
    const option = document.createElement("option");
    option.value = kategori;
    option.textContent = kategori;
    selectKategori.appendChild(option);
  });
  selectKategori.addEventListener("change", () => {
    resetDropdowns([selectLayanan, selectPaket]);
    const layananUnik = [
      ...new Set(
        daftarLayanan
          .filter((item) => item.Kategori === selectKategori.value)
          .map((item) => item.Layanan)
      ),
    ];
    isiDropdown(selectLayanan, layananUnik);
    selectLayanan.disabled = false;
  });
  selectLayanan.addEventListener("change", () => {
    resetDropdowns([selectPaket]);
    const paketUnik = [
      ...new Set(
        daftarLayanan
          .filter(
            (item) =>
              item.Kategori === selectKategori.value &&
              item.Layanan === selectLayanan.value
          )
          .map((item) => item.Paket)
      ),
    ];
    isiDropdown(selectPaket, paketUnik);
    selectPaket.disabled = false;
  });
  selectPaket.addEventListener("change", () => {
    inputJumlah.disabled = false;
    hitungHarga();
  });
  inputJumlah.addEventListener("input", hitungHarga);
  form.addEventListener("submit", handleFormSubmit);
  function hitungHarga() {
    const layananTerpilih = daftarLayanan.find(
      (item) =>
        item.Kategori === selectKategori.value &&
        item.Layanan === selectLayanan.value &&
        item.Paket === selectPaket.value
    );
    if (layananTerpilih && inputJumlah.value > 0) {
      infoHarga.textContent = `Estimasi Harga: Rp ${(
        layananTerpilih.Harga * inputJumlah.value
      ).toLocaleString("id-ID")}`;
    } else {
      infoHarga.textContent = "Estimasi Harga: Rp 0";
    }
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const submitButton = document.getElementById("submitButton");
  submitButton.disabled = true;
  submitButton.innerHTML = 'Memproses... <div class="spinner-kecil"></div>';

  try {
    let pelangganId = document.getElementById("idPelanggan").value;
    let nama = document.getElementById("namaPelanggan").value.trim();
    let noHpRaw = document.getElementById("noHp").value.trim();

    // ==========================================================
    // LOGIKA PENCEGAHAN DUPLIKAT BARU
    // ==========================================================
    // Cek apakah form diisi oleh pelanggan baru (tidak ada pelangganId)
    if (!pelangganId) {
      // Normalisasi nomor HP untuk pengecekan
      const noHp = normalizePhoneNumber(noHpRaw);

      // Cari duplikat di daftar pelanggan
      const duplikat = daftarPelanggan.find(
        (p) =>
          (p.Nama_Pelanggan &&
            p.Nama_Pelanggan.toLowerCase() === nama.toLowerCase()) ||
          (p.No_HP && String(p.No_HP) === noHp)
      );

      // Jika duplikat ditemukan, batalkan proses
      if (duplikat) {
        alert(`Pelanggan dengan nama atau nomor HP tersebut sudah terdaftar.`);
        // Kembalikan tombol ke keadaan normal dan hentikan proses
        submitButton.disabled = false;
        submitButton.textContent = "Simpan & Cetak Struk";
        return;
      }

      // Jika tidak ada duplikat, lanjutkan dengan konfirmasi pendaftaran
      const konfirmasi = confirm(
        `Pelanggan "${nama}" belum terdaftar. Daftarkan sebagai pelanggan baru?`
      );
      if (konfirmasi) {
        const response = await fetch(API_URL, {
          method: "POST",
          body: JSON.stringify({
            action: "addNewCustomer",
            customerData: { nama, noHp },
          }),
        });
        const result = await response.json();
        if (result.status === "success") {
          pelangganId = result.newId;
          daftarPelanggan.push({
            ID_Pelanggan: pelangganId,
            Nama_Pelanggan: nama,
            No_HP: noHp,
          });
        } else {
          throw new Error("Gagal mendaftarkan pelanggan baru.");
        }
      } else {
        submitButton.disabled = false;
        submitButton.textContent = "Simpan & Cetak Struk";
        return;
      }
    }

    // Sisa kode di bawah ini tetap sama dan berjalan jika pelanggan sudah valid
    const layananTerpilih = daftarLayanan.find(
      (item) =>
        item.Kategori === document.getElementById("kategori").value &&
        item.Layanan === document.getElementById("layanan").value &&
        item.Paket === document.getElementById("paket").value
    );

    const transaksi = {
      id: `SCLN-${Date.now()}`,
      pelangganId,
      nama,
      noHp: normalizePhoneNumber(noHpRaw),
      layanan: document.getElementById("layanan").value,
      paket: document.getElementById("paket").value,
      jumlah: document.getElementById("jumlah").value,
      total: layananTerpilih.Harga * document.getElementById("jumlah").value,
      statusBayar: document.getElementById("statusBayar").value,
      tanggal: new Date().toISOString(),
    };

    renderStruk(transaksi);
    await kirimDataKeSheet(transaksi);
    await muatDataAwal();
  } catch (error) {
    console.error("Error saat submit:", error);
    alert("Terjadi kesalahan.");
  } finally {
    if (document.getElementById("nav-tambah")?.classList.contains("active")) {
      const formButton = document.getElementById("submitButton");
      if (formButton) {
        formButton.disabled = false;
        formButton.textContent = "Simpan & Cetak Struk";
      }
    }
  }
}

function renderKanbanCards(filter = "semua") {
  const counts = { diterima: 0, "proses-cuci": 0, "siap-diambil": 0 };
  document
    .querySelectorAll(".kanban-cards")
    .forEach((container) => (container.innerHTML = ""));
  let transaksiUntukDitampilkan = semuaTransaksi.filter(
    (t) => t.Status && t.Status !== "Selesai"
  );
  if (filter !== "semua") {
    transaksiUntukDitampilkan = transaksiUntukDitampilkan.filter(
      (t) => t.Status === filter
    );
  }
  const statusValues = ["Diterima", "Proses Cuci", "Siap Diambil", "Selesai"];
  transaksiUntukDitampilkan.forEach((trx) => {
    const card = document.createElement("div");
    card.className = "kanban-card";
    let options = "";
    statusValues.forEach((status) => {
      options += `<option value="${status}" ${
        trx.Status === status ? "selected" : ""
      }>${status}</option>`;
    });
    const statusBayar = (
      trx.Status_Bayar ||
      trx["Status Bayar"] ||
      "Belum Lunas"
    ).trim();
    const statusBayarClass = statusBayar.toLowerCase().replace(" ", "-");
    card.innerHTML = `<h4>${trx.Nama_Pelanggan}</h4><p>${trx.ID_Transaksi}</p><div class="card-footer"><span class="payment-status ${statusBayarClass}">${statusBayar}</span><select class="status-select" data-id="${trx.ID_Transaksi}" data-nohp="${trx.No_HP}" data-nama="${trx.Nama_Pelanggan}">${options}</select></div>`;
    const statusKey = trx.Status.replace(/ /g, "-").toLowerCase();
    const colId = `col-${statusKey}`;
    const columnContent = document.querySelector(`#${colId} .kanban-cards`);
    if (columnContent) {
      columnContent.appendChild(card);
      if (counts.hasOwnProperty(statusKey)) counts[statusKey]++;
    }
  });
  document.getElementById("count-diterima").textContent = counts.diterima;
  document.getElementById("count-proses-cuci").textContent =
    counts["proses-cuci"];
  document.getElementById("count-siap-diambil").textContent =
    counts["siap-diambil"];
}

document.addEventListener("change", (e) => {
  if (e.target.classList.contains("status-select")) {
    const { id, nohp, nama } = e.target.dataset;
    const status = e.target.value;
    if (!id || !status) return alert("Informasi transaksi tidak lengkap.");
    updateStatusDiSheet(id, status, nohp || "", nama || "Pelanggan");
  }
});

async function updateStatusDiSheet(transactionId, newStatus, noHp, nama) {
  const selectElement = document.querySelector(
    `.status-select[data-id="${transactionId}"]`
  );
  try {
    if (selectElement) selectElement.disabled = true;
    const payload = { action: "updateStatus", transactionId, newStatus };
    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(payload),
    });
    const index = semuaTransaksi.findIndex(
      (t) => t.ID_Transaksi === transactionId
    );
    if (index !== -1) semuaTransaksi[index].Status = newStatus;
    renderKanbanCards();
    if (newStatus === "Siap Diambil") {
      if (
        confirm(
          `Status cucian ${nama} (${transactionId}) sudah "Siap Diambil".\n\nKirim notifikasi?`
        )
      ) {
        let pesan = `Halo Kak *${nama}*,\nCucian Anda (order ${transactionId}) sudah selesai dan siap diambil.\nTerima kasih!`;
        window.open(
          `https://wa.me/${noHp}?text=${encodeURIComponent(pesan)}`,
          "_blank"
        );
      }
    }
  } catch (error) {
    alert("Gagal update status.");
    renderKanbanCards();
  }
}

// =================================================================
// FUNGSI-FUNGSI BANTUAN
// =================================================================
function isiDropdown(select, options) {
  options.forEach((opt) => {
    const el = document.createElement("option");
    el.value = opt;
    el.textContent = opt;
    select.appendChild(el);
  });
}
function resetDropdowns(dropdowns) {
  dropdowns.forEach((dd) => {
    dd.innerHTML = '<option value="">-- Pilih --</option>';
    dd.disabled = true;
  });
  document.getElementById("jumlah").disabled = true;
  document.getElementById("jumlah").value = "";
  document.getElementById("info-harga").textContent = "Estimasi Harga: Rp 0";
}
function kirimStrukWa(trx) {
  let pesan = `*Struk Laundry Anda*\n\nID: *${trx.id}*\nPelanggan: ${
    trx.nama
  }\nTotal: *Rp ${trx.total.toLocaleString("id-ID")}*\nStatus: *${
    trx.statusBayar
  }*\n\nTerima kasih!`;
  window.open(
    `https://wa.me/${trx.noHp}?text=${encodeURIComponent(pesan)}`,
    "_blank"
  );
}
function normalizePhoneNumber(phone) {
  if (!phone) return "";
  let phoneStr = String(phone).trim();

  if (phoneStr.startsWith("62")) {
    return phoneStr;
  }
  if (phoneStr.startsWith("0")) {
    return "62" + phoneStr.substring(1);
  }
  if (phoneStr.startsWith("8")) {
    return "62" + phoneStr;
  }
  return phoneStr; // Kembalikan apa adanya jika format tidak dikenali
}
async function kirimDataKeSheet(transaksi) {
  try {
    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(transaksi),
    });
  } catch (error) {
    simpanTransaksiOffline(transaksi);
    alert("Koneksi Gagal. Data disimpan sementara.");
  }
}
function simpanTransaksiOffline(transaksi) {
  const offline = JSON.parse(localStorage.getItem("transaksiOffline")) || [];
  offline.push(transaksi);
  localStorage.setItem("transaksiOffline", JSON.stringify(offline));
}
async function sinkronkanDataOffline() {
  const offline = JSON.parse(localStorage.getItem("transaksiOffline")) || [];
  if (offline.length === 0) return;
  const berhasil = [];
  for (const trx of offline) {
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(trx),
      });
      berhasil.push(trx.id);
    } catch (error) {
      break;
    }
  }
  const antrianBaru = offline.filter((t) => !berhasil.includes(t.id));
  localStorage.setItem("transaksiOffline", JSON.stringify(antrianBaru));
  if (berhasil.length > 0) muatDataAwal();
}
function setActiveNav(id) {
  document
    .querySelectorAll(".nav-button")
    .forEach((btn) => btn.classList.remove("active"));
  if (document.getElementById(`nav-${id}`))
    document.getElementById(`nav-${id}`).classList.add("active");
}
