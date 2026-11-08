// ============================================
// monthday.js — সম্পূর্ণ সংশোধিত
// (টাইপ/ক্যাটাগরি ফিল্টারে Line চার্ট)
// ============================================

// 🔧 global chart instances (leak প্রতিরোধ)
let _monthdayFilterChart = null;
let _monthdayTypeChart = null;
let _monthdaySummaryChart = null;

function transactionFilter() {
  const content = document.getElementById('content');
  if (!content) return;

  // 🔧 আগের chart destroy
  if (_monthdayFilterChart) { try { _monthdayFilterChart.destroy(); } catch(e){} _monthdayFilterChart = null; }
  if (_monthdayTypeChart)   { try { _monthdayTypeChart.destroy(); }   catch(e){} _monthdayTypeChart = null; }
  if (_monthdaySummaryChart){ try { _monthdaySummaryChart.destroy(); }catch(e){} _monthdaySummaryChart = null; }

  content.innerHTML = `
   <h2 class="titel">লেনদেন ফিল্টার</h2>
<div class="tabs">
  <button class="tab-btn active" onclick="showFilterTab(event, 'dateFilterTab')">তারিখ/মাস ফিল্টার</button>
  <button class="tab-btn" onclick="showFilterTab(event, 'typeFilterTab')">টাইপ/ক্যাটাগরি ফিল্টার</button>
</div>

<div id="dateFilterTab" class="tab-content" style="display: block;">
  <div class="Filter-monthday">
    <div class="monthday">
      <h2>মাস ও তারিখ ফিল্টার</h2>
      <div class="filter-row">
        <div class="filter-group">
          <label for="dateFilter">তারিখ নির্বাচন করুন:</label>
          <input type="date" id="dateFilter" />
        </div>
        <div class="filter-group">
          <label for="monthFilter">মাস নির্বাচন করুন:</label>
          <input type="month" id="monthFilter" />
        </div>
        <div class="reset-group">
          <button id="resetFilterBtn">রিসেট</button>
        </div>
      </div>
    </div>

    <div class="monthdaytable" style="width: 100%;">
      <table id="filteredTable" class="transaction-table">
        <thead>
          <tr>
            <th>তারিখ/মাস</th>
            <th>ক্যাটাগরি</th>
            <th>আয় টাকা</th>
            <th>ব্যয় টাকা</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <table id="monthlySummary" class="transaction-table"></table>
    </div>

    <div class="chart-container" style="height: 350px; margin-top: 20px;">
      <canvas id="filterSummaryChart"></canvas>
    </div>
  </div>
</div>

<div id="typeFilterTab" class="tab-content" style="display: none;">
  <div class="Filter-monthday">
    <div class="monthday">
      <h2>টাইপ/ক্যাটাগরি ফিল্টার</h2>
      <label for="typeSelector">টাইপ:</label>
      <select id="typeSelector" class="form-input">
        <option value="">-- নির্বাচন করুন --</option>
        <option value="income">আয়</option>
        <option value="expense">ব্যয়</option>
      </select>
      <label for="categorySelector">ক্যাটাগরি:</label>
      <select id="categorySelector" class="form-input" disabled>
        <option value="">প্রথমে টাইপ নির্বাচন করুন</option>
      </select>
    </div>

    <div class="table-section" style="width: 100%;">
      <table id="typeFilteredTable" class="transaction-table">
        <thead>
          <tr>
            <th>তারিখ</th>
            <th>ক্যাটাগরি</th>
            <th>টাকা</th>
          </tr>
        </thead>
        <tbody id="typeFilteredTbody">
          <tr>
            <td colspan="3" class="message">টাইপ নির্বাচন করুন</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="chart-container" style="height: 350px; margin-top: 20px; background: var(--glass-bg); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid var(--glass-border); border-radius: 14px; padding: 15px;">
      <canvas id="typeCategoryChart"></canvas>
    </div>
  </div>
</div>
`;

  const db = firebase.firestore();

  function formatTaka(amount) {
    const num = Number(amount);
    if (!Number.isFinite(num)) return "৳০";
    return num.toLocaleString("bn-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0
    });
  }

  function formatBanglaPercent(value) {
    const banglaDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    const num = Number(value);
    if (!Number.isFinite(num)) return '০%';
    let str = num.toFixed(1) + '%';
    return str.replace(/\d/g, d => banglaDigits[d]);
  }

  function isTransfer(data) {
    return data.type === "transfer" || data.category === "ওয়ালেট ট্রান্সফার";
  }

  const dateFilter = document.getElementById("dateFilter");
  const monthFilter = document.getElementById("monthFilter");
  const resetBtn = document.getElementById("resetFilterBtn");
  const filteredTable = document.querySelector("#filteredTable tbody");
  const summaryEl = document.getElementById("monthlySummary");

  resetBtn?.addEventListener("click", () => {
    if (dateFilter) dateFilter.value = "";
    if (monthFilter) monthFilter.value = "";
    if (filteredTable) filteredTable.innerHTML = "<tr><td colspan='4' class='message'>ফিল্টার প্রয়োগ করুন</td></tr>";
    if (summaryEl) {
      summaryEl.innerHTML = '';
      summaryEl.style.display = "none";
    }
    if (_monthdayFilterChart) { try { _monthdayFilterChart.destroy(); } catch (e) {} _monthdayFilterChart = null; }
    if (_monthdaySummaryChart) { try { _monthdaySummaryChart.destroy(); } catch (e) {} _monthdaySummaryChart = null; }
  });

  dateFilter?.addEventListener("change", () => {
    if (monthFilter) monthFilter.value = "";
    const date = dateFilter.value;
    const user = firebase.auth().currentUser;
    if (user && date) {
      filterByDate(user.uid, date);
      calculateDailySummary(user.uid, date);
    }
  });

  monthFilter?.addEventListener("change", () => {
    if (dateFilter) dateFilter.value = "";
    const month = monthFilter.value;
    const user = firebase.auth().currentUser;
    if (user && month) {
      filterByMonth(user.uid, month);
      calculateMonthlySummary(user.uid, month);
    }
  });

  initTypeFilter();

  function initTypeFilter() {
    const typeSelector = document.getElementById("typeSelector");
    const categorySelector = document.getElementById("categorySelector");
    if (!typeSelector || !categorySelector) return;

    let unsubscribeCategories = null;

    function loadCategories(type) {
      if (!type) return;
      if (unsubscribeCategories) unsubscribeCategories();

      if (!currentUser) {
        console.warn("লগইন নেই");
        return;
      }

      unsubscribeCategories = db.collection("users").doc(currentUser.uid)
        .collection("categories").where("type", "==", type)
        .onSnapshot(snapshot => {
          categorySelector.innerHTML = '<option value="">-- সব ক্যাটাগরি --</option>';
          categorySelector.disabled = snapshot.empty;

          if (snapshot.empty) return;

          snapshot.docs
            .sort((a, b) => (a.data().name || '').localeCompare(b.data().name || '', "bn-BD"))
            .forEach(doc => {
              const opt = document.createElement("option");
              opt.value = doc.data().name;
              opt.textContent = doc.data().name;
              opt.dataset.docId = doc.id;
              categorySelector.appendChild(opt);
            });
        }, err => console.error("ক্যাটাগরি লোডে সমস্যা:", err.message));
    }

    typeSelector.addEventListener("change", () => {
      const selectedType = typeSelector.value;
      if (selectedType) {
        loadCategories(selectedType);
      } else {
        categorySelector.innerHTML = '<option value="">প্রথমে টাইপ নির্বাচন করুন</option>';
        categorySelector.disabled = true;
      }
      loadFilteredTransactionsAndDrawChart();
    });

    categorySelector.addEventListener("change", loadFilteredTransactionsAndDrawChart);

    categorySelector.innerHTML = '<option value="">প্রথমে টাইপ নির্বাচন করুন</option>';
    categorySelector.disabled = true;
    loadFilteredTransactionsAndDrawChart();
  }

  async function loadFilteredTransactionsAndDrawChart() {
    const typeSelector = document.getElementById("typeSelector");
    const categorySelector = document.getElementById("categorySelector");
    const tbody = document.querySelector("#typeFilteredTable tbody");
    if (!typeSelector || !categorySelector || !tbody) return;

    const selectedType = typeSelector.value;
    const selectedCategory = categorySelector.value;

    tbody.innerHTML = '<tr><td colspan="3" class="message">লোড হচ্ছে...</td></tr>';

    if (!currentUser) {
      tbody.innerHTML = '<tr><td colspan="3" class="error">অনুগ্রহ করে লগইন করুন</td></tr>';
      clearTypeChart();
      return;
    }

    if (!selectedType) {
      tbody.innerHTML = '<tr><td colspan="3" class="message">টাইপ নির্বাচন করুন</td></tr>';
      clearTypeChart();
      return;
    }

    try {
      let query = db.collection("users").doc(currentUser.uid)
        .collection("transactions")
        .where("type", "==", selectedType);

      if (selectedCategory) {
        query = query.where("category", "==", selectedCategory);
      }

      const snapshot = await query.get();
      const transactions = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(tx => !isTransfer(tx))
        .sort((a, b) => {
          const aT = a.timestamp?.seconds || 0;
          const bT = b.timestamp?.seconds || 0;
          if (aT && bT) return bT - aT;
          return String(b.date || '').localeCompare(String(a.date || ''));
        });

      tbody.innerHTML = "";

      if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="message">কোনো লেনদেন পাওয়া যায়নি</td></tr>';
        clearTypeChart();
        return;
      }

      let totalAmount = 0;
      transactions.forEach(tx => {
        totalAmount += Number(tx.amount) || 0;
        const tr = document.createElement("tr");
        tr.classList.add(tx.type === "income" ? "income-row" : "expense-row");
        tr.innerHTML = `
          <td>${tx.date || "N/A"}</td>
          <td>${tx.category || "N/A"}</td>
          <td>${formatTaka(tx.amount)}</td>
        `;
        tbody.appendChild(tr);
      });

      const totalRow = document.createElement("tr");
      totalRow.classList.add("total-row");
      totalRow.innerHTML = `
        <td colspan="2" style="text-align:left;"><strong>মোট টাকা</strong></td>
        <td><strong>${formatTaka(totalAmount)}</strong></td>
      `;
      tbody.appendChild(totalRow);

      // 🔧 Line chart
      drawTypeCategoryLineChart(selectedType, transactions, selectedCategory);

    } catch (error) {
      console.error("Firestore Error:", error);
      tbody.innerHTML = `<tr><td colspan="3" class="error">ডেটা লোডে সমস্যা: ${error.code || error.message}</td></tr>`;
      clearTypeChart();
    }
  }

  // ============================================
  // 🔧 Line Chart — তারিখ অনুযায়ী ক্যাটাগরি প্রবণতা
  // ============================================
  function drawTypeCategoryLineChart(type, transactions, selectedCategory = '') {
    const canvas = document.getElementById("typeCategoryChart");
    if (!canvas) return;

    canvas.style.display = "block";
    const ctx = canvas.getContext("2d");

    if (_monthdayTypeChart) {
      try { _monthdayTypeChart.destroy(); } catch (e) {}
      _monthdayTypeChart = null;
    }

    // 🔧 তারিখ অনুযায়ী ও ক্যাটাগরি অনুযায়ী গ্রুপ
    const dateCategoryMap = {}; // { date: { category1: amt, category2: amt } }
    const categorySet = new Set();

    transactions.forEach(tx => {
      const date = tx.date || "N/A";
      const category = tx.category || "অন্যান্য";
      const amt = Number(tx.amount) || 0;

      if (!dateCategoryMap[date]) dateCategoryMap[date] = {};
      dateCategoryMap[date][category] = (dateCategoryMap[date][category] || 0) + amt;
      categorySet.add(category);
    });

    const sortedDates = Object.keys(dateCategoryMap).sort((a, b) => parseDateSafe(a) - parseDateSafe(b));
    const categories = Array.from(categorySet);

    const hasData = sortedDates.length > 0 && categories.length > 0;

    // 🔧 Color palette (type অনুযায়ী)
    const greenPalette = ['#4caf50', '#22c55e', '#16a34a', '#15803d', '#166534', '#86efac', '#bbf7d0'];
    const redPalette = ['#f44336', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#fca5a5', '#fecaca'];
    const palette = type === "income" ? greenPalette : redPalette;

    // 🔧 Dataset তৈরি (প্রতিটি ক্যাটাগরির জন্য একটি লাইন)
    const datasets = categories.map((cat, i) => {
      const color = palette[i % palette.length];
      const data = sortedDates.map(date => (dateCategoryMap[date][cat] || 0));
      return {
        label: cat,
        data: data,
        borderColor: color,
        backgroundColor: color + '33', // alpha
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: categories.length === 1, // একটি ক্যাটাগরি হলে area fill
        borderWidth: 2.5
      };
    });

    // 🔧 যদি data না থাকে
    const safeLabels = hasData ? sortedDates : ['কোনো ডাটা নেই'];
    const safeDatasets = hasData ? datasets : [{
      label: 'কোনো ডাটা নেই',
      data: [0],
      borderColor: '#9ca3af',
      backgroundColor: 'rgba(156,163,175,0.2)',
      pointRadius: 0
    }];

    _monthdayTypeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: safeLabels,
        datasets: safeDatasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: hasData && categories.length <= 8,
            position: 'bottom',
            labels: {
              color: '#e5e7eb',
              font: { size: 12, weight: 'bold' },
              padding: 12,
              boxWidth: 14,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            enabled: hasData,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e5e7eb',
            borderColor: 'rgba(255,255,255,0.2)',
            borderWidth: 1,
            padding: 12,
            titleFont: { size: 14, weight: 'bold' },
            bodyFont: { size: 13 },
            callbacks: {
              title: (items) => {
                const date = items[0].label;
                return `তারিখ: ${convertToBanglaDate(date)}`;
              },
              label: (context) => {
                const val = Number(context.parsed.y) || 0;
                return `${context.dataset.label}: ${formatTaka(val)}`;
              },
              footer: (items) => {
                const total = items.reduce((sum, it) => sum + (Number(it.parsed.y) || 0), 0);
                return `মোট: ${formatTaka(total)}`;
              }
            }
          },
          title: {
            display: true,
            text: hasData
              ? (type === "income" ? "আয়ের ক্যাটাগরি প্রবণতা (তারিখ অনুযায়ী)" : "ব্যয়ের ক্যাটাগরি প্রবণতা (তারিখ অনুযায়ী)")
              : "কোনো ডাটা নেই",
            font: { size: 16, weight: 'bold' },
            color: "#ffffff",
            padding: { bottom: 15 }
          },
          datalabels: {
            display: false // line chart-এ datalabels বন্ধ
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.08)' },
            ticks: {
              color: '#e5e7eb',
              font: { size: 12 },
              maxRotation: 45,
              minRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: {
              color: '#e5e7eb',
              font: { size: 12 },
              callback: (v) => '৳' + Number(v).toLocaleString('bn-BD')
            }
          }
        }
      }
    });
  }

  // 🔧 তারিখ parse helper
  function parseDateSafe(dateStr) {
    if (!dateStr) return new Date(0);
    const s = String(dateStr).trim();
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d;
    }
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      let day = parseInt(m[1], 10);
      let month = parseInt(m[2], 10);
      let year = parseInt(m[3], 10);
      if (year < 100) year += 2000;
      const d = new Date(year, month - 1, day);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }

  function convertToBanglaDate(dateStr) {
    const bnNums = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    return String(dateStr).replace(/\d/g, d => bnNums[d]);
  }

  function clearTypeChart() {
    if (_monthdayTypeChart) {
      try { _monthdayTypeChart.destroy(); } catch (e) {}
      _monthdayTypeChart = null;
    }
  }

  // ============== Table Filters ==============
  function filterByDate(userId, date) {
    const tbody = document.querySelector("#filteredTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    db.collection("users").doc(userId)
      .collection("transactions")
      .where("date", "==", date)
      .get()
      .then(snapshot => {
        let hasRow = false;
        snapshot.forEach(doc => {
          const data = doc.data();
          if (isTransfer(data)) return;
          hasRow = true;
          const income = data.type === "income" ? formatTaka(data.amount) : "";
          const expense = data.type === "expense" ? formatTaka(data.amount) : "";

          const row = document.createElement("tr");
          if (data.type === "income") row.classList.add("income-row");
          else if (data.type === "expense") row.classList.add("expense-row");
          if (data.category === "লোন গ্রহণ") row.classList.add("loan-taken");
          else if (data.category === "লোন পরিশোধ") row.classList.add("loan-repaid");

          row.innerHTML = `
            <td>${data.date || ""}</td>
            <td>${data.category || ""}</td>
            <td>${income}</td>
            <td>${expense}</td>
          `;
          tbody.appendChild(row);
        });

        if (!hasRow) {
          tbody.innerHTML = "<tr><td colspan='4' class='message'>এই তারিখে কোনো লেনদেন নেই</td></tr>";
        }
      })
      .catch(err => {
        console.error("filterByDate error:", err);
        tbody.innerHTML = `<tr><td colspan='4' class='message'>লোডে সমস্যা: ${err.code || err.message}</td></tr>`;
      });
  }

  function filterByMonth(userId, month) {
    const tbody = document.querySelector("#filteredTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const monthPrefix = month;
    const nextMonth = (() => {
      const [y, m] = month.split("-").map(Number);
      if (!y || !m) return null;
      const next = new Date(y, m, 1);
      const ny = next.getFullYear();
      const nm = String(next.getMonth() + 1).padStart(2, '0');
      return `${ny}-${nm}`;
    })();

    if (!nextMonth) {
      tbody.innerHTML = "<tr><td colspan='4' class='message'>ভুল মাস ফরম্যাট</td></tr>";
      return;
    }

    db.collection("users").doc(userId)
      .collection("transactions")
      .where("date", ">=", monthPrefix + "-01")
      .where("date", "<", nextMonth + "-01")
      .get()
      .then(snapshot => {
        const sorted = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(d => !isTransfer(d))
          .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

        if (sorted.length === 0) {
          tbody.innerHTML = "<tr><td colspan='4' class='message'>এই মাসে কোনো লেনদেন নেই</td></tr>";
          return;
        }

        sorted.forEach(data => {
          const income = data.type === "income" ? formatTaka(data.amount) : "";
          const expense = data.type === "expense" ? formatTaka(data.amount) : "";

          const row = document.createElement("tr");
          if (data.type === "income") row.classList.add("income-row");
          else if (data.type === "expense") row.classList.add("expense-row");
          if (data.category === "লোন গ্রহণ") row.classList.add("loan-taken");
          else if (data.category === "লোন পরিশোধ") row.classList.add("loan-repaid");

          row.innerHTML = `
            <td>${data.date || ""}</td>
            <td>${data.category || ""}</td>
            <td>${income}</td>
            <td>${expense}</td>
          `;
          tbody.appendChild(row);
        });
      })
      .catch(err => {
        console.error("filterByMonth error:", err);
        tbody.innerHTML = `<tr><td colspan='4' class='message'>লোডে সমস্যা: ${err.code || err.message}</td></tr>`;
      });
  }

  // ============== Daily Summary ==============
  function calculateDailySummary(userId, date) {
    const ref = db.collection("users").doc(userId).collection("transactions");

    Promise.all([
      ref.where("date", "<", date).get(),
      ref.where("date", "==", date).get()
    ]).then(([prevSnap, todaySnap]) => {
      let income = 0, expense = 0, prevBalance = 0;

      prevSnap.forEach(doc => {
        const d = doc.data();
        if (isTransfer(d)) return;
        const amt = Number(d.amount) || 0;
        if (d.type === "income") prevBalance += amt;
        else if (d.type === "expense") prevBalance -= amt;
      });

      todaySnap.forEach(doc => {
        const d = doc.data();
        if (isTransfer(d)) return;
        const amt = Number(d.amount) || 0;
        if (d.type === "income") income += amt;
        else if (d.type === "expense") expense += amt;
      });

      const daytotal = income - expense;
      const total = prevBalance + income - expense;
      const dateLabel = (() => {
        try {
          return new Date(date).toLocaleDateString("bn-BD", {
            year: "numeric", month: "short", day: "numeric"
          });
        } catch (e) { return date; }
      })();

      const summaryTable = document.getElementById("monthlySummary");
      if (!summaryTable) return;

      summaryTable.style.display = "table";
      summaryTable.innerHTML = `
        <colgroup>
          <col style="width: 15%">
          <col style="width: 25%">
          <col style="width: 20%">
          <col style="width: 20%">
          <col style="width: 20%">
        </colgroup>
        <thead>
          <tr>
            <th>তারিখ</th>
            <th>বিবরণ</th>
            <th>আয় টাকা</th>
            <th>ব্যয় টাকা</th>
            <th>টাকা</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowspan="4" class="summary-date-cell">${dateLabel}</td>
            <td>শেষ টাকা</td>
            <td class="summary-amount"></td>
            <td class="summary-amount"></td>
            <td class="summary-amount">${formatTaka(prevBalance)}</td>
          </tr>
          <tr>
            <td>আয়</td>
            <td class="summary-amount">${formatTaka(income)}</td>
            <td class="summary-amount"></td>
            <td class="summary-amount"></td>
          </tr>
          <tr>
            <td>ব্যয়</td>
            <td class="summary-amount"></td>
            <td class="summary-amount">${formatTaka(expense)}</td>
            <td class="summary-amount">${formatTaka(daytotal)}</td>
          </tr>
          <tr class="summary-total-row">
            <td colspan="3">মোট</td>
            <td class="summary-amount">${formatTaka(total)}</td>
          </tr>
        </tbody>
      `;
      drawFilterSummaryChart(`${dateLabel} — আয় / ব্যয় / নিট`, income, expense);
    }).catch(err => {
      console.error("calculateDailySummary error:", err);
      const summaryTable = document.getElementById("monthlySummary");
      if (summaryTable) {
        summaryTable.style.display = "table";
        summaryTable.innerHTML = `<tr><td colspan="5" class="message">ডেটা লোডে সমস্যা: ${err.code || err.message}</td></tr>`;
      }
    });
  }

  // ============== Monthly Summary ==============
  function calculateMonthlySummary(userId, month) {
    const [year, mon] = month.split("-").map(Number);
    if (!year || !mon) return;

    const monthPrefix = month;
    const nextMonth = (() => {
      const next = new Date(year, mon, 1);
      const ny = next.getFullYear();
      const nm = String(next.getMonth() + 1).padStart(2, '0');
      return `${ny}-${nm}`;
    })();

    const ref = db.collection("users").doc(userId).collection("transactions");

    Promise.all([
      ref.where("date", "<", monthPrefix + "-01").get(),
      ref.where("date", ">=", monthPrefix + "-01").where("date", "<", nextMonth + "-01").get()
    ]).then(([prevSnap, monthSnap]) => {
      let income = 0, expense = 0, prevBalance = 0;

      prevSnap.forEach(doc => {
        const d = doc.data();
        if (isTransfer(d)) return;
        const amt = Number(d.amount) || 0;
        if (d.type === "income") prevBalance += amt;
        else if (d.type === "expense") prevBalance -= amt;
      });

      monthSnap.forEach(doc => {
        const d = doc.data();
        if (isTransfer(d)) return;
        const amt = Number(d.amount) || 0;
        if (d.type === "income") income += amt;
        else if (d.type === "expense") expense += amt;
      });

      const monthtotal = income - expense;
      const total = prevBalance + income - expense;
      const monthLabel = (() => {
        try {
          return new Date(year, mon - 1, 1).toLocaleString("bn-BD", {
            year: 'numeric', month: 'long'
          });
        } catch (e) { return month; }
      })();

      const summaryTable = document.getElementById("monthlySummary");
      if (!summaryTable) return;

      summaryTable.style.display = "table";
      summaryTable.innerHTML = `
        <colgroup>
          <col style="width: 15%">
          <col style="width: 25%">
          <col style="width: 20%">
          <col style="width: 20%">
          <col style="width: 20%">
        </colgroup>
        <thead>
          <tr>
            <th>মাস</th>
            <th>বিবরণ</th>
            <th>আয় টাকা</th>
            <th>ব্যয় টাকা</th>
            <th>টাকা</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowspan="4" class="summary-date-cell">${monthLabel}</td>
            <td>শেষ টাকা</td>
            <td class="summary-amount"></td>
            <td class="summary-amount"></td>
            <td class="summary-amount">${formatTaka(prevBalance)}</td>
          </tr>
          <tr>
            <td>আয়</td>
            <td class="summary-amount">${formatTaka(income)}</td>
            <td class="summary-amount"></td>
            <td class="summary-amount"></td>
          </tr>
          <tr>
            <td>ব্যয়</td>
            <td class="summary-amount"></td>
            <td class="summary-amount">${formatTaka(expense)}</td>
            <td class="summary-amount">${formatTaka(monthtotal)}</td>
          </tr>
          <tr class="summary-total-row">
            <td colspan="3">মোট</td>
            <td class="summary-amount">${formatTaka(total)}</td>
          </tr>
        </tbody>
      `;
      drawFilterSummaryChart(`${monthLabel} — আয় / ব্যয় / নিট`, income, expense);
    }).catch(err => {
      console.error("calculateMonthlySummary error:", err);
      const summaryTable = document.getElementById("monthlySummary");
      if (summaryTable) {
        summaryTable.style.display = "table";
        summaryTable.innerHTML = `<tr><td colspan="5" class="message">ডেটা লোডে সমস্যা: ${err.code || err.message}</td></tr>`;
      }
    });
  }

  function drawFilterSummaryChart(title, income, expense) {
    const total = income - expense;
    const canvas = document.getElementById("filterSummaryChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (_monthdaySummaryChart) {
      try { _monthdaySummaryChart.destroy(); } catch (e) {}
      _monthdaySummaryChart = null;
    }

    _monthdaySummaryChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["আয়", "ব্যয়", "নিট টাকা"],
        datasets: [{
          label: "পরিমাণ",
          data: [income, expense, total],
          backgroundColor: [
            "#2ecc71",
            "#e74c3c",
            total >= 0 ? "#3498db" : "#f39c12"
          ],
          borderColor: "#fff",
          borderWidth: 2,
          borderRadius: 8,
          maxBarThickness: 80
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: "easeOutQuart" },
        layout: { padding: { top: 20 } },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: "bold" },
            color: "#374151",
            padding: { bottom: 15 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = Number(ctx.raw) || 0;
                const sign = v < 0 ? "−" : "";
                return `${ctx.label}: ${sign}৳${Math.abs(v).toLocaleString("bn-BD")}`;
              }
            }
          },
          datalabels: {
            color: "#111827",
            font: { weight: "bold", size: 12 },
            anchor: (ctx) => ctx.dataset.data[ctx.datasetIndex] < 0 ? "start" : "end",
            align: (ctx) => ctx.dataset.data[ctx.datasetIndex] < 0 ? "bottom" : "top",
            offset: 6,
            formatter: (value) => {
              const v = Number(value) || 0;
              const sign = v < 0 ? "−" : "";
              return sign + "৳" + Math.abs(v).toLocaleString("bn-BD");
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.06)" },
            ticks: {
              color: "#4b5563",
              callback: (v) => {
                const n = Number(v) || 0;
                const sign = n < 0 ? "−" : "";
                return sign + "৳" + Math.abs(n).toLocaleString("bn-BD");
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: "#374151",
              font: { weight: "bold", size: 13 }
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }
}

// 🔧 Local showTab — global override প্রতিরোধ
function showFilterTab(event, tabId) {
  document.querySelectorAll("#dateFilterTab, #typeFilterTab").forEach(t => t.style.display = 'none');
  document.querySelectorAll("#content .tab-btn").forEach(b => b.classList.remove('active'));
  const target = document.getElementById(tabId);
  if (target) target.style.display = 'block';
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
}