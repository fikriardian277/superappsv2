// =================================================================
// PENGATURAN - WAJIB DIISI
// =================================================================
const API_URL =
  "https://script.google.com/macros/s/AKfycbwhNlD0p0r6beOlDie6LIBJSJIRS1GHXM-rmuih9f7vRuxStEElnrthvgn4Hv48zAD0yg/exec";
// =================================================================

// Variabel global
let daftarLayanan = [],
  semuaTransaksi = [],
  daftarPelanggan = [],
  transaksiSaatIni = {};
const appContainer = document.getElementById("app-container");

// =================================================================
// ROUTER & RENDER HALAMAN
// =================================================================
function renderPage(html) {
  appContainer.innerHTML = html;
}

function renderDashboard() {
  setActiveNav("dashboard");
  renderPage(`
        <div class="page-container">
            <header><img src="logo.png" alt="Logo" class="logo"><h1>Dashboard</h1></header>
            <main>
                <div class="summary-grid">
                    <div class="summary-card"><h3>Revenue Hari Ini</h3><p id="revenue-today">Rp 0</p></div>
                    <div class="summary-card"><h3>Order Hari Ini</h3><p id="orders-today">0</p></div>
                    <div class="summary-card"><h3>Order Aktif</h3><p id="active-orders">0</p></div>
                    <div class="summary-card"><h3>Belum Diambil</h3><p id="ready-orders">0</p></div>
                </div>
            </main>
        </div>`);
  hitungStatistik();
}

function renderFormKasir() {
  setActiveNav("tambah");
  renderPage(`
        <div class="page-container">
            <header class="header-simple"><h1>Tambah Order Baru</h1></header>
            <main class="form-container">
                <form id="laundryForm">
                    <div class="form-group"><label for="searchPelanggan">Cari Pelanggan (Nama/HP)</label><input type="text" id="searchPelanggan" list="pelanggan-list" placeholder="Ketik untuk mencari...">
                    <datalist id="pelanggan-list"></datalist></div>
                    <input type="hidden" id="idPelanggan">
                    <div class="form-group"><label for="namaPelanggan">Nama Pelanggan</label><input type="text" id="namaPelanggan" required></div>
                    <div class="form-group"><label for="noHp">Nomor HP</label><input type="number" id="noHp" placeholder="62812..." required></div>
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

function renderKanban() {
  setActiveNav("proses");
  renderPage(`
        <div class="page-container">
            <header class="header-simple"><h1>Proses Cucian</h1></header>
            <main class="kanban-main">
                <div class="kanban-container">
                    <div class="kanban-column" id="col-diterima">
                         <div class="kanban-header"><h2>Diterima</h2><span class="card-count" id="count-diterima">0</span></div>
                         <div class="kanban-cards"></div>
                    </div>
                    <div class="kanban-column" id="col-proses-cuci">
                        <div class="kanban-header"><h2>Proses Cuci</h2><span class="card-count" id="count-proses-cuci">0</span></div>
                        <div class="kanban-cards"></div>
                    </div>
                    <div class="kanban-column" id="col-siap-diambil">
                        <div class="kanban-header"><h2>Siap Diambil</h2><span class="card-count" id="count-siap-diambil">0</span></div>
                        <div class="kanban-cards"></div>
                    </div>
                </div>
            </main>
        </div>`);
  renderKanbanCards();
}

function renderStruk(transaksi) {
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
                    <h4>TOTAL: Rp ${transaksi.total.toLocaleString(
                      "id-ID"
                    )}</h4>
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
    .addEventListener("click", () => kirimStrukWa(transaksi));
  document
    .getElementById("tombol-kembali")
    .addEventListener("click", renderDashboard);
}

// =================================================================
// LOGIKA APLIKASI
// =================================================================

async function init() {
  document
    .getElementById("nav-dashboard")
    .addEventListener("click", renderDashboard);
  document
    .getElementById("nav-tambah")
    .addEventListener("click", renderFormKasir);
  document.getElementById("nav-proses").addEventListener("click", renderKanban);

  await muatDataAwal();
  renderDashboard();
  sinkronkanDataOffline();
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
    console.error(error);
    alert("Gagal memuat data awal.");
  }
}

function hitungStatistik() {
  const today = new Date().toISOString().slice(0, 10);
  const transaksiHariIni = semuaTransaksi.filter(
    (t) =>
      t.Tanggal_Masuk &&
      typeof t.Tanggal_Masuk.slice === "function" &&
      t.Tanggal_Masuk.slice(0, 10) === today
  );
  const revenueToday = transaksiHariIni.reduce(
    (sum, t) => sum + (t.Total_Harga || 0),
    0
  );
  const ordersToday = transaksiHariIni.length;
  const activeOrders = semuaTransaksi.filter(
    (t) => t.Status && t.Status !== "Selesai"
  ).length;
  const readyOrders = semuaTransaksi.filter(
    (t) => t.Status === "Siap Diambil"
  ).length;
  document.getElementById(
    "revenue-today"
  ).textContent = `Rp ${revenueToday.toLocaleString("id-ID")}`;
  document.getElementById("orders-today").textContent = ordersToday;
  document.getElementById("active-orders").textContent = activeOrders;
  document.getElementById("ready-orders").textContent = readyOrders;
}

function setupFormKasir() {
  const form = document.getElementById("laundryForm"),
    selectKategori = document.getElementById("kategori"),
    selectLayanan = document.getElementById("layanan"),
    selectPaket = document.getElementById("paket"),
    inputJumlah = document.getElementById("jumlah"),
    infoHarga = document.getElementById("info-harga"),
    searchPelanggan = document.getElementById("searchPelanggan"),
    namaPelanggan = document.getElementById("namaPelanggan"),
    noHp = document.getElementById("noHp"),
    idPelanggan = document.getElementById("idPelanggan"),
    datalist = document.getElementById("pelanggan-list");
  daftarPelanggan.forEach((p) => {
    const option = document.createElement("option");
    option.value = `${p.Nama_Pelanggan} - ${p.No_HP}`;
    option.dataset.id = p.ID_Pelanggan;
    option.dataset.nama = p.Nama_Pelanggan;
    option.dataset.nohp = p.No_HP;
    datalist.appendChild(option);
  });
  searchPelanggan.addEventListener("input", (e) => {
    const value = e.target.value,
      option = Array.from(datalist.options).find((opt) => opt.value === value);
    if (option) {
      idPelanggan.value = option.dataset.id;
      namaPelanggan.value = option.dataset.nama;
      noHp.value = option.dataset.nohp;
    }
  });
  const kategoriUnik = [...new Set(daftarLayanan.map((item) => item.Kategori))];
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
  submitButton.textContent = "Memproses...";
  try {
    let pelangganId = document.getElementById("idPelanggan").value,
      nama = document.getElementById("namaPelanggan").value,
      noHp = document.getElementById("noHp").value;
    if (!pelangganId) {
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
    const layananTerpilih = daftarLayanan.find(
      (item) =>
        item.Kategori === document.getElementById("kategori").value &&
        item.Layanan === document.getElementById("layanan").value &&
        item.Paket === document.getElementById("paket").value
    );
    if (noHp.startsWith("0")) noHp = "62" + noHp.substring(1);
    const transaksi = {
      id: `SCLN-${Date.now()}`,
      pelangganId,
      nama,
      noHp,
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
  }
}

function renderKanbanCards() {
  const counts = { diterima: 0, "proses-cuci": 0, "siap-diambil": 0 };
  document
    .querySelectorAll(".kanban-cards")
    .forEach((container) => (container.innerHTML = ""));
  const statusValues = ["Diterima", "Proses Cuci", "Siap Diambil", "Selesai"];

  semuaTransaksi.forEach((trx) => {
    if (!trx || typeof trx.Status !== "string" || trx.Status === "Selesai")
      return;

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
          `Status cucian ${nama} (${transactionId}) sudah "Siap Diambil".\n\nKirim notifikasi ke pelanggan?`
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

document.addEventListener("DOMContentLoaded", init);
