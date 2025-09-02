// =================================================================
// PENGATURAN - WAJIB DIISI
// =================================================================
const API_URL =
  "https://script.google.com/macros/s/AKfycbwQKdKGEYgg3o-9Nes9FlX5fxiSmvyErlDNYza49-a99g2JelAdEnzpHRWtZUptpUXDfg/exec";

const ATURAN_MINIMAL_KG = {
  "Cuci Setrika": 1,
  "Setrika Only": 1,
  "Cuci Kering Lipat": 3,
};
// =================================================================
// Variabel Global
// =================================================================
let daftarLayanan = [],
  semuaTransaksi = [],
  daftarPelanggan = [];
const appContainer = document.getElementById("app-container");
const loadingSpinner = document.getElementById("loading-spinner");
let daftarItemsPesanan = [];

// =================================================================
// TITIK START APLIKASI
// =================================================================
document.addEventListener("DOMContentLoaded", init);

// =================================================================
// FUNGSI UTAMA & RENDER HALAMAN
// =================================================================
// GANTI SELURUH FUNGSI init() ANDA DENGAN INI

let idCabangAktif = null;
let namaCabangAktif = null;

async function init() {
  // 1. Cek dulu apakah ada info login di penyimpanan browser
  idCabangAktif = localStorage.getItem("idCabangLaundry");
  namaCabangAktif = localStorage.getItem("namaCabangLaundry");

  // 2. Buat "Gerbang" Pengecekan
  if (idCabangAktif) {
    // ===============================================
    // JIKA SUDAH LOGIN, JALANKAN SEMUA KODE INI
    // ===============================================
    console.log(
      `Login sebagai cabang: ${namaCabangAktif} (ID: ${idCabangAktif})`
    );
    console.log("Nilai idCabangAktif setelah init:", idCabangAktif);

    // Pastikan UI utama terlihat (jika sebelumnya disembunyikan)
    document.getElementById("app-container").classList.remove("hidden");
    document.querySelector(".bottom-nav")?.classList.remove("hidden");
    document.querySelector(".top-header")?.classList.remove("hidden");
    // Ini semua kode Anda yang sudah benar, posisinya di sini
    if (loadingSpinner) loadingSpinner.classList.remove("hidden");

    document
      .getElementById("nav-dashboard")
      .addEventListener("click", renderDashboard);
    document.getElementById("nav-tambah").addEventListener("click", () => {
      daftarItemsPesanan = [];
      renderFormKasir();
    });
    document
      .getElementById("nav-proses")
      .addEventListener("click", () => renderKanban());
    document
      .getElementById("nav-riwayat")
      .addEventListener("click", () => renderRiwayat());
    document
      .getElementById("nav-pelanggan")
      .addEventListener("click", renderPelanggan);

    await muatDataAwal();
    renderDashboard();
    sinkronkanDataOffline();
    if (loadingSpinner) loadingSpinner.classList.add("hidden");
  } else {
    // ===============================================
    // JIKA BELUM LOGIN, HANYA JALANKAN INI
    // ===============================================
    renderLoginScreen();
  }
}

// GANTI FUNGSI muatDataAwal DENGAN INI

async function muatDataAwal() {
  try {
    // Tambahkan parameter &cabang=${idCabangAktif} di setiap URL
    const [servicesRes, transactionsRes, customersRes] = await Promise.all([
      fetch(`${API_URL}?action=getServices`), // Layanan tidak perlu filter
      fetch(`${API_URL}?cabang=${idCabangAktif}`), // Ambil transaksi cabang ini
      fetch(`${API_URL}?action=getCustomers&cabang=${idCabangAktif}`), // Ambil pelanggan cabang ini
    ]);
    daftarLayanan = await servicesRes.json();
    semuaTransaksi = await transactionsRes.json();
    daftarPelanggan = await customersRes.json();
  } catch (error) {
    console.error("Gagal memuat data awal:", error);
    alert("Gagal memuat data awal. Cek koneksi internet Anda.");
  }
}

// Di file script.js
function renderPage(contentHtml) {
  appContainer.innerHTML = `
    <div class="page-container">
      <main>${contentHtml}</main>
    </div>
  `;
  setupHamburgerMenu(); // <-- TAMBAHKAN DI SINI
}

// GANTI SELURUH FUNGSI renderDashboard LAMA ANDA DENGAN INI

function renderDashboard() {
  // 1. Atur navigasi aktif
  setActiveNav("dashboard");
  setupHamburgerMenu();
  // 2. Siapkan string HTML yang LENGKAP dan BENAR, pastikan semua 'id' ada
  const dashboardHtml = `
    <div class="page-container">
      
      <main>
        <div class="dashboard-layout">
          <div class="chart-container"><canvas id="statusChart"></canvas></div>
          <div class="summary-grid">
            <div class="summary-card" onclick="renderKanban()">
              <h3>Order Aktif</h3>
              <p id="active-orders">0</p> </div>
            <div class="summary-card" onclick="renderKanban('Siap Diambil')">
              <h3>Belum Diambil</h3>
              <p id="ready-orders">0</p> </div>
            <div class="summary-card">
              <h3>Revenue Hari Ini</h3>
              <p id="revenue-today">Rp 0</p> </div>
            <div class="summary-card">
              <h3>Order Hari Ini</h3>
              <p id="orders-today">0</p> </div>
          </div>
        </div>
      </main>
    </div>
  `;

  // 3. Render HTML ke dalam #app-container
  // Kita gunakan renderFullPage (yang isinya appContainer.innerHTML) karena HTML di atas sudah lengkap
  renderFullPage(dashboardHtml);

  // 4. SETELAH HTML dijamin ada, BARU panggil fungsi untuk mengisi data
  hitungStatistik();
  renderStatusChart();
}

// Pastikan Anda punya fungsi renderFullPage seperti ini
function renderFullPage(html) {
  appContainer.innerHTML = html;
  setupHamburgerMenu(); // <-- TAMBAHKAN DI SINI
}

function renderFormKasir(pelanggan = null) {
  setActiveNav("tambah");
  // daftarItemsPesanan = [];

  const isMember = pelanggan && pelanggan.Status_Member === "Aktif";
  let memberStatusHtml = "";

  if (pelanggan) {
    if (isMember) {
      const totalPoin = pelanggan.Total_Poin || 0;
      memberStatusHtml = `
        <div class="member-info">
          <span class="badge member">Member Aktif 🌟</span>
          <span class="poin">Poin: <b>${totalPoin}</b></span>
          <button type="button" class="btn-tukar-poin" id="btnTukarPoin" ${
            totalPoin > 0 ? "" : "disabled"
          }>Tukar Poin</button>
        </div>
        <div class="form-group-checkbox">
          <input type="checkbox" id="pakaiTotebag">
          <label for="pakaiTotebag">Bawa & Pakai Totebag (Bonus 1 Poin)</label>
        </div>
      `;
    } else {
      // Tombol untuk mendaftarkan member
      memberStatusHtml = `
        <div class="member-info">
          <span class="badge non-member">Non-Member</span>
          <button type="button" class="btn-register" id="btnJadikanMember" 
                  onclick="konfirmasiDaftarMember('${pelanggan.ID_Pelanggan}', '${pelanggan.Nama_Pelanggan}')">
            Jadikan Member (Rp 50rb)
          </button>
        </div>
      `;
    }
  }

  const formHtml = `
  <div class="form-container">
    <form id="laundryForm">
      
      <fieldset>
        <legend>Informasi Pelanggan</legend>
        <div class="form-group full-width">
          <label for="searchPelanggan">Cari Pelanggan (Nama/HP)</label>
          <input type="text" id="searchPelanggan" list="pelanggan-list" placeholder="Ketik untuk mencari...">
          <datalist id="pelanggan-list"></datalist>
        </div>
       <input type="hidden" id="idPelanggan" value="${
         pelanggan ? pelanggan.ID_Pelanggan || "" : ""
       }">
        <div class="form-group">
          <label for="namaPelanggan" class="required">Nama Pelanggan</label>
          <input type="text" id="namaPelanggan" value="${
            pelanggan ? pelanggan.Nama_Pelanggan || "" : ""
          }" ${pelanggan ? "readonly" : ""} required>
        </div>
        <div class="form-group">
          <label for="noHp" class="required">Nomor HP</label>
          <input type="number" id="noHp" value="${
            pelanggan ? pelanggan.No_HP || "" : ""
          }" ${pelanggan ? "readonly" : ""} placeholder="62812..." required>
        </div>
      </fieldset>

      <fieldset>
        <legend>Tambah Item Pesanan</legend>
        <div class="item-adder-grid">
          <div class="form-group">
            <label for="kategori">Kategori</label>
            <select id="kategori"><option value="">-- Pilih --</option></select>
          </div>
          <div class="form-group">
            <label for="layanan">Layanan</label>
            <select id="layanan" disabled><option value="">-- Pilih --</option></select>
          </div>
          <div class="form-group">
            <label for="paket">Paket</label>
            <select id="paket" disabled><option value="">-- Pilih --</option></select>
          </div>
          <div class="form-group">
            <label for="jumlah">Jumlah</label>
            <input type="number" id="jumlah" step="0.1" placeholder="kg/pcs" disabled>
          </div>
        </div>
        <div class="actions-grid">
          <div id="info-harga">Harga: <span>Rp 0</span></div>
          <button type="button" id="addItemButton" class="btn-secondary">
            <i class="fa-solid fa-plus"></i> Tambah
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Daftar Pesanan</legend>
        <ul id="order-items-list" class="order-list-container">
          </ul>
        <div class="total-container">
          <strong>Grand Total: <span id="grand-total">Rp 0</span></strong>
        </div>
      </fieldset>

     <fieldset class="fieldset-akhir">
  <div class="form-group">
    <label for="catatanOrder">Catatan (Opsional)</label>
    <textarea id="catatanOrder" rows="3"></textarea>
  </div>
  <div class="form-group">
    <label for="statusBayar">Status Pembayaran</label> <select id="statusBayar" required>
        <option value="Belum Lunas">Belum Lunas</option>
        <option value="Lunas">Lunas</option>
    </select>

    <div id="metode-pembayaran-wrapper" class="hidden" style="margin-top: 16px;">
        <label>Metode Pembayaran</label>
        <div class="radio-group-container">
            <input type="radio" id="metode-cash" name="metodeBayar" value="Cash" checked>
            <label for="metode-cash" class="radio-button">Cash</label>

            <input type="radio" id="metode-qris" name="metodeBayar" value="QRIS">
            <label for="metode-qris" class="radio-button">QRIS</label>
        </div>
    </div>

  </div>
</fieldset>
      <div id="member-actions-container" class="full-width"></div>
      <button type="submit" id="submitButton" class="btn-primary full-width">
        <i class="fa-solid fa-receipt"></i> Simpan & Cetak Struk
      </button>
    </form>
  </div>
`;
  renderPage(formHtml);
  setupFormKasir(pelanggan);

  if (isMember) {
    const tombolTukar = document.getElementById("btnTukarPoin");
    if (tombolTukar) {
      // Tambahkan pengecekan untuk keamanan
      tombolTukar.addEventListener("click", () =>
        handleTukarPoin(pelanggan.Total_Poin || 0)
      );
    }
  }
}

function updateMemberSection(pelanggan) {
  const container = document.getElementById("member-actions-container");
  if (!container) return;

  // Jika tidak ada data pelanggan, sembunyikan dan kosongkan
  if (!pelanggan) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  const isMember = pelanggan.Status_Member === "Aktif";
  container.style.display = "block"; // Selalu tampilkan jika ada data pelanggan
  let memberActionsHtml = "";

  if (isMember) {
    // --- Tampilan jika PELANGGAN ADALAH MEMBER AKTIF ---
    const totalPoin = pelanggan.Total_Poin || 0;
    let expInfo = "";
    if (totalPoin > 0 && pelanggan.Poin_Kadaluarsa_Pada) {
      const expDate = new Date(pelanggan.Poin_Kadaluarsa_Pada);
      const sisaHari = Math.ceil(
        (expDate - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (sisaHari > 1) {
        expInfo = ` (Hangus dalam ${sisaHari} hari)`;
      } else if (sisaHari === 1) {
        expInfo = ` (Hangus besok!)`;
      } else {
        expInfo = ` (Hangus hari ini!)`;
      }
    }
    memberActionsHtml = `
      <h5>Opsi Member</h5>
      <div class="member-info">
        <div>
          <span class="badge member">Member Aktif</span>
          <span class="poin">Poin: <b>${totalPoin}</b><span class="exp-info">${expInfo}</span></span>
        </div>
        <button type="button" class="btn-tukar-poin" id="btnTukarPoin" ${
          totalPoin >= 10 ? "" : "disabled"
        }>Tukar Poin</button>
      </div>
      <div class="form-group-checkbox">
        <input type="checkbox" id="pakaiTotebag">
        <label for="pakaiTotebag">Bawa & Pakai Totebag (Bonus 1 Poin)</label>
      </div>
    `;
  } else {
    // --- Tampilan jika PELANGGAN BUKAN MEMBER ---
    memberActionsHtml = `
      <div class="member-info">
        <span class="badge non-member">Non-Member</span>
        <button type="button" class="btn-register" id="btnJadikanMember" 
                onclick="konfirmasiDaftarMember('${pelanggan.ID_Pelanggan}', '${pelanggan.Nama_Pelanggan}')"> 
          Daftarkan Member (Rp 50rb)
        </button>
      </div>
    `;
  }

  container.innerHTML = memberActionsHtml;

  if (isMember) {
    const tombolTukar = document.getElementById("btnTukarPoin");
    if (tombolTukar) {
      tombolTukar.addEventListener("click", () =>
        handleTukarPoin(pelanggan.Total_Poin || 0)
      );
    }
  }
}

async function handleTukarPoin(poinSaatIni) {
  if (poinSaatIni < 10) {
    await showCustomModal({
      title: "Gagal",
      message: "Poin Anda tidak cukup. Minimal 10 poin untuk bisa ditukar.",
      confirmText: "OK",
      cancelText: "",
    }); // Menggunakan modal sebagai alert
    return;
  }

  const itemLaundry = daftarItemsPesanan.filter((item) => !item.isDiscount);
  const totalBelanja = itemLaundry.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );
  if (totalBelanja <= 0) {
    await showCustomModal({
      title: "Info",
      message: "Anda harus memiliki item belanja untuk menukar poin.",
      confirmText: "OK",
      cancelText: "",
    });
    return;
  }
  const maxPoinTukar = Math.floor(totalBelanja / 1000);

  try {
    const poinDitebusStr = await showCustomModal({
      title: "Tukar Poin",
      message: `Anda punya ${poinSaatIni} poin. Anda bisa menukar maksimal ${maxPoinTukar} poin untuk transaksi ini. Berapa yang ingin ditukar?`,
      input: true,
      placeholder: "Min 10 poin",
      confirmText: "Tukar",
      cancelText: "Batal",
    });

    const poinDitebus = parseInt(poinDitebusStr);

    // Hapus diskon lama
    daftarItemsPesanan = daftarItemsPesanan.filter((item) => !item.isDiscount);

    if (isNaN(poinDitebus) || poinDitebus <= 0) return;
    if (poinDitebus < 10) {
      await showCustomModal({
        title: "Gagal",
        message: "Penukaran gagal. Minimal 10 poin.",
        confirmText: "OK",
        cancelText: "",
      });
      return;
    }
    if (poinDitebus > poinSaatIni) {
      await showCustomModal({
        title: "Gagal",
        message: "Poin Anda tidak mencukupi!",
        confirmText: "OK",
        cancelText: "",
      });
      return;
    }
    if (poinDitebus > maxPoinTukar) {
      await showCustomModal({
        title: "Gagal",
        message: `Penukaran poin tidak boleh melebihi total belanja! Maksimal ${maxPoinTukar} poin.`,
        confirmText: "OK",
        cancelText: "",
      });
      return;
    }

    const nilaiDiskon = poinDitebus * 1000;
    daftarItemsPesanan.push({
      layanan: `Diskon Poin (-${poinDitebus} Poin)`,
      subtotal: -nilaiDiskon,
      isDiscount: true,
      poinDitebus: poinDitebus,
    });
    renderOrderList();
  } catch (error) {
    console.log("Penukaran poin dibatalkan oleh pengguna.");
    daftarItemsPesanan = daftarItemsPesanan.filter((item) => !item.isDiscount);
    renderOrderList();
  }
}

function renderKanban(filter = "semua") {
  setActiveNav("proses");
  const kanbanContent = `
    <div class="kanban-main">
      <div class="kanban-container">
        <div class="kanban-column" id="col-diterima">
          <div class="kanban-header">
            <h2>Diterima</h2>
            <span class="card-count" id="count-diterima">0</span>
          </div>
          <div class="kanban-cards"></div>
        </div>

        <div class="kanban-column" id="col-proses-cuci">
          <div class="kanban-header">
            <h2>Proses Cuci</h2>
            <span class="card-count" id="count-proses-cuci">0</span>
          </div>
          <div class="kanban-cards"></div>
        </div>

        <div class="kanban-column" id="col-siap-diambil">
          <div class="kanban-header">
            <h2>Siap Diambil</h2>
            <span class="card-count" id="count-siap-diambil">0</span>
          </div>
          <div class="kanban-cards"></div>
        </div>

        
      </div>
    </div>
  `;
  renderPage(kanbanContent);
  renderKanbanCards(filter);
}

function renderRiwayat() {
  setActiveNav("riwayat");
  const riwayatContent = `
    <div class="search-container">
      <input type="text" id="searchRiwayat" placeholder="Cari ID Transaksi atau Nama...">
    </div>
    <ul class="history-list"></ul>
  `;
  renderPage(riwayatContent);
  updateRiwayatList();
  document
    .getElementById("searchRiwayat")
    .addEventListener("input", (e) => updateRiwayatList(e.target.value));
}

function renderPelanggan() {
  setActiveNav("pelanggan");
  const pelangganContent = `
    <div class="search-container">
      <input type="text" id="searchPelanggan" placeholder="Cari nama atau nomor HP...">
    </div>
    <ul class="history-list"></ul>
  `;
  renderPage(pelangganContent);
  updatePelangganList();
  document
    .getElementById("searchPelanggan")
    .addEventListener("input", (e) => updatePelangganList(e.target.value));
}

// GANTI SELURUH FUNGSI renderStruk ANDA DENGAN VERSI FINAL INI
// GANTI SELURUH FUNGSI renderStruk ANDA DENGAN VERSI FINAL INI
function renderStruk(transaksi) {
  console.log("Data yang diterima renderStruk:", transaksi);
  if (!transaksi.items || !Array.isArray(transaksi.items)) {
    transaksi.items = [];
  }
  const grandTotal = transaksi.items.reduce(
    (sum, item) => sum + item.subtotal,
    0
  );
  const itemsHtml = transaksi.items
    .map(
      (item) => `
            <div class="struk-item">
                <div class="item-details">
                    <span class="item-name">${item.layanan}</span>
                    <span class="item-package">
                        ${item.paket ? item.paket + " - " : ""}
                        ${item.jumlah} ${
        item.kategori === "Kiloan" ? "kg" : "pcs"
      }
                    </span>
                </div>
                <span class="item-price">Rp${item.subtotal.toLocaleString(
                  "id-ID"
                )}</span>
            </div>`
    )
    .join("");

  const isMember = transaksi.statusMember === "Aktif";
  let poinInfoHtml = "";
  if (isMember) {
    const totalBelanja = transaksi.items
      .filter((item) => !item.isDiscount)
      .reduce((sum, item) => sum + item.subtotal, 0);
    const poinDidapat = Math.floor(totalBelanja / 10000);
    const bonusPoin = transaksi.pakaiTotebag ? 1 : 0;
    const totalPoinBaru = poinDidapat + bonusPoin;
    const poinAkhir =
      transaksi.poinSebelumnya + totalPoinBaru - transaksi.poinDitebus;

    let tglKadaluarsaHtml = "";
    if (totalPoinBaru > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 20);
      const tglKadaluarsa = expDate.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      });
      tglKadaluarsaHtml = `<p class="exp-info-struk">(Berlaku s/d ${tglKadaluarsa})</p>`;
    }

    poinInfoHtml = `
            <p class="struk-separator">-------------------------</p> <div class="struk-poin-summary">
                <p><span>Poin Awal:</span><span>${transaksi.poinSebelumnya}</span></p>
                <p><span>Poin Baru:</span><span>+${totalPoinBaru}</span></p>
                <p><span>Poin Dipakai:</span><span>-${transaksi.poinDitebus}</span></p>
                <p class="struk-separator-dotted">.........................</p>
                <p><strong><span>Sisa Poin:</span><span>${poinAkhir}</span></strong></p>
                ${tglKadaluarsaHtml}
            </div>
        `;
  }

  const strukHtml = `
        <div class="page-container struk-container">
            <main>
                <div id="struk-content">
                    <div class="struk-info">
                        <p><span>ID:</span> <span>${
                          transaksi.transaksiId || transaksi.id
                        }</span></p>
                        <p><span>Tanggal:</span> <span>${new Date(
                          transaksi.tanggal
                        ).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}</span></p>
                        <p><span>Pelanggan:</span> <span>${
                          transaksi.nama
                        }</span></p>
                    </div>
                    <p class="struk-separator">-------------------------</p> <div class="struk-items-list">
                        ${itemsHtml}
                    </div>
                    <p class="struk-separator">-------------------------</p> <div class="struk-total">
                        <h3><span>Grand Total:</span> <span>Rp${grandTotal.toLocaleString(
                          "id-ID"
                        )}</span></h3>
                    </div>
                    <p class="struk-bayar"><span>Status:</span> <span><strong>${
                      transaksi.statusBayar
                    }</strong></span></p>
                    ${
                      transaksi.catatan
                        ? `<div class="struk-catatan"><p><span>Catatan:</span> <span>${transaksi.catatan}</span></p></div>`
                        : ""
                    }
                    ${poinInfoHtml}
                    <p class="struk-separator">-------------------------</p> <div class="struk-footer">
                        <p>Terima Kasih!</p>
                        <p>Simpan struk ini sebagai bukti.</p>
                    </div>
                </div>
                <div class="struk-actions">
                    <button id="tombol-cetak"><i class="fa-solid fa-print"></i> Cetak Struk</button>
                    <button id="tombol-wa"><i class="fa-brands fa-whatsapp"></i> Kirim via WhatsApp</button>
                    <button id="tombol-kembali"><i class="fa-solid fa-arrow-left"></i> Kembali</button>
                </div>
            </main>
        </div>
    `;

  // LANGKAH PENTING:
  // 1. Render HTML ke halaman
  renderPage(strukHtml);

  // 2. TUNGGU proses rendering S E L E S A I
  // Baris ini akan memastikan kode event listener baru dieksekusi setelah semua elemen tersedia.
  setTimeout(() => {
    // DAPATKAN ELEMEN SETELAH HTML dijamin ada di DOM.
    const tombolCetak = document.getElementById("tombol-cetak");
    const tombolWa = document.getElementById("tombol-wa");
    const tombolKembali = document.getElementById("tombol-kembali");

    // Tambahkan event listener hanya jika elemen ditemukan
    if (tombolCetak) {
      tombolCetak.addEventListener("click", () => window.print());
    }
    if (tombolWa) {
      tombolWa.addEventListener("click", () => kirimStrukWa(transaksi));
    }
    if (tombolKembali) {
      tombolKembali.addEventListener("click", renderDashboard);
    }
  }, 0); // Menggunakan setTimeout dengan 0 ms akan menunda eksekusi hingga event loop berikutnya.
}

// GANTI FUNGSI LAMA DENGAN VERSI BARU INI
async function renderDetailTransaksi(transactionId) {
  // Tampilkan spinner jika ada
  if (loadingSpinner) loadingSpinner.classList.remove("hidden");

  try {
    const itemsTransaksi = semuaTransaksi.filter(
      (t) => t.ID_Transaksi === transactionId
    );
    if (itemsTransaksi.length === 0) {
      throw new Error("Transaksi tidak ditemukan!");
    }
    const trxPertama = itemsTransaksi[0];

    // GABUNGKAN DATA: Buat objek transaksi yang lengkap untuk struk
    const transaksiUntukStruk = {
      id: trxPertama.ID_Transaksi,
      tanggal: trxPertama.Tanggal_Masuk,
      nama: trxPertama.Nama_Pelanggan,
      noHp: trxPertama.No_HP,
      statusBayar: trxPertama.Status_Bayar,
      catatan: trxPertama.Catatan,

      // --- BAGIAN KUNCI PERBAIKAN ---
      // Ambil data "snapshot" poin langsung dari baris transaksi pertama
      // Jika Poin_Awal ada nilainya, berarti dia member saat itu.
      statusMember: trxPertama.Poin_Awal !== undefined ? "Aktif" : "Non-Member",
      poinSebelumnya: trxPertama.Poin_Awal,
      poinDitebus: trxPertama.Poin_Ditebus,

      // Kita "tebak" status totebag dari selisih poin yang didapat.
      // Poin didapat = (poin dari belanja) + (poin totebag).
      // Jika Poin_Didapat > poin dari belanja, berarti dia pakai totebag.
      pakaiTotebag:
        trxPertama.Poin_Didapat >
        Math.floor(
          itemsTransaksi
            .filter((i) => Number(i.Total_Harga) > 0)
            .reduce((sum, item) => sum + Number(item.Total_Harga), 0) / 10000
        ),

      // Map item-item seperti biasa
      items: itemsTransaksi.map((item) => ({
        kategori: item.Kategori,
        layanan: item.Layanan,
        paket: item.Paket,
        jumlah: item.Jumlah,
        subtotal: Number(item.Total_Harga),
        // Tambahkan properti isDiscount jika itu adalah item diskon
        isDiscount: item.Layanan.toLowerCase().includes("diskon poin"),
      })),
    };

    renderStruk(transaksiUntukStruk);
  } catch (error) {
    // Tampilkan error jika terjadi masalah
    await showCustomModal({
      title: "Error",
      message: error.message,
      confirmText: "OK",
    });
  } finally {
    // Sembunyikan spinner setelah selesai
    if (loadingSpinner) loadingSpinner.classList.add("hidden");
  }
}

// =================================================================
// FUNGSI-FUNGSI LOGIKA & PENDUKUNG
// =================================================================

function setupFormKasir(pelanggan = null) {
  const form = document.getElementById("laundryForm"),
    selectKategori = document.getElementById("kategori"),
    selectLayanan = document.getElementById("layanan"),
    selectPaket = document.getElementById("paket"),
    inputJumlah = document.getElementById("jumlah"),
    infoHarga = document.getElementById("info-harga"),
    submitButton = document.getElementById("submitButton"),
    searchPelanggan = document.getElementById("searchPelanggan"),
    namaPelanggan = document.getElementById("namaPelanggan"),
    noHp = document.getElementById("noHp"),
    idPelanggan = document.getElementById("idPelanggan"),
    datalist = document.getElementById("pelanggan-list"),
    addItemButton = document.getElementById("addItemButton");

  const errorContainer = document.createElement("p");
  errorContainer.className = "error-message";
  namaPelanggan.parentNode.insertBefore(
    errorContainer,
    namaPelanggan.nextSibling
  );
  // Selipkan wadah error tepat setelah input nama pelanggan
  namaPelanggan.parentNode.insertBefore(
    errorContainer,
    namaPelanggan.nextSibling
  );
  // --------------------------------------------------------

  // --- LOGIKA PENCARIAN & "SATPAM" DUPLIKAT PELANGGAN ---
  if (searchPelanggan) {
    datalist.innerHTML = "";
    daftarPelanggan.forEach((p) => {
      const option = document.createElement("option");
      let noHpClipped = p.No_HP ? String(p.No_HP).slice(-4) : "----";
      option.value = `${p.Nama_Pelanggan} (...${noHpClipped})`;
      option.dataset.id = p.ID_Pelanggan;
      option.dataset.nama = p.Nama_Pelanggan;
      option.dataset.nohp = p.No_HP;
      datalist.appendChild(option);
    });

    searchPelanggan.addEventListener("input", (e) => {
      const option = Array.from(datalist.options).find(
        (opt) => opt.value === e.target.value
      );
      if (option) {
        // Jika pelanggan ditemukan di daftar
        const fullData = daftarPelanggan.find(
          (p) => p.ID_Pelanggan === option.dataset.id
        );
        if (fullData) {
          // Isi form dan update area member
          idPelanggan.value = fullData.ID_Pelanggan;
          namaPelanggan.value = fullData.Nama_Pelanggan;
          noHp.value = fullData.No_HP;
          namaPelanggan.readOnly = true;
          noHp.readOnly = true;
          updateMemberSection(fullData); // <-- KUNCI PERUBAHANNYA ADA DI SINI
        }
      } else if (e.target.value === "") {
        // Jika input pencarian dikosongkan
        idPelanggan.value = "";
        namaPelanggan.value = "";
        noHp.value = "";
        namaPelanggan.readOnly = false;
        noHp.readOnly = false;
        updateMemberSection(null); // <-- Kosongkan juga area member
      }
    });

    namaPelanggan.addEventListener("blur", cekDuplikat);
    noHp.addEventListener("blur", cekDuplikat);

    function cekDuplikat() {
      const idPelanggan = document.getElementById("idPelanggan").value;
      // Jika sudah ada ID Pelanggan (artinya pelanggan lama), hentikan fungsi ini
      if (idPelanggan) return;

      const namaPelangganEl = document.getElementById("namaPelanggan");
      const noHpEl = document.getElementById("noHp");
      const errorContainer = document.querySelector(".error-message");
      const submitButton = document.getElementById("submitButton");

      if (!errorContainer || !submitButton) return;

      const namaInput = namaPelangganEl.value.trim().toLowerCase();
      let noHpInput = noHpEl.value.trim();

      // Jangan cek jika kedua input masih kosong
      if (namaInput === "" && noHpInput === "") {
        errorContainer.textContent = "";
        submitButton.disabled = false;
        return;
      }

      if (noHpInput) noHpInput = normalizePhoneNumber(noHpInput);

      const duplikat = daftarPelanggan.find(
        (p) =>
          (namaInput !== "" &&
            p.Nama_Pelanggan &&
            p.Nama_Pelanggan.toLowerCase() === namaInput) ||
          (noHpInput !== "" &&
            p.No_HP &&
            normalizePhoneNumber(String(p.No_HP)) === noHpInput)
      );

      if (duplikat) {
        errorContainer.innerHTML = `
    <div class="info-line">
      <i class="fa-solid fa-circle-info"></i>
      <span>Pelanggan sudah terdaftar. Silakan cari di atas.</span>
    </div>`;
        submitButton.disabled = true;
      } else {
        errorContainer.textContent = "";
        submitButton.disabled = false;
      }
    }
    namaPelanggan.addEventListener("blur", cekDuplikat);
    noHp.addEventListener("blur", cekDuplikat);
  }

  // --- LOGIKA PENGISIAN DROPDOWN LAYANAN ---
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
    inputJumlah.disabled = !selectPaket.value;
    hitungHarga();
  });
  inputJumlah.addEventListener("input", hitungHarga);

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

  const statusBayarSelect = document.getElementById("statusBayar");
  const metodePembayaranWrapper = document.getElementById(
    "metode-pembayaran-wrapper"
  );

  if (statusBayarSelect && metodePembayaranWrapper) {
    // Fungsi untuk menampilkan/menyembunyikan
    const toggleMetodePembayaran = () => {
      if (statusBayarSelect.value === "Lunas") {
        metodePembayaranWrapper.classList.remove("hidden");
      } else {
        metodePembayaranWrapper.classList.add("hidden");
      }
    };

    // Panggil saat pertama kali form dimuat
    toggleMetodePembayaran();
    // Panggil setiap kali nilainya berubah
    statusBayarSelect.addEventListener("change", toggleMetodePembayaran);
  }

  addItemButton.addEventListener("click", addItemToOrder);
  form.addEventListener("submit", handleFormSubmit);
  updateMemberSection(pelanggan);
}

// GANTI SELURUH FUNGSI handleFormSubmit DENGAN INI
// GANTI SELURUH FUNGSI handleFormSubmit ANDA DENGAN INI

async function handleFormSubmit(e) {
  e.preventDefault();
  const submitButton = document.getElementById("submitButton");
  submitButton.disabled = true;
  submitButton.innerHTML = 'Memproses... <div class="spinner-kecil"></div>';

  try {
    const nama = document.getElementById("namaPelanggan").value.trim();
    const noHpRaw = document.getElementById("noHp").value.trim();
    if (daftarItemsPesanan.length === 0) {
      throw new Error("Mohon tambahkan setidaknya satu item pesanan.");
    }
    if (!nama || !noHpRaw) {
      throw new Error("Nama dan Nomor HP pelanggan wajib diisi.");
    }

    const pelangganId = document.getElementById("idPelanggan").value;
    const pelangganData = daftarPelanggan.find(
      (p) => p.ID_Pelanggan === pelangganId
    );

    // --- PERBAIKAN UTAMA DI SINI ---
    const statusBayarValue = document.getElementById("statusBayar").value;
    const metodePembayaranValue =
      statusBayarValue === "Lunas"
        ? document.querySelector('input[name="metodeBayar"]:checked').value
        : ""; // Kosongkan jika belum lunas

    const payload = {
      idCabang: idCabangAktif,
      pelangganId: pelangganId,
      poinSebelumnya: pelangganData ? pelangganData.Total_Poin || 0 : 0,
      statusMember: pelangganData
        ? pelangganData.Status_Member || "Non-Member"
        : "Non-Member",
      items: daftarItemsPesanan,
      pakaiTotebag: document.getElementById("pakaiTotebag")
        ? document.getElementById("pakaiTotebag").checked
        : false,
      poinDitebus:
        daftarItemsPesanan.find((item) => item.isDiscount)?.poinDitebus || 0,
      transaksiId: `SCLN-${String(Date.now()).slice(-6)}`,
      tanggal: new Date().toISOString(),
      statusBayar: statusBayarValue,
      metodePembayaran: metodePembayaranValue, // Gunakan variabel yang sudah kita siapkan
      nama: nama,
      noHp: normalizePhoneNumber(noHpRaw),
      catatan: document.getElementById("catatanOrder").value.trim(),
    };

    renderStruk(payload);
    updateDataLokal(payload);
    kirimDataLatarBelakang(payload);
    daftarItemsPesanan = [];
  } catch (error) {
    console.error("Error saat submit form:", error);
    await showCustomModal({
      title: "Input Tidak Lengkap",
      message: error.message,
      confirmText: "OK",
    });
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Simpan & Cetak Struk";
  }
}
/**
 * [BARU] Mengirim data ke server di latar belakang. Jika gagal, simpan ke antrian.
 * @param {object} payload - Data transaksi lengkap.
 */
// PASTIKAN FUNGSI INI DI script.js SAMA PERSIS

// GANTI FUNGSI LAMA DENGAN VERSI SIMPLE INI

async function kirimDataLatarBelakang(payload) {
  try {
    const stringifiedPayload = JSON.stringify(payload);
    const encodedPayload = encodeURIComponent(stringifiedPayload);
    const urlWithParams = `${API_URL}?action=saveTransaction&payload=${encodedPayload}`;

    const response = await fetch(urlWithParams);
    const result = await response.json();
    if (result.status !== "success") {
      throw new Error(result.message || "Server mengembalikan error.");
    }
    console.log(
      `Transaksi ${payload.transaksiId} berhasil disinkronkan ke server.`
    );
  } catch (error) {
    console.warn(
      `Gagal mengirim transaksi ${payload.transaksiId}. Menyimpan ke antrian offline.`,
      error
    );
    simpanKeAntrianOffline(payload);
  }
}

/**
 * [BARU] Menyimpan data transaksi yang gagal dikirim ke localStorage.
 * @param {object} payload - Data transaksi lengkap.
 */
function simpanKeAntrianOffline(payload) {
  // Ambil antrian yang sudah ada, atau buat array baru jika belum ada
  const antrian = JSON.parse(localStorage.getItem("antrianOffline")) || [];
  antrian.push(payload);
  localStorage.setItem("antrianOffline", JSON.stringify(antrian));
  console.log(
    `Transaksi ${payload.transaksiId} telah ditambahkan ke antrian offline.`
  );
}

/**
 * [BARU] Mencoba mengirim semua data di antrian offline ke server.
 */
async function sinkronkanDataOffline() {
  const antrian = JSON.parse(localStorage.getItem("antrianOffline")) || [];
  if (antrian.length === 0) {
    console.log("Tidak ada data offline untuk disinkronkan.");
    return; // Hentikan jika tidak ada apa-apa di antrian
  }

  console.log(
    `Mencoba sinkronisasi ${antrian.length} transaksi dari antrian offline...`
  );
  const antrianBaru = []; // Untuk menyimpan data yang masih gagal

  for (const payload of antrian) {
    try {
      const stringifiedPayload = JSON.stringify(payload);
      const encodedPayload = encodeURIComponent(stringifiedPayload);
      const urlWithParams = `${API_URL}?action=saveTransaction&payload=${encodedPayload}`;

      const response = await fetch(urlWithParams);
      const result = await response.json();
      if (result.status === "success") {
        console.log(
          `Transaksi ${payload.transaksiId} dari antrian berhasil disinkronkan.`
        );
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.warn(
        `Transaksi ${payload.transaksiId} masih gagal disinkronkan, tetap di antrian.`,
        error
      );
      antrianBaru.push(payload); // Masukkan kembali ke antrian jika masih gagal
    }
  }

  // Simpan sisa antrian yang masih gagal
  localStorage.setItem("antrianOffline", JSON.stringify(antrianBaru));

  // Jika ada perubahan, muat ulang semua data dari server untuk memastikan konsistensi
  if (antrianBaru.length < antrian.length) {
    console.log("Sinkronisasi selesai, memuat ulang data terbaru...");
    await muatDataAwal();
  }
}

/**
 * [BARU] Mengupdate variabel data global (semuaTransaksi) secara manual.
 * @param {object} payload - Data transaksi yang baru dibuat.
 */
function updateDataLokal(payload) {
  // Bagian 1: Tambahkan data transaksi baru ke daftar transaksi (ini sudah benar)
  payload.items.forEach((item) => {
    semuaTransaksi.push({
      ID_Transaksi: payload.transaksiId,
      ID_Pelanggan: payload.pelangganId,
      Nama_Pelanggan: payload.nama,
      No_HP: payload.noHp,
      Kategori: item.kategori,
      Layanan: item.layanan,
      Paket: item.paket,
      Jumlah: item.jumlah,
      Total_Harga: item.subtotal,
      Status_Bayar: payload.statusBayar,
      Tanggal_Masuk: payload.tanggal,
      Status: "Diterima",
      Catatan: payload.catatan,
    });
  });

  // ==========================================================
  // BAGIAN 2 (BARU): Update data poin di daftar pelanggan
  // ==========================================================

  // Cek apakah ini transaksi dari pelanggan yang sudah terdaftar
  if (payload.pelangganId) {
    // Cari index pelanggan di dalam array daftarPelanggan
    const pelangganIndex = daftarPelanggan.findIndex(
      (p) => p.ID_Pelanggan === payload.pelangganId
    );

    // Jika pelanggan ditemukan di daftar lokal
    if (pelangganIndex > -1) {
      // Hitung kembali perubahan poin dari transaksi ini
      const totalBelanja = payload.items
        .filter((item) => !item.isDiscount)
        .reduce((sum, item) => sum + item.subtotal, 0);
      const poinDidapat = Math.floor(totalBelanja / 10000);
      const bonusPoin = payload.pakaiTotebag ? 1 : 0;
      const totalPoinBaru = poinDidapat + bonusPoin;

      const poinSebelumnya = daftarPelanggan[pelangganIndex].Total_Poin || 0;
      const poinAkhir = poinSebelumnya + totalPoinBaru - payload.poinDitebus;

      // Langsung update nilainya di variabel global!
      daftarPelanggan[pelangganIndex].Total_Poin = poinAkhir;

      // Update juga tanggal kadaluarsanya jika dapat poin baru
      if (totalPoinBaru > 0) {
        const newExpDate = new Date();
        newExpDate.setDate(newExpDate.getDate() + 20); // Sesuai aturan 20 hari
        daftarPelanggan[pelangganIndex].Poin_Kadaluarsa_Pada =
          newExpDate.toISOString();
      }

      console.log(
        `Poin untuk ${payload.nama} berhasil diupdate di lokal: ${poinAkhir}`
      );
    }
  }

  console.log("Variabel data lokal telah diupdate.");
}

function hitungStatistik() {
  const today = new Date().toISOString().slice(0, 10);
  if (!Array.isArray(semuaTransaksi)) return;

  const uniqueTransactions = Object.values(
    semuaTransaksi.reduce((acc, t) => {
      acc[t.ID_Transaksi] = t;
      return acc;
    }, {})
  );

  const transaksiHariIni = semuaTransaksi.filter(
    (t) => t.Tanggal_Masuk && t.Tanggal_Masuk.slice(0, 10) === today
  );
  const revenueToday = transaksiHariIni.reduce(
    (sum, t) => sum + (Number(t.Total_Harga) || 0),
    0
  );
  const ordersToday = new Set(transaksiHariIni.map((t) => t.ID_Transaksi)).size;

  const activeOrders = uniqueTransactions.filter(
    (t) => t.Status && t.Status !== "Selesai"
  ).length;
  const readyOrders = uniqueTransactions.filter(
    (t) => t.Status === "Siap Diambil"
  ).length;

  document.getElementById(
    "revenue-today"
  ).textContent = `Rp ${revenueToday.toLocaleString("id-ID")}`;
  document.getElementById("orders-today").textContent = ordersToday;
  document.getElementById("active-orders").textContent = activeOrders;
  document.getElementById("ready-orders").textContent = readyOrders;
}

function renderStatusChart() {
  const ctx = document.getElementById("statusChart");
  if (!ctx || !Array.isArray(semuaTransaksi)) return;
  const uniqueTransactions = Object.values(
    semuaTransaksi.reduce((acc, t) => {
      acc[t.ID_Transaksi] = t;
      return acc;
    }, {})
  );
  const statusCounts = { Diterima: 0, "Proses Cuci": 0, "Siap Diambil": 0 };
  uniqueTransactions.forEach((trx) => {
    if (trx.Status && statusCounts.hasOwnProperty(trx.Status)) {
      statusCounts[trx.Status]++;
    }
  });

  // Hancurkan chart lama jika ada untuk mencegah error
  const existingChart = Chart.getChart(ctx);
  if (existingChart) {
    existingChart.destroy();
  }

  new Chart(ctx, {
    type: "pie",
    data: {
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
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Komposisi Order Aktif" },
      },
    },
  });
}

async function addItemToOrder() {
  const kategori = document.getElementById("kategori").value;
  const layanan = document.getElementById("layanan").value;
  const paket = document.getElementById("paket").value;
  const jumlah = parseFloat(document.getElementById("jumlah").value);

  // Validasi input kosong (tidak berubah)
  if (!kategori || !layanan || !paket || isNaN(jumlah) || jumlah <= 0) {
    await showCustomModal({
      title: "Input Tidak Lengkap",
      message:
        "Mohon isi semua data item pesanan (kategori, layanan, paket, dan jumlah) dengan benar.",
      confirmText: "OK",
    });
    return;
  }

  const layananTerpilih = daftarLayanan.find(
    (item) =>
      item.Kategori === kategori &&
      item.Layanan === layanan &&
      item.Paket === paket
  );

  if (!layananTerpilih) {
    await showCustomModal({
      title: "Error",
      message: "Layanan tidak ditemukan. Mohon muat ulang halaman.",
      confirmText: "OK",
    });
    return;
  }

  // --- BAGIAN BARU: Validasi Minimal Order KG ---
  // Cek aturan minimal dari kamus kita
  const minKg = ATURAN_MINIMAL_KG[layanan];

  // Jalankan pengecekan HANYA jika item ini adalah Kiloan dan punya aturan minimal
  if (kategori === "Kiloan" && minKg && jumlah < minKg) {
    await showCustomModal({
      title: "Minimal Order",
      message: `Layanan "${layanan}" memiliki minimal order ${minKg} kg. Mohon sesuaikan jumlah.`,
      confirmText: "Mengerti",
    });
    return; // Hentikan fungsi, item tidak akan ditambahkan
  }
  // --- SELESAI ---

  const subtotal = layananTerpilih.Harga * jumlah;
  daftarItemsPesanan.push({ kategori, layanan, paket, jumlah, subtotal });

  // Reset dropdown (tidak berubah)
  document.getElementById("kategori").value = "";
  resetDropdowns([
    document.getElementById("layanan"),
    document.getElementById("paket"),
  ]);
  renderOrderList();
}

function renderOrderList() {
  const listContainer = document.getElementById("order-items-list");
  const grandTotalEl = document.getElementById("grand-total");
  let grandTotal = 0;

  if (!listContainer || !grandTotalEl) return;

  const html = daftarItemsPesanan
    .map((item, index) => {
      grandTotal += item.subtotal;

      // STRUKTUR BARU UNTUK TAMPILAN LEBIH BAIK
      const itemHtml = `
        <div class="item-info">
          <span class="item-name">${item.layanan}</span>
          <span class="item-details">${
            item.isDiscount
              ? ""
              : `${item.paket} (${item.jumlah} ${
                  item.kategori === "Kiloan" ? "kg" : "pcs"
                })`
          }</span>
        </div>
        <div class="item-price">
          <span class="item-currency">Rp</span>
          <span class="item-value">${item.subtotal.toLocaleString(
            "id-ID"
          )}</span>
        </div>
        <button type="button" class="btn-remove" onclick="removeItemFromOrder(${index})"><i class="fa-solid fa-xmark"></i></button>
      `;

      // Beri kelas 'is-discount' pada <li> jika itemnya adalah diskon
      return `<li class="order-item ${
        item.isDiscount ? "is-discount" : ""
      }">${itemHtml}</li>`;
    })
    .join("");

  listContainer.innerHTML = html;
  grandTotalEl.textContent = `Rp ${grandTotal.toLocaleString("id-ID")}`;
}

function removeItemFromOrder(index) {
  daftarItemsPesanan.splice(index, 1);
  renderOrderList();
}

function updateRiwayatList(filter = "") {
  const listContainer = document.querySelector(".history-list");
  if (!listContainer) return;
  const filterText = String(filter || "")
    .trim()
    .toLowerCase();

  const groupedTransactions = semuaTransaksi.reduce((acc, trx) => {
    if (!acc[trx.ID_Transaksi]) {
      acc[trx.ID_Transaksi] = {
        id: trx.ID_Transaksi,
        nama: trx.Nama_Pelanggan,
        tanggal: trx.Tanggal_Masuk,
        statusBayar: trx.Status_Bayar, // <-- Data asli diambil dari sini
        total: 0,
      };
    }
    acc[trx.ID_Transaksi].total += Number(trx.Total_Harga) || 0;
    return acc;
  }, {});

  let riwayatTersaring = Object.values(groupedTransactions).filter(
    (trx) =>
      !filterText ||
      (trx.nama && trx.nama.toLowerCase().includes(filterText)) ||
      (trx.id && trx.id.toLowerCase().includes(filterText))
  );

  riwayatTersaring.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  const listItems = riwayatTersaring
    .map((trx) => {
      const tanggalMasuk = new Date(trx.tanggal).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      // --- PERBAIKAN DI SINI ---
      const statusBayar = trx.statusBayar || "Belum Lunas"; // Memberi nilai default
      const statusBayarClass = statusBayar.toLowerCase().replace(" ", "-");
      // -------------------------

      return `
            <li class="history-item" onclick="renderDetailTransaksi('${
              trx.id
            }')">
                <div class="history-item-main">
                    <strong class="history-item-name">${trx.nama}</strong>
                    <span class="history-item-id">${trx.id}</span>
                </div>
                <div class="history-item-details">
                    <span class="history-item-date">${tanggalMasuk}</span>
                    <span class="payment-status ${statusBayarClass}">${statusBayar}</span>
                    <strong class="history-item-total">Rp ${trx.total.toLocaleString(
                      "id-ID"
                    )}</strong>
                </div>
            </li>`;
    })
    .join("");

  listContainer.innerHTML =
    listItems.length > 0
      ? listItems
      : "<li>Tidak ada riwayat transaksi ditemukan.</li>";
}

function updatePelangganList(filter = "") {
  const listContainer = document.querySelector(".history-list");
  if (!listContainer) return;
  const filterText = String(filter || "")
    .trim()
    .toLowerCase();

  let pelangganTersaring = daftarPelanggan.filter(
    (p) =>
      !filterText ||
      (p.Nama_Pelanggan &&
        p.Nama_Pelanggan.toLowerCase().includes(filterText)) ||
      (p.No_HP && String(p.No_HP).includes(filterText))
  );

  const listItems = pelangganTersaring
    .map(
      (p) => `
    <li class="history-item" onclick='renderFormKasir(${JSON.stringify(p)})'>
        <div class="history-item-main">
            <strong class="history-item-name">${p.Nama_Pelanggan}</strong>
            <span class="history-item-id">${p.No_HP || "No HP tidak ada"}</span>
        </div>
    </li>`
    )
    .join("");

  listContainer.innerHTML =
    listItems.length > 0
      ? listItems
      : "<li>Tidak ada pelanggan ditemukan.</li>";
}

document.addEventListener("change", function (e) {
  if (e.target.classList.contains("status-select")) {
    const id = e.target.dataset.id;
    const nama = e.target.dataset.nama;
    const nohp = e.target.dataset.nohp;
    const newStatus = e.target.value;

    // Kalau status dipindah ke "Selesai"
    if (newStatus === "Selesai") {
      const trx = semuaTransaksi.find((t) => t.ID_Transaksi === id);

      if (trx && trx.Status_Bayar !== "Lunas") {
        // munculkan modal pembayaran
        showPaymentModal(id, nama, nohp);
        return; // jangan lanjut updateStatusTransaksi
      }
    }

    // kalau status lain, update langsung
    updateStatusTransaksi(id, newStatus, nohp, nama);
  }
});

// GANTI SELURUH FUNGSI renderKanbanCards LAMA DENGAN VERSI FINAL INI
function renderKanbanCards(filter = "semua") {
  const counts = { diterima: 0, "proses-cuci": 0, "siap-diambil": 0 };
  document.querySelectorAll(".kanban-cards").forEach((c) => (c.innerHTML = ""));

  // LANGKAH A: Kelompokkan semua item berdasarkan ID Transaksi yang sama
  const groupedTransactions = Object.values(
    semuaTransaksi.reduce((acc, trx) => {
      if (trx.Status) {
        if (!acc[trx.ID_Transaksi]) {
          acc[trx.ID_Transaksi] = { ...trx, items: [] };
        }
        acc[trx.ID_Transaksi].items.push({
          paket: trx.Paket,
          layanan: trx.Layanan,
        });
      }

      return acc;
    }, {})
  );

  // LANGKAH B: Urutkan transaksi
  groupedTransactions.sort((a, b) => {
    const prioritasA = a.items.some((item) =>
      String(item.paket).toLowerCase().includes("expres")
    );
    const prioritasB = b.items.some((item) =>
      String(item.paket).toLowerCase().includes("expres")
    );
    if (prioritasA && !prioritasB) return -1;
    if (!prioritasA && prioritasB) return 1;
    // Gunakan parseDMYDate untuk perbandingan yang aman
    return parseDMYDate(b.Tanggal_Masuk) - parseDMYDate(a.Tanggal_Masuk);
  });

  let transaksiUntukDitampilkan = groupedTransactions;
  if (filter !== "semua") {
    transaksiUntukDitampilkan = transaksiUntukDitampilkan.filter(
      (t) => t.Status === filter
    );
  }

  // LANGKAH C: Render setiap kartu
  transaksiUntukDitampilkan.forEach((trx) => {
    const card = document.createElement("div");
    const tanggalMasuk = parseDMYDate(trx.Tanggal_Masuk);
    const sekarang = new Date();
    const selisihJam = (sekarang - tanggalMasuk) / (1000 * 60 * 60);

    const deadlineTerpendek = Math.min(
      ...trx.items.map((item) => getDeadlineHours(item.paket))
    );
    const ambangBatasWaktu = deadlineTerpendek * 0.7;
    let waktuMepet = selisihJam > ambangBatasWaktu;

    const statusBayar = (trx.Status_Bayar || "Belum Lunas").trim();
    const statusBayarClass = statusBayar.toLowerCase().replace(/ /g, "-");
    const isReadyToPay =
      (trx.Status || "").trim().toLowerCase() === "selesai" &&
      statusBayar.toLowerCase() !== "lunas";

    const itemsHtml = trx.items
      .map(
        (item) =>
          `<span class="paket-label">${item.paket || item.layanan}</span>`
      )
      .join(" ");

    const statusValues = ["Diterima", "Proses Cuci", "Siap Diambil", "Selesai"];
    const options = statusValues
      .map(
        (status) =>
          `<option value="${status}" ${
            trx.Status === status ? "selected" : ""
          }>${status}</option>`
      )
      .join("");

    card.className = `kanban-card ${waktuMepet ? "mepet" : ""}`;
    card.innerHTML = `
    <div class="card-header">
      <h4>${trx.Nama_Pelanggan}</h4>
      ${
        waktuMepet
          ? `<span class="deadline-warning"><i class="fa-solid fa-fire"></i> Deadline</span>`
          : ""
      }
    </div>
    <p>${trx.ID_Transaksi}</p>
    <div class="card-details">${itemsHtml}</div>
    <div class="card-footer">
      <span class="payment-status ${statusBayarClass}">${statusBayar}</span>
      ${
        isReadyToPay
          ? `<button class="btn-pay" onclick="showPaymentModal('${
              trx.ID_Transaksi
            }', '${trx.Nama_Pelanggan.replace(/'/g, "\\'")}')">Bayar</button>`
          : ""
      }
      <select class="status-select" 
        data-id="${trx.ID_Transaksi}" 
        data-nohp="${trx.No_HP}" 
        data-nama="${trx.Nama_Pelanggan.replace(/'/g, "\\'")}"
      >${options}</select>
    </div>
  `;

    const statusKey = trx.Status.replace(/ /g, "-").toLowerCase();
    const colId = `col-${statusKey}`;
    const columnContent = document.querySelector(`#${colId} .kanban-cards`);
    if (columnContent) {
      columnContent.appendChild(card);
      counts[statusKey]++;
    }
  });

  // Update jumlah di header kolom
  document.getElementById("count-diterima").textContent = counts.diterima;
  document.getElementById("count-proses-cuci").textContent =
    counts["proses-cuci"];
  document.getElementById("count-siap-diambil").textContent =
    counts["siap-diambil"];
}

// GANTI SELURUH FUNGSI parseDMYDate LAMA ANDA DENGAN INI

function parseDMYDate(dateValue) {
  // Jika sudah dalam format Date, langsung kembalikan
  if (dateValue instanceof Date) {
    return dateValue;
  }

  if (typeof dateValue !== "string" || !dateValue) {
    return null;
  }

  // BARU: Cek apakah ini format ISO (YYYY-MM-DD)
  // Ini akan menangani tanggal dari transaksi yang baru dibuat
  if (dateValue.includes("-") && dateValue.includes("T")) {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  }

  // Jika bukan ISO, lanjutkan dengan logika lama untuk format DMY (DD/MM/YYYY)
  // Ini akan menangani tanggal yang dimuat dari sheet
  const parts = dateValue.split(/[\s/:]+/);
  if (parts.length < 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Bulan di JS dimulai dari 0
  const year = parseInt(parts[2], 10);
  const hours = parseInt(parts[3], 10) || 0;
  const minutes = parseInt(parts[4], 10) || 0;
  const seconds = parseInt(parts[5], 10) || 0;

  const date = new Date(year, month, day, hours, minutes, seconds);
  return isNaN(date.getTime()) ? null : date;
}

document.addEventListener("change", (e) => {
  if (e.target.classList.contains("status-select")) {
    const { id, nohp, nama } = e.target.dataset;
    const status = e.target.value;
    updateStatusDiSheet(id, status, nohp || "", nama || "Pelanggan");
  }
});

async function updateStatusDiSheet(transactionId, newStatus, noHp, nama) {
  const selectElement = document.querySelector(
    `.status-select[data-id="${transactionId}"]`
  );
  if (selectElement) selectElement.disabled = true;
  try {
    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({
        action: "updateStatus",
        transactionId,
        newStatus,
      }),
    });
    semuaTransaksi.forEach((t) => {
      if (t.ID_Transaksi === transactionId) t.Status = newStatus;
    });
    renderKanbanCards();
    if (newStatus === "Siap Diambil" && noHp) {
      try {
        await showCustomModal({
          title: "Kirim Notifikasi?",
          message: `Status cucian untuk ${nama} (${transactionId}) sudah "Siap Diambil". Kirim notifikasi via WhatsApp?`,
          confirmText: "Ya, Kirim Notifikasi",
          cancelText: "Tidak",
        });

        // --- BAGIAN BARU DIMULAI DI SINI ---

        // 1. Cari semua item yang sesuai dengan ID transaksi ini
        const itemsTransaksi = semuaTransaksi.filter(
          (t) => t.ID_Transaksi === transactionId
        );

        // 2. Ubah array item menjadi format teks (list)
        const itemsText = itemsTransaksi
          .map((item) => {
            const detailPaket =
              item.Paket && item.Paket !== "-" ? ` (${item.Paket})` : "";
            const detailJumlah = item.Jumlah
              ? `- ${item.Jumlah} ${item.Kategori === "Kiloan" ? "kg" : "pcs"}`
              : "";
            return `- ${item.Layanan}${detailPaket} ${detailJumlah}`;
          })
          .join("\n"); // Gabungkan setiap item dengan baris baru

        // --- AKHIR BAGIAN BARU ---

        // 3. Buat pesan WhatsApp yang sudah berisi list item
        let pesan = `Halo Kak *${nama}*,\n\nCucian Anda (order ${transactionId}) sudah selesai dan siap diambil. Berikut rinciannya:\n\n${itemsText}\n\nTerima kasih!\n*SuperClean Laundry*`;

        window.open(
          `https://wa.me/${normalizePhoneNumber(
            noHp
          )}?text=${encodeURIComponent(pesan)}`,
          "_blank"
        );
      } catch (error) {
        console.log("Pengiriman notifikasi WA dibatalkan.");
      }
    }
  } catch (error) {
    alert("Gagal update status. Data akan kembali seperti semula.");
    if (selectElement) selectElement.disabled = false;
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
  const inputJumlah = document.getElementById("jumlah");
  const infoHarga = document.getElementById("info-harga");
  if (inputJumlah) {
    inputJumlah.disabled = true;
    inputJumlah.value = "";
  }
  if (infoHarga) infoHarga.textContent = "Estimasi Harga: Rp 0";
}

// GANTI SELURUH FUNGSI LAMA ANDA DENGAN VERSI BARU INI

function kirimStrukWa(trx) {
  // 1. Hitung Grand Total terlebih dahulu
  const grandTotal = trx.items.reduce((sum, item) => sum + item.subtotal, 0);

  // 2. Format daftar item menjadi teks
  const itemsText = trx.items
    .map((item) => {
      // Tampilkan detail jumlah hanya jika bukan item diskon
      const detailJumlah = item.isDiscount
        ? ""
        : `\n_(${item.jumlah} ${item.kategori === "Kiloan" ? "kg" : "pcs"})_`;

      const hargaFormatted = `Rp${item.subtotal.toLocaleString("id-ID")}`;

      // Menggunakan karakter monospace untuk alignment sederhana
      return `\`\`\`${item.layanan.padEnd(
        20,
        " "
      )}${hargaFormatted}\`\`\`${detailJumlah}`;
    })
    .join("\n");

  // 3. (KONDISIONAL) Buat ringkasan poin jika pelanggan adalah member
  let poinText = "";
  if (trx.statusMember === "Aktif") {
    const totalBelanja = trx.items
      .filter((item) => !item.isDiscount)
      .reduce((sum, item) => sum + item.subtotal, 0);
    const poinDidapat = Math.floor(totalBelanja / 10000);
    const bonusPoin = trx.pakaiTotebag ? 1 : 0;
    const totalPoinBaru = poinDidapat + bonusPoin;
    const poinAkhir = trx.poinSebelumnya + totalPoinBaru - trx.poinDitebus;

    poinText = `
---------------------------------
*RINGKASAN POIN*
Poin Awal   : ${trx.poinSebelumnya}
Poin Baru   : +${totalPoinBaru}
Poin Dipakai: -${trx.poinDitebus}
---------------------------------
*Sisa Poin   : ${poinAkhir}*
`;
  }

  // 4. (KONDISIONAL) Siapkan teks catatan jika ada
  const catatanText = trx.catatan ? `\nCatatan: _${trx.catatan}_` : "";

  // 5. Gabungkan semua bagian menjadi satu pesan utuh
  const pesan = `
*--- STRUK SUPER CLEAN LAUNDRY ---*

ID      : *${trx.transaksiId || trx.id}*
Tanggal : ${new Date(trx.tanggal).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}
Pelanggan: ${trx.nama}
---------------------------------
${itemsText}
---------------------------------
*Grand Total : Rp${grandTotal.toLocaleString("id-ID")}*
Status      : *${trx.statusBayar.toUpperCase()}*
${catatanText}
${poinText}
---------------------------------
Terima Kasih!
Simpan pesan ini sebagai bukti transaksi.
`;

  // 6. Buka link WhatsApp dengan pesan yang sudah diformat
  window.open(
    `https://wa.me/${normalizePhoneNumber(trx.noHp)}?text=${encodeURIComponent(
      pesan
    )}`,
    "_blank"
  );
}

function normalizePhoneNumber(phone) {
  if (!phone) return "";
  let phoneStr = String(phone).trim().replace(/[- .]/g, "");
  if (phoneStr.startsWith("0")) return "62" + phoneStr.substring(1);
  if (phoneStr.startsWith("+62")) return phoneStr.substring(1);
  if (phoneStr.startsWith("8")) return "62" + phoneStr;
  return phoneStr;
}

async function kirimDataKeSheet(transaksi) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(transaksi),
    });
  } catch (error) {
    simpanTransaksiOffline(transaksi);
    console.warn("Koneksi Gagal. Data disimpan sementara.", transaksi);
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
  console.log(`Mencoba sinkronisasi ${offline.length} transaksi offline...`);
  const berhasilTerkirim = [];
  for (const trx of offline) {
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(trx),
      });
      berhasilTerkirim.push(trx);
    } catch (error) {
      console.error("Sinkronisasi berhenti karena koneksi gagal.", error);
      break;
    }
  }
  if (berhasilTerkirim.length > 0) {
    const idBerhasil = new Set(berhasilTerkirim.map((t) => t.id));
    const antrianBaru = offline.filter((t) => !idBerhasil.has(t.id));
    localStorage.setItem("transaksiOffline", JSON.stringify(antrianBaru));
    console.log(`${berhasilTerkirim.length} transaksi berhasil disinkronkan.`);
    await muatDataAwal(); // Muat ulang data setelah sinkronisasi
  }
}

// GANTI FUNGSI setActiveNav LAMA ANDA DENGAN VERSI BARU INI

// GANTI SELURUH FUNGSI setActiveNav LAMA ANDA DENGAN INI

function setActiveNav(id) {
  // 1. Hapus kelas 'active' dari SEMUA tombol navigasi di seluruh halaman
  document
    .querySelectorAll(".nav-button")
    .forEach((btn) => btn.classList.remove("active"));

  // 2. Cari tombol yang sesuai di NAVIGASI BAWAH
  const activeBtnBottom = document.getElementById(`nav-${id}`);
  if (
    activeBtnBottom &&
    !activeBtnBottom.classList.contains("fab-add-button")
  ) {
    activeBtnBottom.classList.add("active");
  }

  // 3. Cari tombol yang sesuai di HAMBURGER MENU
  const activeBtnMenu = document.querySelector(`.hamburger-menu #nav-${id}`);
  if (activeBtnMenu) {
    activeBtnMenu.classList.add("active");
  }

  // 4. Update judul di header atas
  const titleElement = document.getElementById("header-title");
  const buttonWithText = activeBtnBottom || activeBtnMenu; // Prioritaskan nav bawah untuk judul
  const spanInsideButton = buttonWithText?.querySelector("span");

  if (spanInsideButton) {
    titleElement.textContent = spanInsideButton.textContent;
  } else if (id === "tambah") {
    titleElement.textContent = "Tambah Order";
  } else if (id === "dashboard") {
    titleElement.textContent = "Dashboard";
  }
}

// TAMBAHKAN FUNGSI BARU INI DI MANA SAJA DALAM script.js
/**
 * Menangani proses pendaftaran member dengan mengirim data ke backend.
 * @param {string} pelangganId - ID pelanggan yang akan didaftarkan.
 * @param {string} namaPelanggan - Nama pelanggan untuk konfirmasi.
 */
// GANTI SELURUH FUNGSI handleRegisterMember DENGAN INI
async function handleRegisterMember(pelangganId, namaPelanggan) {
  // BAGIAN 'confirm()' YANG LAMA SUDAH DIHAPUS DARI SINI

  const registerButton = document.getElementById("btnJadikanMember");
  if (registerButton) {
    registerButton.disabled = true;
    registerButton.innerHTML = 'Memproses... <div class="spinner-kecil"></div>';
  }

  try {
    const urlWithParams = `${API_URL}?action=registerMember&id=${pelangganId}&nama=${encodeURIComponent(
      namaPelanggan
    )}`;
    const response = await fetch(urlWithParams);
    const result = await response.json();

    if (result.status !== "success") {
      throw new Error(result.message);
    }

    await showCustomModal({
      title: "Berhasil!",
      message: `${namaPelanggan} berhasil didaftarkan sebagai member.`,
      confirmText: "Sip!",
    });

    const container = document.getElementById("member-actions-container");
    container.innerHTML = `<div class="member-info"><span class="badge member">Member Aktif ✅</span></div>`;

    const pelangganIndex = daftarPelanggan.findIndex(
      (p) => p.ID_Pelanggan === pelangganId
    );
    if (pelangganIndex > -1) {
      daftarPelanggan[pelangganIndex].Status_Member = "Aktif";
    }
  } catch (error) {
    await showCustomModal({
      title: "Gagal",
      message: `Gagal mendaftarkan member: ${error.message}`,
      confirmText: "OK",
    });

    // Kembalikan tombol ke keadaan semula jika gagal
    const container = document.getElementById("member-actions-container");
    if (container) {
      const pelangganData = daftarPelanggan.find(
        (p) => p.ID_Pelanggan === pelangganId
      );
      updateMemberSection(pelangganData);
    }
  }
}

/**
 * Mengubah nama paket layanan menjadi durasi deadline dalam format jam.
 * @param {string} namaPaket - Contoh: "Ekspres 8 Jam" atau "Reguler 3 Hari".
 * @returns {number} - Durasi deadline dalam jam.
 */
function getDeadlineHours(namaPaket) {
  if (!namaPaket) return 72; // Default 3 hari jika nama paket kosong

  const nama = namaPaket.toLowerCase();
  // Mencari angka pertama di dalam teks (misal: dari "Kilat 2 Jam", akan dapat "2")
  const angkaMatch = nama.match(/\d+/);

  if (!angkaMatch) return 72; // Default jika tidak ada angka sama sekali

  let durasi = parseInt(angkaMatch[0]);

  // Jika nama paket mengandung kata "hari", ubah durasi ke jam
  if (nama.includes("hari")) {
    return durasi * 24;
  }

  // Jika tidak, asumsikan durasinya sudah dalam jam
  return durasi;
}

// GANTI SELURUH FUNGSI showCustomModal ANDA DENGAN INI

function showCustomModal(options) {
  // Ambil semua elemen modal
  const overlay = document.getElementById("modal-overlay");
  const box = document.getElementById("modal-box");
  const titleEl = document.getElementById("modal-title");
  const messageEl = document.getElementById("modal-message");
  const inputEl = document.getElementById("modal-input");
  const confirmBtn = document.getElementById("modal-confirm");
  const cancelBtn = document.getElementById("modal-cancel");
  console.log("3. showCustomModal dipanggil. Opsi:", options);
  const radioContainer = document.getElementById("modal-radio-options");
  if (!radioContainer) {
    console.error(
      "KRUSIAL: Elemen #modal-radio-options tidak ditemukan di HTML!"
    );
    return;
  }

  // Reset state
  radioContainer.innerHTML = "";
  inputEl.value = "";

  // Set konten modal dari options
  titleEl.textContent = options.title || "Konfirmasi";
  messageEl.textContent = options.message || "";
  confirmBtn.textContent = options.confirmText || "Ya";
  cancelBtn.textContent = options.cancelText || "Batal";

  // --- LOGIKA UTAMA YANG DIPERBAIKI ---
  if (options.isPaymentModal && options.options) {
    // KASUS 1: MODAL PEMBAYARAN (RADIO BUTTON)
    inputEl.classList.add("hidden");
    radioContainer.classList.remove("hidden");

    options.options.forEach((opt, index) => {
      const checked = index === 0 ? "checked" : "";
      radioContainer.innerHTML += `
        <div>
          <input type="radio" id="payment-${opt}" name="paymentMethod" value="${opt}" ${checked}>
          <label for="payment-${opt}">${opt}</label>
        </div>`;
    });
  } else if (options.input) {
    // KASUS 2: MODAL DENGAN INPUT TEKS
    inputEl.classList.remove("hidden");
    radioContainer.classList.add("hidden");
    inputEl.placeholder = options.placeholder || "";
  } else {
    // KASUS 3: MODAL KONFIRMASI BIASA (TANPA INPUT APAPUN)
    inputEl.classList.add("hidden");
    radioContainer.classList.add("hidden");
  }

  // Tampilkan modal
  overlay.classList.remove("hidden");

  return new Promise((resolve, reject) => {
    const closeModal = () => {
      overlay.classList.add("hidden");
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
    };

    // Handler konfirmasi yang sudah diperbaiki
    const onConfirm = () => {
      if (options.isPaymentModal) {
        const selected = document.querySelector(
          'input[name="paymentMethod"]:checked'
        );
        console.log("4. Tombol Konfirmasi diklik. Pilihan radio:", selected);
        resolve(selected ? selected.value : options.options[0]);
      } else {
        resolve(options.input ? inputEl.value : true);
      }
      closeModal();
    };

    const onCancel = () => {
      reject(false);
      closeModal();
    };

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
  });
}

// GANTI SELURUH FUNGSI LAMA ANDA DENGAN VERSI LENGKAP INI

async function konfirmasiDaftarMember(pelangganId, namaPelanggan) {
  try {
    // 1. Tampilkan modal konfirmasi
    await showCustomModal({
      title: "Konfirmasi Pendaftaran",
      message: `Anda yakin ingin mendaftarkan ${namaPelanggan} sebagai member dengan biaya Rp 50.000 (termasuk totebag)? Biaya akan ditambahkan ke transaksi ini.`,
      confirmText: "Ya, Daftarkan & Tambahkan",
      cancelText: "Batal",
    });

    // --- KODE YANG HILANG ADA DI SINI ---

    // 2. Cek agar biaya tidak ditambahkan dua kali
    const sudahAdaItemPendaftaran = daftarItemsPesanan.some(
      (item) => item.isRegistration
    );

    if (!sudahAdaItemPendaftaran) {
      // 3. Buat objek item baru untuk biaya pendaftaran
      const pendaftaranItem = {
        kategori: "Lain-lain",
        layanan: "Pendaftaran Member (+Totebag)",
        paket: "",
        jumlah: 1,
        subtotal: 50000,
        isRegistration: true, // Penanda khusus
      };

      // 4. Masukkan item biaya ke dalam keranjang belanja
      daftarItemsPesanan.push(pendaftaranItem);

      // 5. Perbarui tampilan daftar pesanan di layar agar user melihatnya
      renderOrderList();
    }

    // --- AKHIR KODE YANG HILANG ---

    // 6. Jalankan fungsi untuk mendaftarkan member di backend (ini tetap sama)
    handleRegisterMember(pelangganId, namaPelanggan);
  } catch (error) {
    // Jika user klik 'Batal', tidak terjadi apa-apa
    console.log("Pendaftaran member dibatalkan oleh pengguna.");
  }
}

function renderFullPage(html) {
  appContainer.innerHTML = html;
}

// Untuk semua halaman standar dengan header simpel
function renderPage(contentHtml) {
  appContainer.innerHTML = `
    <div class="page-container">
      <main>${contentHtml}</main>
    </div>
  `;
}

/**
 * Fungsi untuk membuat ID Transaksi baru yang berurutan (misal: SCLN0001, SCLN0002).
 * @returns {string} ID Transaksi yang baru.
 */
function generateNewTransactionId() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetTransaksi = ss.getSheetByName(SHEET_TRANSAKSI); // Pastikan nama sheet benar
  const lastRow = sheetTransaksi.getLastRow();

  // KASUS 1: Jika sheet masih kosong (belum ada transaksi sama sekali)
  // Kita mulai dari 0001. Anggap baris 1 adalah header.
  if (lastRow < 2) {
    return "SCLN0001";
  }

  // KASUS 2: Jika sudah ada transaksi
  // Ambil ID dari baris terakhir
  const lastId = sheetTransaksi.getRange(lastRow, 1).getValue(); // Kolom 1 = Kolom A

  // Ambil hanya bagian angkanya (misal: dari "SCLN0001" menjadi "0001")
  const lastNumberStr = lastId.slice(4);

  // Ubah menjadi angka, lalu tambah 1
  const newNumber = parseInt(lastNumberStr, 10) + 1;

  // Format kembali menjadi 4 digit dengan angka 0 di depan
  // Misal: 2 -> "0002", 15 -> "0015", 123 -> "0123"
  const newNumberPadded = String(newNumber).padStart(4, "0");

  // Gabungkan kembali dengan prefix "SCLN"
  return "SCLN" + newNumberPadded;
}

function renderLoginScreen() {
  // Sembunyikan semua elemen aplikasi utama jika ada
  document.getElementById("app-container").classList.add("hidden");
  document.querySelector(".bottom-nav")?.classList.add("hidden");

  document.querySelector(".top-header")?.classList.add("hidden");
  const loginHtml = `
      <div class="login-container">
        <img src="logo.png" alt="Logo" class="login-logo">
        <h2>Selamat Datang</h2>
        <p>Silakan login untuk melanjutkan</p>
        <form id="loginForm">
          <div class="form-group">
            <input type="text" id="username" placeholder="Username" required>
          </div>
          <div class="form-group">
            <input type="password" id="password" placeholder="Password" required>
          </div>
          <button type="submit" class="btn-primary full-width">Login</button>
        </form>

        <a href="owner.html" class="owner-login-link">Masuk sebagai Owner</a>

      </div>
    `;
  // Tambahkan halaman login ke body
  document.body.insertAdjacentHTML("beforeend", loginHtml);

  // Tambahkan event listener untuk form login
  document
    .getElementById("loginForm")
    .addEventListener("submit", handleLoginAttempt);
}

// FUNGSI BARU UNTUK PROSES LOGIN
async function handleLoginAttempt(e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const loginButton = document.querySelector("#loginForm button");
  loginButton.textContent = "Memproses...";
  loginButton.disabled = true;

  try {
    const loginData = JSON.stringify({ username, password });
    const response = await fetch(
      `${API_URL}?action=login&data=${encodeURIComponent(loginData)}`
    );
    const result = await response.json();

    if (result.status === "success") {
      // Jika berhasil, simpan info cabang ke localStorage
      localStorage.setItem("idCabangLaundry", result.idCabang);
      localStorage.setItem("namaCabangLaundry", result.namaCabang);
      // Muat ulang halaman, fungsi init() akan otomatis membawa ke dashboard
      location.reload();
    } else {
      alert(result.message);
      loginButton.textContent = "Login";
      loginButton.disabled = false;
    }
  } catch (error) {
    alert("Gagal terhubung ke server. Cek koneksi internet Anda.");
    loginButton.textContent = "Login";
    loginButton.disabled = false;
  }
}

// FUNGSI BARU UNTUK MENGATUR HAMBURGER MENU
function setupHamburgerMenu() {
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const hamburgerMenu = document.getElementById("hamburger-menu");
  const menuOverlay = document.getElementById("menu-overlay");

  const menuBranchName = document.getElementById("menu-branch-name");
  const menuBranchId = document.getElementById("menu-branch-id");
  const logoutBtn = document.getElementById("menu-logout"); // 👈 Dapatkan tombol logout

  const namaCabang = localStorage.getItem("namaCabangLaundry");
  const idCabang = localStorage.getItem("idCabangLaundry");

  if (
    hamburgerBtn &&
    hamburgerMenu &&
    menuOverlay &&
    menuBranchName &&
    menuBranchId &&
    logoutBtn
  ) {
    if (namaCabang) {
      menuBranchName.textContent = namaCabang;
    }
    if (idCabang) {
      menuBranchId.textContent = `ID: ${idCabang}`;
    }

    hamburgerBtn.addEventListener("click", () => {
      hamburgerMenu.classList.toggle("is-active");
      menuOverlay.classList.toggle("is-active");
    });

    menuOverlay.addEventListener("click", () => {
      hamburgerMenu.classList.remove("is-active");
      menuOverlay.classList.remove("is-active");
    });

    // 👈 Tambahkan event listener untuk tombol logout
    logoutBtn.addEventListener("click", handleLogout);
  }
}

// FUNGSI BARU UNTUK MENAMPILKAN MODAL PEMBAYARAN
// TAMBAHKAN FUNGSI YANG HILANG INI DI script.js

function showPaymentModal(id, nama, nohp) {
  const overlay = document.getElementById("modal-overlay");
  const title = document.getElementById("modal-title");
  const message = document.getElementById("modal-message");
  const input = document.getElementById("modal-input");
  const radioOptions = document.getElementById("modal-radio-options");

  // isi modal
  title.textContent = "Pembayaran";
  message.textContent = `Pilih metode pembayaran untuk ${nama}`;
  input.classList.add("hidden");

  // tampilkan pilihan metode (Cash / QRIS)
  radioOptions.classList.remove("hidden");
  radioOptions.innerHTML = `
    <label><input type="radio" name="payment" value="Cash"> Cash</label><br>
    <label><input type="radio" name="payment" value="QRIS"> QRIS</label>
  `;

  overlay.classList.remove("hidden");

  // tombol konfirmasi
  document.getElementById("modal-confirm").onclick = function () {
    const selected = document.querySelector('input[name="payment"]:checked');
    if (!selected) {
      alert("Pilih metode pembayaran dulu!");
      return;
    }
    updatePembayaran(id, nohp, nama, selected.value);
    overlay.classList.add("hidden");
  };

  // tombol batal
  document.getElementById("modal-cancel").onclick = function () {
    overlay.classList.add("hidden");
  };
}

// TAMBAHKAN FUNGSI BARU INI DI script.js

async function updatePembayaran(transactionId, noHp, nama, paymentMethod) {
  if (loadingSpinner) loadingSpinner.classList.remove("hidden");

  try {
    // Kirim update ke server
    await fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({
        action: "updatePayment",
        transactionId: transactionId,
        paymentMethod: paymentMethod,
      }),
    });

    // Perbarui data di variabel lokal
    semuaTransaksi.forEach((t) => {
      if (t.ID_Transaksi === transactionId) {
        t.Status_Bayar = "Lunas";
        t.Metode_Pembayaran = paymentMethod;
      }
    });

    // Tampilkan ulang kartu Kanban
    renderKanbanCards();
    alert(`Pembayaran untuk order ${transactionId} (${nama}) berhasil.`);
  } catch (error) {
    console.error("Gagal mengupdate pembayaran:", error);
    alert("Gagal mengupdate status pembayaran. Cek koneksi Anda.");
  } finally {
    if (loadingSpinner) loadingSpinner.classList.add("hidden");
  }
}

function handleLogout() {
  // Tampilkan konfirmasi sebelum logout
  if (confirm("Anda yakin ingin logout?")) {
    // Hapus data sesi dari penyimpanan browser
    localStorage.removeItem("idCabangLaundry");
    localStorage.removeItem("namaCabangLaundry");
    // Muat ulang halaman, otomatis akan kembali ke layar login
    location.reload();
  }
}
