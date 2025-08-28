// =================================================================
// PENGATURAN - WAJIB DIISI
// =================================================================
const API_URL =
  "https://script.google.com/macros/s/AKfycbw8yPL2Yo2CuIZ9XzrsDlBW9YMlq8TtYOtE6bYSZz50sqvhQqnMjWajiskRamWaAyoViw/exec";

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

async function init() {
  if (loadingSpinner) loadingSpinner.classList.remove("hidden");
  document
    .getElementById("nav-dashboard")
    .addEventListener("click", renderDashboard);
  document.getElementById("nav-tambah").addEventListener("click", () => {
    daftarItemsPesanan = []; // <-- Kosongkan keranjang HANYA di sini
    renderFormKasir(); // Lalu render form yang sudah kosong
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
}

async function muatDataAwal() {
  try {
    const [servicesRes, transactionsRes, customersRes] = await Promise.all([
      fetch(`${API_URL}?action=getServices`),
      fetch(API_URL),
      fetch(`${API_URL}?action=getCustomers`),
    ]);
    daftarLayanan = await servicesRes.json();
    semuaTransaksi = await transactionsRes.json();
    daftarPelanggan = await customersRes.json();
  } catch (error) {
    console.error("Gagal memuat data awal:", error);
    alert("Gagal memuat data awal. Cek koneksi internet Anda.");
  }
}

function renderPage(html) {
  appContainer.innerHTML = html;
}

function renderDashboard() {
  setActiveNav("dashboard");
  const dashboardHtml = `
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
    </div>
  `;
  renderFullPage(dashboardHtml);
  hitungStatistik();
  renderStatusChart();
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
    <label>Status Pembayaran</label>
    <div class="radio-group-container">
      <input type="radio" id="statusBelumLunas" name="statusBayar" value="Belum Lunas" checked>
      <label for="statusBelumLunas">Belum Lunas</label>
      <input type="radio" id="statusLunas" name="statusBayar" value="Lunas">
      <label for="statusLunas">Lunas</label>
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
  renderPage("Tambah Order Baru", formHtml);
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
        <div class="kanban-column" id="col-diterima"><div class="kanban-header"><h2>Diterima</h2><span class="card-count" id="count-diterima">0</span></div><div class="kanban-cards"></div></div>
        <div class="kanban-column" id="col-proses-cuci"><div class="kanban-header"><h2>Proses Cuci</h2><span class="card-count" id="count-proses-cuci">0</span></div><div class="kanban-cards"></div></div>
        <div class="kanban-column" id="col-siap-diambil"><div class="kanban-header"><h2>Siap Diambil</h2><span class="card-count" id="count-siap-diambil">0</span></div><div class="kanban-cards"></div></div>
      </div>
    </div>
  `;
  renderPage("Proses Cucian", kanbanContent);
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
  renderPage("Riwayat Transaksi", riwayatContent);
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
  renderPage("Daftar Pelanggan", pelangganContent);
  updatePelangganList();
  document
    .getElementById("searchPelanggan")
    .addEventListener("input", (e) => updatePelangganList(e.target.value));
}

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
  ${item.jumlah} ${item.kategori === "Kiloan" ? "kg" : "pcs"}
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
            <p><span>Pelanggan:</span> <span>${transaksi.nama}</span></p>
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

  renderPage("Struk Transaksi", strukHtml); // Judul halaman juga diubah

  document
    .getElementById("tombol-cetak")
    .addEventListener("click", () => window.print());
  document
    .getElementById("tombol-wa")
    .addEventListener("click", () => kirimStrukWa(transaksi));
  document
    .getElementById("tombol-kembali")
    .addEventListener("click", renderDashboard);
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

  addItemButton.addEventListener("click", addItemToOrder);
  form.addEventListener("submit", handleFormSubmit);
  updateMemberSection(pelanggan);
}

// GANTI SELURUH FUNGSI handleFormSubmit DENGAN INI
async function handleFormSubmit(e) {
  e.preventDefault();
  const submitButton = document.getElementById("submitButton");
  submitButton.disabled = true;
  submitButton.innerHTML = 'Memproses... <div class="spinner-kecil"></div>';

  // UBAH BAGIAN 'catch' MENJADI 'async' dan gunakan 'showCustomModal'
  try {
    const nama = document.getElementById("namaPelanggan").value.trim();
    const noHpRaw = document.getElementById("noHp").value.trim();
    if (daftarItemsPesanan.length === 0)
      throw new Error("Mohon tambahkan setidaknya satu item pesanan.");
    if (!nama || !noHpRaw)
      throw new Error("Nama dan Nomor HP pelanggan wajib diisi.");

    const pelangganId = document.getElementById("idPelanggan").value;
    const pelangganData = daftarPelanggan.find(
      (p) => p.ID_Pelanggan === pelangganId
    );

    const payload = {
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
      statusBayar: document.querySelector('input[name="statusBayar"]:checked')
        .value,
      nama: nama,
      noHp: normalizePhoneNumber(noHpRaw),
      catatan: document.getElementById("catatanOrder").value.trim(),
    };

    renderStruk(payload);
    updateDataLokal(payload);
    kirimDataLatarBelakang(payload);
    daftarItemsPesanan = [];
  } catch (error) {
    // Tampilkan error menggunakan modal kustom
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

// GANTI SELURUH FUNGSI renderKanbanCards LAMA DENGAN VERSI FINAL INI
function renderKanbanCards(filter = "semua") {
  const counts = { diterima: 0, "proses-cuci": 0, "siap-diambil": 0 };
  document.querySelectorAll(".kanban-cards").forEach((c) => (c.innerHTML = ""));

  // LANGKAH A: Kelompokkan semua item berdasarkan ID Transaksi yang sama
  const groupedTransactions = Object.values(
    semuaTransaksi.reduce((acc, trx) => {
      if (trx.Status && trx.Status !== "Selesai") {
        if (!acc[trx.ID_Transaksi]) {
          acc[trx.ID_Transaksi] = {
            ...trx,
            items: [],
          };
        }
        acc[trx.ID_Transaksi].items.push({
          paket: trx.Paket,
          layanan: trx.Layanan,
        });
      }
      return acc;
    }, {})
  );

  // LANGKAH B: Urutkan transaksi. Prioritas utama adalah paket ekspres.
  groupedTransactions.sort((a, b) => {
    const prioritasA = a.items.some((item) =>
      String(item.paket).toLowerCase().includes("expres")
    );
    const prioritasB = b.items.some((item) =>
      String(item.paket).toLowerCase().includes("expres")
    );

    if (prioritasA && !prioritasB) return -1;
    if (!prioritasA && prioritasB) return 1;

    return new Date(a.Tanggal_Masuk) - new Date(b.Tanggal_Masuk);
  });

  let transaksiUntukDitampilkan = groupedTransactions;
  if (filter !== "semua") {
    transaksiUntukDitampilkan = transaksiUntukDitampilkan.filter(
      (t) => t.Status === filter
    );
  }

  // LANGKAH C: Render setiap kartu dengan logika deadline
  transaksiUntukDitampilkan.forEach((trx) => {
    const card = document.createElement("div");
    const tanggalMasuk = new Date(trx.Tanggal_Masuk);
    const sekarang = new Date();
    const selisihJam = (sekarang - tanggalMasuk) / (1000 * 60 * 60);

    const deadlineTerpendek = Math.min(
      ...trx.items.map((item) => getDeadlineHours(item.paket))
    );

    const ambangBatasWaktu = deadlineTerpendek * 0.7;
    let waktuMepet = selisihJam > ambangBatasWaktu;

    card.className = `kanban-card ${waktuMepet ? "mepet" : ""}`;

    const itemsHtml = trx.items
      .map((item) => `<span class="paket-label">${item.paket}</span>`)
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
    const statusBayar = (trx.Status_Bayar || "Belum Lunas").trim();
    const statusBayarClass = statusBayar.toLowerCase().replace(" ", "-");

    card.innerHTML = `
      <div class="card-header">
          <h4>${trx.Nama_Pelanggan}</h4>
          ${
            waktuMepet
              ? '<span class="deadline-warning"><i class="fa-solid fa-fire"></i> Deadline</span>'
              : ""
          }
      </div>
      <p>${trx.ID_Transaksi}</p>
      <div class="card-details">${itemsHtml}</div>
      <div class="card-footer">
        <span class="payment-status ${statusBayarClass}">${statusBayar}</span>
        <select class="status-select" data-id="${
          trx.ID_Transaksi
        }" data-nohp="${trx.No_HP}" data-nama="${
      trx.Nama_Pelanggan
    }">${options}</select>
      </div>`;

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
      if (
        confirm(
          `Status cucian ${nama} (${transactionId}) sudah "Siap Diambil".\nKirim notifikasi WhatsApp?`
        )
      ) {
        let pesan = `Halo Kak *${nama}*,\nCucian Anda (order ${transactionId}) sudah selesai dan siap diambil.\n\nTerima kasih!\n*SuperClean Laundry*`;
        window.open(
          `https://wa.me/${normalizePhoneNumber(
            noHp
          )}?text=${encodeURIComponent(pesan)}`,
          "_blank"
        );
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

function kirimStrukWa(trx) {
  const total = trx.items.reduce((sum, item) => sum + item.subtotal, 0);
  let pesan = `*Struk SuperClean Laundry*\n\nID: *${trx.id}*\nPelanggan: ${
    trx.nama
  }\nTotal: *Rp ${total.toLocaleString("id-ID")}*\nStatus: *${
    trx.statusBayar
  }*\n\nTerima kasih!`;
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

function setActiveNav(id) {
  document
    .querySelectorAll(".nav-button")
    .forEach((btn) => btn.classList.remove("active"));
  const activeBtn = document.getElementById(`nav-${id}`);
  if (activeBtn) activeBtn.classList.add("active");
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

function showCustomModal(options) {
  // Ambil semua elemen modal
  const overlay = document.getElementById("modal-overlay");
  const box = document.getElementById("modal-box");
  const titleEl = document.getElementById("modal-title");
  const messageEl = document.getElementById("modal-message");
  const inputEl = document.getElementById("modal-input");
  const confirmBtn = document.getElementById("modal-confirm");
  const cancelBtn = document.getElementById("modal-cancel");

  // Set konten modal dari options
  titleEl.textContent = options.title || "Konfirmasi";
  messageEl.textContent = options.message || "";
  confirmBtn.textContent = options.confirmText || "Ya";
  cancelBtn.textContent = options.cancelText || "Batal";

  // Tampilkan atau sembunyikan input field
  if (options.input) {
    inputEl.classList.remove("hidden");
    inputEl.placeholder = options.placeholder || "";
    inputEl.value = ""; // Kosongkan input setiap kali modal muncul
  } else {
    inputEl.classList.add("hidden");
  }

  // Tampilkan modal
  overlay.classList.remove("hidden");

  // Ini bagian canggihnya: Promise
  return new Promise((resolve, reject) => {
    // Fungsi untuk menutup modal
    const closeModal = () => {
      overlay.classList.add("hidden");
      // Hapus event listener agar tidak menumpuk
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
    };

    // Handler saat tombol konfirmasi diklik
    const onConfirm = () => {
      resolve(options.input ? inputEl.value : true);
      closeModal();
    };

    // Handler saat tombol batal diklik
    const onCancel = () => {
      reject(false); // Kirim sinyal 'false' jika dibatalkan
      closeModal();
    };

    // Pasang event listener
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
function renderPage(title, contentHtml) {
  appContainer.innerHTML = `
    <div class="page-container">
      <header class="header-simple"><h1>${title}</h1></header>
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
