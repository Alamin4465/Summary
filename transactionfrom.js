// ============================================
// transactionfrom.js — সম্পূর্ণ সংশোধিত
// ============================================

let unsubscribeTransaction = null;
let allTransactions = [];
let currentFilter = "all";

let allWallets = [];
let unsubscribeWallets = null;
let walletChartInstance = null;
let incomeExpenseChart = null;

// বাংলা সংখ্যা ফরম্যাট (global dashboard.js-এ আছে, duplicate করবো না)
// ফাইল-লোকাল helper:
function toBanglaNumberLocal(number) {
  if (typeof number !== "number") number = parseFloat(number);
  if (!Number.isFinite(number)) number = 0;
  return number.toLocaleString('bn-BD', { maximumFractionDigits: 2 });
}

// ------------------ ট্রানজেকশন লোড ------------------
function loadTransactions() {
  const content = document.getElementById("content");
  if (!content) return;

  content.innerHTML = `
    <h2 class="titel">ট্রানজেকশন</h2>

    <div id="walletSummary"></div>

    <div class="Filter-tabel">
      <div id="filterButtons">
        <button data-filter="all" class="filterBtn active">সব</button>
        <button data-filter="income" class="filterBtn">শুধু আয়</button>
        <button data-filter="expense" class="filterBtn">শুধু ব্যয়</button>
      </div>

      <div id="summary"></div>

      <table id="transactionTable">
        <thead>
          <tr>
            <th>তারিখ</th>
            <th>টাইপ</th>
            <th>ক্যাটেগরি</th>
            <th>ওয়ালেট</th>
            <th>টাকা</th>
            <th>অ্যাকশন</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>

    <div class="chart-container" style="max-width: 450px; height: 350px; margin: 20px auto; background: var(--glass-bg); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid var(--glass-border); border-radius: 14px; padding: 15px;">
      <canvas id="incomeExpenseChart"></canvas>
    </div>
  `;

  // ফিল্টার বাটন
  document.querySelectorAll("#filterButtons .filterBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#filterButtons .filterBtn").forEach((b) =>
        b.classList.remove("active")
      );
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderTransactionTable();
      renderSummary(allTransactions);
      renderIncomeExpenseCategoryChart(allTransactions, currentFilter);
    });
  });

  // টেবিল এডিট ও ডিলিট
  const tbody = document.querySelector("#transactionTable tbody");
  if (tbody) {
    tbody.addEventListener("click", async (e) => {
      if (e.target.classList.contains("edit_Btn")) {
        showFixedOverlay(e.target.dataset.id);
      }

      if (e.target.classList.contains("delete_Btn")) {
        if (!confirm("আপনি কি সত্যিই ডিলিট করতে চান?")) return;

        const docId = e.target.dataset.id;
        const t = allTransactions.find(x => x.id === docId);
        if (!t) return;

        const db = firebase.firestore();
        const batch = db.batch();

        if (t.category === "ওয়ালেট ট্রান্সফার") {
          const fromRef = db.collection("users").doc(currentUser.uid).collection("wallets").doc(t.fromWalletId);
          const toRef = db.collection("users").doc(currentUser.uid).collection("wallets").doc(t.toWalletId);

          batch.update(fromRef, { balance: firebase.firestore.FieldValue.increment(Number(t.amount)) });
          batch.update(toRef, { balance: firebase.firestore.FieldValue.increment(-Number(t.amount)) });

        } else if (t.walletId) {
          const oldAmount = Number(t.amount) || 0;
          const walletRef = db.collection("users").doc(currentUser.uid)
            .collection("wallets").doc(t.walletId);
          const delta = t.type === 'income' ? -oldAmount : oldAmount;
          batch.update(walletRef, {
            balance: firebase.firestore.FieldValue.increment(delta)
          });
        }

        batch.delete(db.collection("users").doc(currentUser.uid)
          .collection("transactions").doc(docId));

        try {
          await batch.commit();
        } catch (err) {
          alert("ডিলিটে সমস্যা: " + err.message);
        }
      }
    });
  }

  loadWalletsForTransactions();
  fetchTransactionsRealtime();
}

// রিয়েল-টাইম ওয়ালেট
function loadWalletsForTransactions() {
  if (!currentUser) return;
  if (unsubscribeWallets) unsubscribeWallets();

  const db = firebase.firestore();
  unsubscribeWallets = db
    .collection("users")
    .doc(currentUser.uid)
    .collection("wallets")
    .onSnapshot(snapshot => {
      allWallets = [];
      snapshot.forEach(doc => {
        allWallets.push({ id: doc.id, ...doc.data() });
      });

      renderWalletSummary();

      if (document.querySelector("#transactionTable tbody")) {
        renderTransactionTable();
      }
    }, err => console.error("ওয়ালেট লোডে সমস্যা:", err));
}

// ওয়ালেট সারাংশ
function renderWalletSummary() {
  const div = document.getElementById('walletSummary');
  if (!div) return;

  if (allWallets.length === 0) {
    div.innerHTML = `
      <p style="text-align:center; padding:14px; background:rgba(255,255,255,0.05); border-radius:12px; color:#fff; border:1px solid rgba(255,255,255,0.1);">
        💼 এখনো কোনো ওয়ালেট নেই। সেটিংস → ওয়ালেট ম্যানেজ থেকে যোগ করুন।
      </p>`;
    return;
  }

  const sorted = [...allWallets].sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));

  let total = 0;
  const activeWallets = [];
  const zeroWallets = [];

  sorted.forEach(w => {
    const bal = Number(w.balance) || 0;
    total += bal;
    if (bal > 0) activeWallets.push(w);
    else zeroWallets.push(w);
  });

  const chartColors = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#e11d48', '#6366f1', '#8b5cf6', '#14b8a6'];

  const chartLabels = [];
  const chartData = [];
  const chartBgColors = [];
  let legendHtml = '';

  activeWallets.forEach((w, index) => {
    const bal = Number(w.balance) || 0;
    const percent = total > 0 ? ((bal / total) * 100).toFixed(0) : 0;
    const color = chartColors[index % chartColors.length];

    chartLabels.push(w.name);
    chartData.push(bal);
    chartBgColors.push(color);

    legendHtml += `
      <div class="wallet-legend-item">
        <div class="legend-left">
          <span class="legend-dot" style="background:${color}; box-shadow: 0 0 8px ${color}80;"></span>
          <span class="legend-name">${w.name || '—'}</span>
        </div>
        <div class="legend-right">
          <span class="legend-percent">${toBanglaNumberLocal(percent)}%</span>
          <span class="legend-amount">৳ ${toBanglaNumberLocal(bal)}</span>
        </div>
      </div>
    `;
  });

  // 🔧 Zero-balance wallets-কে gray দেখান
  zeroWallets.forEach(w => {
    legendHtml += `
      <div class="wallet-legend-item" style="opacity:0.5;">
        <div class="legend-left">
          <span class="legend-dot" style="background:#6b7280;"></span>
          <span class="legend-name">${w.name || '—'}</span>
        </div>
        <div class="legend-right">
          <span class="legend-percent">০%</span>
          <span class="legend-amount">৳ ০</span>
        </div>
      </div>
    `;
  });

  div.innerHTML = `
    <div class="wallet-overview-card">
      <div class="wallet-header">
        <i class="fas fa-chart-pie"></i> Wallet Overview
      </div>

      <div class="wallet-content">
        <div class="wallet-chart-container">
          <canvas id="walletDoughnutChart"></canvas>
          <div class="chart-center-text">
            <h2>৳ ${toBanglaNumberLocal(total)}</h2>
            <p>Total Balance</p>
          </div>
        </div>

        <div class="wallet-legend-container">
          ${legendHtml}
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById('walletDoughnutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (walletChartInstance) {
    try { walletChartInstance.destroy(); } catch (e) {}
    walletChartInstance = null;
  }

  // Data নেই হলে placeholder
  const hasData = chartData.length > 0;
  const safeLabels = hasData ? chartLabels : ['কোনো ব্যালেন্স নেই'];
  const safeData = hasData ? chartData : [1];
  const safeColors = hasData ? chartBgColors : ['#374151'];

  walletChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: safeLabels,
      datasets: [{
        data: safeData,
        backgroundColor: safeColors,
        borderWidth: 0,
        hoverOffset: hasData ? 5 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }
  });
}

// চার্ট (আয় ও ব্যয়)
function renderIncomeExpenseCategoryChart(transactions, filter) {
  const canvas = document.getElementById("incomeExpenseChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (incomeExpenseChart) {
    try { incomeExpenseChart.destroy(); } catch (e) {}
    incomeExpenseChart = null;
  }

  const categoryTotals = {};
  (transactions || []).forEach((t) => {
    if (t.type === "transfer") return;

    const cat = t.category || "অন্যান্য";
    const type = t.type || "expense";
    const amount = Number(t.amount) || 0;

    if (!categoryTotals[cat]) categoryTotals[cat] = { income: 0, expense: 0 };
    categoryTotals[cat][type] += amount;
  });

  let labels = [];
  let data = [];
  let colors = [];

  const greenColors = ["rgba(0, 128, 0, 0.85)", "rgba(34, 139, 34, 0.85)", "rgba(50, 205, 50, 0.85)", "rgba(0, 100, 0, 0.85)", "rgba(144, 238, 144, 0.85)"];
  const redColors = ["rgba(255, 0, 0, 0.85)", "rgba(220, 20, 60, 0.85)", "rgba(178, 34, 34, 0.85)", "rgba(139, 0, 0, 0.85)", "rgba(255, 99, 71, 0.85)"];

  if (filter === "income") {
    labels = Object.keys(categoryTotals).filter(c => categoryTotals[c].income > 0);
    data = labels.map(cat => categoryTotals[cat].income);
    colors = labels.map((_, i) => greenColors[i % greenColors.length]);
  } else if (filter === "expense") {
    labels = Object.keys(categoryTotals).filter(c => categoryTotals[c].expense > 0);
    data = labels.map(cat => categoryTotals[cat].expense);
    colors = labels.map((_, i) => redColors[i % redColors.length]);
  } else {
    Object.keys(categoryTotals).forEach((cat, i) => {
      if (categoryTotals[cat].income > 0) {
        labels.push(cat + " (আয়)");
        data.push(categoryTotals[cat].income);
        colors.push(greenColors[i % greenColors.length]);
      }
      if (categoryTotals[cat].expense > 0) {
        labels.push(cat + " (ব্যয়)");
        data.push(categoryTotals[cat].expense);
        colors.push(redColors[i % redColors.length]);
      }
    });
  }

  const totalSum = data.reduce((a, b) => a + b, 0);
  const hasData = data.length > 0 && totalSum > 0;

  function formatBanglaPercent(value) {
    const banglaDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    const num = Number(value);
    if (!Number.isFinite(num)) return '০%';
    let str = num.toFixed(1) + '%';
    return str.replace(/\d/g, d => banglaDigits[d]);
  }

  const safeLabels = hasData ? labels : ['কোনো ডাটা নেই'];
  const safeData = hasData ? data : [1];
  const safeColors = hasData ? colors : ['rgba(156, 163, 175, 0.85)'];

  incomeExpenseChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: safeLabels,
      datasets: [{
        data: safeData,
        backgroundColor: safeColors,
        borderWidth: 2,
        borderColor: 'rgba(0, 0, 0, 0.7)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          display: hasData,
          position: window.innerWidth < 480 ? "bottom" : "right",
          labels: {
            color: '#ffffff',
            font: { size: 13, weight: 'bold' },
            padding: 12,
            boxWidth: 14
          }
        },
        tooltip: {
          enabled: hasData,
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = Number(context.parsed) || 0;
              const percentage = totalSum === 0 ? 0 : ((value / totalSum) * 100).toFixed(1);
              return `${label}: ${toBanglaNumberLocal(value)} ৳ (${formatBanglaPercent(percentage)})`;
            }
          }
        },
        datalabels: {
          color: '#fff',
          textStrokeColor: 'rgba(0, 0, 0, 0.8)',
          textStrokeWidth: 2,
          font: { weight: 'bold', size: 12 },
          formatter: (value, ctx) => {
            if (totalSum === 0) return '';
            const percentage = (value / totalSum) * 100;
            if (percentage < 5) return formatBanglaPercent(percentage);
            const label = ctx.chart.data.labels[ctx.dataIndex];
            return `${label}\n${formatBanglaPercent(percentage)}`;
          },
          anchor: 'center',
          align: 'center',
          display: (ctx) => {
            const value = ctx.dataset.data[ctx.dataIndex];
            const percentage = (value / totalSum) * 100;
            return percentage > 5;
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

// ডেটা ফেচ (রিয়েল-টাইম)
function fetchTransactionsRealtime() {
  if (!currentUser) return;
  if (unsubscribeTransaction) unsubscribeTransaction();

  allTransactions = [];

  const db = firebase.firestore();
  unsubscribeTransaction = db
    .collection("users")
    .doc(currentUser.uid)
    .collection("transactions")
    .orderBy("timestamp", "desc")
    .onSnapshot((snapshot) => {
      allTransactions = [];
      snapshot.forEach((doc) => {
        allTransactions.push({ id: doc.id, ...doc.data() });
      });

      renderTransactionTable();
      renderSummary(allTransactions);
      renderIncomeExpenseCategoryChart(allTransactions, currentFilter);
    }, err => console.error("Transactions realtime error:", err));
}

function renderTransactionTable() {
  const tbody = document.querySelector("#transactionTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = allTransactions.filter(
    t => (currentFilter === "all" || (t.type || "") === currentFilter)
  );

  filtered.forEach((t) => {
    const type = t.type || "";
    const row = document.createElement("tr");

    if (type === "transfer") {
      row.style.background = "rgba(59, 130, 246, 0.15)";
      row.style.borderLeft = "4px solid #3b82f6";
    } else {
      row.className = type === "income" ? "income-row" : "expense-row";
    }

    if (t.category === "লোন গ্রহণ") row.classList.add("loan-taken");
    else if (t.category === "লোন পরিশোধ") row.classList.add("loan-repaid");

    let walletName = '—';
    let displayCategory = t.category || "";

    if (t.category === "ওয়ালেট ট্রান্সফার") {
      displayCategory = `ট্রান্সফার: ${t.fromWalletName} ➡️ ${t.toWalletName}`;
      walletName = '—';
    } else if (t.walletId) {
      const w = allWallets.find(x => x.id === t.walletId);
      if (w) walletName = w.name || '—';
    }

    let typeLabel = "";
    if (type === "income") typeLabel = "আয়";
    else if (type === "expense") typeLabel = "ব্যয়";
    else if (type === "transfer") typeLabel = "ট্রান্সফার";

    row.innerHTML = `
      <td>${t.date || ""}</td>
      <td>${typeLabel}</td>
      <td>${displayCategory}</td>
      <td>${walletName}</td>
      <td style="font-weight:bold; color:${type === 'income' ? '#059669' : (type === 'transfer' ? '#3b82f6' : '#dc2626')}">
        ${toBanglaNumberLocal(Number(t.amount) || 0)}
      </td>
      <td>
        <button class="edit_Btn" data-id="${t.id}">পরিবর্তন</button>
        <button class="delete_Btn" data-id="${t.id}">মুছে ফেলো</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Mini Overview Bar
function renderSummary(transactions) {
  const summaryDiv = document.getElementById("summary");
  if (!summaryDiv) return;

  const filtered = (transactions || []).filter(
    t => (currentFilter === "all" || (t.type || "") === currentFilter)
  );

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const totalExpense = filtered.filter((t) => t.type === "expense").reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  summaryDiv.innerHTML = `
    <div class="mini-overview-wrapper">
      <div class="mini-stat-box">
        <div class="mini-stat-icon income">
          <i class="fas fa-arrow-down"></i>
        </div>
        <div class="mini-stat-data">
          <span class="mini-stat-label">মোট আয়</span>
          <span class="mini-stat-value">${toBanglaNumberLocal(totalIncome)} ৳</span>
        </div>
      </div>

      <div class="mini-stat-divider"></div>

      <div class="mini-stat-box">
        <div class="mini-stat-icon expense">
          <i class="fas fa-arrow-up"></i>
        </div>
        <div class="mini-stat-data">
          <span class="mini-stat-label">মোট ব্যয়</span>
          <span class="mini-stat-value">${toBanglaNumberLocal(totalExpense)} ৳</span>
        </div>
      </div>

      <div class="mini-stat-divider"></div>

      <div class="mini-stat-box">
        <div class="mini-stat-icon balance">
          <i class="fas fa-wallet"></i>
        </div>
        <div class="mini-stat-data">
          <span class="mini-stat-label">বর্তমান ব্যালেন্স</span>
          <span class="mini-stat-value">${toBanglaNumberLocal(balance)} ৳</span>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// 🔧 Edit Overlay — Balance Validation সহ
// ============================================
async function showFixedOverlay(id) {
  if (!currentUser) return;

  const db = firebase.firestore();
  const docRef = db.collection("users").doc(currentUser.uid).collection("transactions").doc(id);

  let data;
  try {
    const doc = await docRef.get();
    if (!doc.exists) return alert("ডাটা পাওয়া যায়নি!");
    data = doc.data();
    if (!data) return alert("ডাটা পাওয়া যায়নি!");
  } catch (err) {
    return alert("ডাটা লোডে সমস্যা: " + err.message);
  }

  if (data.category === "ওয়ালেট ট্রান্সফার") {
    return alert("ওয়ালেট ট্রান্সফার এন্ট্রি এখান থেকে সরাসরি এডিট করা যাবে না। ডিলিট করে আবার করুন।");
  }

  const existing = document.querySelector(".edit-overlay-fixed");
  if (existing) existing.remove();

  document.body.style.overflow = "hidden";

  const overlay = document.createElement("div");
  overlay.className = "edit-overlay-fixed";

  overlay.innerHTML = `
    <h3>ট্রানজেকশন এডিট করুন</h3>
    <input type="date" value="${data.date || ''}" class="form-input date-input"/>
    <select class="form-input type-select">
      <option value="income" ${data.type === 'income' ? 'selected' : ''}>আয়</option>
      <option value="expense" ${data.type === 'expense' ? 'selected' : ''}>ব্যয়</option>
    </select>
    <select class="form-input category-select">
      <option value="">ক্যাটেগরি নির্বাচন করুন</option>
    </select>
    <select class="form-input wallet-select">
      <option value="">ওয়ালেট নির্বাচন করুন</option>
    </select>
    <input type="number" value="${Number(data.amount) || 0}" class="form-input amount-input"/>
    <button class="save-btn">সংরক্ষণ করুন</button>
    <button class="cancel-btn">বাতিল</button>
  `;

  document.body.appendChild(overlay);

  const typeSelect = overlay.querySelector(".type-select");
  const categorySelect = overlay.querySelector(".category-select");
  const walletSelect = overlay.querySelector(".wallet-select");

  async function loadCategories(type) {
    try {
      const snapshot = await db.collection("users").doc(currentUser.uid)
        .collection("categories").where("type", "==", type).get();

      categorySelect.innerHTML = `<option value="">ক্যাটেগরি নির্বাচন করুন</option>`;
      snapshot.docs.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.data().name;
        opt.textContent = d.data().name;
        if (d.data().name === data.category) opt.selected = true;
        categorySelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Category load error:", err);
    }
  }

  function loadWalletsDropdown() {
    walletSelect.innerHTML = `<option value="">ওয়ালেট নির্বাচন করুন</option>`;
    allWallets.forEach(w => {
      const opt = document.createElement("option");
      opt.value = w.id;
      opt.textContent = `${w.name} (${toBanglaNumberLocal(Number(w.balance) || 0)} ৳)`;
      if (w.id === data.walletId) opt.selected = true;
      walletSelect.appendChild(opt);
    });
  }

  await loadCategories(data.type || "income");
  loadWalletsDropdown();

  typeSelect.addEventListener("change", () => loadCategories(typeSelect.value));

  const saveBtn = overlay.querySelector(".save-btn");
  const cancelBtn = overlay.querySelector(".cancel-btn");

  function closeOverlay() {
    overlay.remove();
    document.body.style.overflow = "";
  }

  saveBtn.addEventListener("click", async () => {
    const dateInput = overlay.querySelector(".date-input");
    const amountInput = overlay.querySelector(".amount-input");
    const newWalletId = walletSelect.value;
    const newAmount = parseFloat(amountInput.value);

    if (!dateInput.value || !typeSelect.value || !categorySelect.value || isNaN(newAmount) || newAmount <= 0) {
      return alert("সব ফিল্ড পূরণ করুন!");
    }
    if (!newWalletId) {
      return alert("ওয়ালেট নির্বাচন করুন!");
    }

    // 🔧 Balance validation
    const oldAmount = Number(data.amount) || 0;
    const oldType = data.type || 'expense';
    const oldWalletId = data.walletId;

    const newWallet = allWallets.find(w => w.id === newWalletId);
    const currentBalance = Number(newWallet?.balance) || 0;

    // পুরনো wallet থেকে refund হিসাব
    let refund = 0;
    if (oldWalletId === newWalletId) {
      refund = oldType === 'income' ? -oldAmount : oldAmount;
    }

    const effectiveBalance = currentBalance + refund;
    const newDelta = typeSelect.value === 'income' ? newAmount : -newAmount;

    if (newDelta < 0 && effectiveBalance < Math.abs(newDelta)) {
      return alert(`পর্যাপ্ত ব্যালেন্স নেই! "${newWallet?.name}"-এ থাকবে ${effectiveBalance} ৳, প্রয়োজন ${Math.abs(newDelta)} ৳`);
    }

    const batch = db.batch();

    if (oldWalletId) {
      const oldWalletRef = db.collection("users").doc(currentUser.uid).collection("wallets").doc(oldWalletId);
      const oldDelta = oldType === 'income' ? -oldAmount : oldAmount;
      batch.update(oldWalletRef, { balance: firebase.firestore.FieldValue.increment(oldDelta) });
    }

    const newWalletRef = db.collection("users").doc(currentUser.uid).collection("wallets").doc(newWalletId);
    batch.update(newWalletRef, { balance: firebase.firestore.FieldValue.increment(newDelta) });

    batch.update(docRef, {
      date: dateInput.value,
      type: typeSelect.value,
      category: categorySelect.value,
      amount: newAmount,
      walletId: newWalletId,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    try {
      await batch.commit();
      closeOverlay();
    } catch (err) {
      alert("আপডেটে সমস্যা: " + err.message);
    }
  });

  cancelBtn.addEventListener("click", closeOverlay);
}