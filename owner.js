const API_URL =
  "https://script.google.com/macros/s/AKfycbzzF78LhJrpK01QZ2CAiel0rPN_5nQYWlAPNjw9Z-gIUkbiAGLSHyzheEnZK1EZnZKqzA/exec";

// Event listener utama saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  // Saat halaman siap, tugas kita HANYA memasang "pendengar" di form login.
  // Aplikasi akan diam dan menunggu user untuk login.
  const loginForm = document.getElementById("ownerLoginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleOwnerLogin);
  }
});

// Fungsi ini HANYA akan berjalan SETELAH user menekan tombol "Login"
async function handleOwnerLogin(e) {
  e.preventDefault();
  console.log("1. Tombol login diklik, memulai proses...");
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
      console.log("2. Login di server SUKSES, role adalah owner.");

      const loginSection = document.getElementById("login-section");
      const dashboardSection = document.getElementById("dashboard-section");

      console.log("3. Mencari elemen #login-section di HTML:", loginSection);
      console.log(
        "4. Mencari elemen #dashboard-section di HTML:",
        dashboardSection
      );

      if (loginSection && dashboardSection) {
        console.log(
          "5. Kedua elemen ditemukan! Menyembunyikan login, menampilkan dashboard..."
        );
        loginSection.classList.add("hidden");
        dashboardSection.classList.remove("hidden");
        console.log(
          "6. Class 'hidden' sudah diatur. Seharusnya dashboard sekarang terlihat."
        );

        fetchOwnerData();
        setupHamburgerMenu();
      } else {
        // Jika salah satu atau keduanya tidak ditemukan
        console.error(
          "!! PENTING: Salah satu atau kedua elemen (#login-section / #dashboard-section) TIDAK DITEMUKAN di HTML!"
        );
        alert("Struktur HTML tidak ditemukan! Cek console untuk detail.");
      }
    } else {
      console.warn("2. Login GAGAL atau role bukan owner.", result);
      alert(result.message || "Anda tidak memiliki hak akses sebagai Owner.");
      loginButton.textContent = "Login";
      loginButton.disabled = false;
    }
  } catch (error) {
    console.error("Terjadi error saat fetch:", error);
    alert("Gagal terhubung ke server.");
    loginButton.textContent = "Login";
    loginButton.disabled = false;
  }
}

function setupHamburgerMenu() {
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const menuPanel = document.getElementById("mobile-menu");
  const menuOverlay = document.getElementById("menu-overlay");

  if (!hamburgerBtn || !menuPanel || !menuOverlay) return;

  const toggleMenu = () => {
    menuPanel.classList.toggle("is-active");
    menuOverlay.classList.toggle("is-active");
    document.body.classList.toggle("menu-open");
  };

  hamburgerBtn.addEventListener("click", toggleMenu);
  menuOverlay.addEventListener("click", toggleMenu);
}

async function fetchOwnerData() {
  try {
    document.body.classList.add("loading");
    const response = await fetch(`${API_URL}?action=getOwnerSummary`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    updateUI(data);
  } catch (error) {
    console.error("Gagal mengambil data owner:", error);
    document.body.innerHTML =
      "<h1><i class='fas fa-server'></i> Gagal memuat data.</h1><p>Cek koneksi atau hubungi developer.</p>";
  } finally {
    document.body.classList.remove("loading");
  }
}

function updateUI(data) {
  document.getElementById(
    "kpi-revenue-today"
  ).textContent = `Rp ${data.kpi.revenueToday.toLocaleString("id-ID")}`;
  document.getElementById("kpi-transactions-today").textContent =
    data.kpi.transactionsToday;
  document.getElementById(
    "kpi-revenue-month"
  ).textContent = `Rp ${data.kpi.revenueThisMonth.toLocaleString("id-ID")}`;
  document.getElementById("kpi-new-customers").textContent =
    data.kpi.newCustomersThisMonth;

  renderRevenueChart(data.charts.dailyRevenue);
  renderServiceChart(data.charts.serviceComposition);

  const tableBody = document.querySelector("#recent-table tbody");
  tableBody.innerHTML = "";
  if (data.recentTransactions && data.recentTransactions.length > 0) {
    data.recentTransactions.forEach((trx) => {
      const statusClass =
        trx.Status?.toLowerCase().replace(/ /g, "-") || "default";
      tableBody.innerHTML += `
                <tr>
                    <td>${trx.ID_Transaksi}</td>
                    <td>${trx.Nama_Pelanggan}</td>
                    <td>Rp ${Number(trx.Total_Harga).toLocaleString(
                      "id-ID"
                    )}</td>
                    <td><span class="status ${statusClass}">${
        trx.Status
      }</span></td>
                    <td>${trx.ID_Cabang || "N/A"}</td>
                </tr>`;
    });
  } else {
    tableBody.innerHTML = `<tr><td colspan="5">Belum ada transaksi.</td></tr>`;
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
