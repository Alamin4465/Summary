function lonefrom() {
  firebase.auth().onAuthStateChanged(user => {
    if (!user) return;
    const currentUser = user;

    const content = document.getElementById('content');
    content.innerHTML = `
      <h2 class="titel">ফর্ম সেকশন</h2>
      <div class="tabs">
        <button class="tab-btn active" onclick="showTab(event, 'fromsaction')">লেনদেন ফর্ম</button>
        <button class="tab-btn" onclick="showTab(event, 'Lonesaction')">লোন ফর্ম</button>
        <button class="tab-btn" onclick="showTab(event, 'transferTab')">ওয়ালেট ট্রান্সফার</button>
      </div>

      <!-- লেনদেন ফর্ম -->
      <div id="fromsaction" class="tab-content active" style="display:block;">
        <div class="transaction-container">
          <form id="transactionForm" class="form-column">
            <input class="form-input" type="date" id="date" required>
            <select class="form-input" id="transType" required>
              <option value="">টাইপ নির্বাচন করুন</option>
              <option value="income">আয়</option>
              <option value="expense">ব্যয়</option>
            </select>
            <select class="form-input" id="category" required>
              <option value="">ক্যাটেগরি নির্বাচন করুন</option>
            </select>
            <select class="form-input" id="walletSelect">
              <option value="">ওয়ালেট নির্বাচন করুন</option>
            </select>
            <input class="form-input" type="number" id="amount" placeholder="টাকার পরিমাণ" required>
            <button type="submit" class="form-button">সংরক্ষণ করুন</button>
          </form>
        </div>

        <div id="statusMsg"></div>
        <div id="recent-transactions"></div>
      </div>

      <!-- লোন সেকশন -->
      <div id="Lonesaction" class="tab-content" style="display: none;">
        <h2 class="titel">লোন গৃহীত ও পরিশোধ</h2>
        <form id="loanForm" class="form-column">
          <input class="form-input" type="date" id="loanDate" required>
          <select class="form-input" id="loanType" required>
            <option value="">ধরণ নির্বাচন করুন</option>
            <option value="loan">লোন গ্রহণ</option>
            <option value="repayment">লোন পরিশোধ</option>
          </select>
          <div id="loanNameContainer"></div>
          <select class="form-input" id="loanWalletSelect" required>
            <option value="">ওয়ালেট নির্বাচন করুন</option>
          </select>
          <input class="form-input" type="number" id="loanAmount" placeholder="উদাহরণ: 5000" required>
          <button class="form-button" type="submit" style="background:#f59e0b;">এন্ট্রি যুক্ত করুন</button>
        </form>

        <div id="loanStatusMsg" style="text-align:center; font-weight:600; min-height:20px; margin-top:10px;"></div>

        <div style="overflow-x:auto;">
          <table id="loanTable" class="transaction-table" style="margin-top:15px; width: 100%;">
            <thead>
              <tr><th>তারিখ</th><th>নাম</th><th>ধরণ</th><th>ওয়ালেট</th><th>টাকা</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>

        <div id="loanSummary" class="loan-summary"></div>

        <div style="max-width: 350px; margin: 20px auto;">
          <canvas id="loanChart" width="400" height="200"></canvas>
        </div>
      </div>

      <!-- ওয়ালেট ট্রান্সফার সেকশন -->
      <div id="transferTab" class="tab-content" style="display: none;">
        <h2 class="titel">ওয়ালেট টু ওয়ালেট ট্রান্সফার</h2>

        <form id="transferForm" class="form-column">
          <input class="form-input" type="date" id="transferDate" required>

          <select class="form-input" id="fromWalletSelect" required>
            <option value="">যে ওয়ালেট থেকে পাঠাবেন</option>
          </select>

          <select class="form-input" id="toWalletSelect" required>
            <option value="">যে ওয়ালেটে জমা হবে</option>
          </select>

          <input class="form-input" type="number" id="transferAmount"
                 placeholder="টাকার পরিমাণ" min="1" step="0.01" required>

          <button type="submit" class="form-button" style="background:#8b5cf6;">
            ট্রান্সফার করুন
          </button>
        </form>

        <div id="transferStatusMsg" style="text-align:center; font-weight:600; min-height:20px; margin-top:10px;"></div>

        <div style="overflow-x:auto; margin-top:15px;">
          <table id="transferTable" class="transaction-table">
            <thead>
              <tr>
                <th>তারিখ</th>
                <th>থেকে</th>
                <th>প্রতি</th>
                <th>টাকা</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;

    const db = firebase.firestore();
    const typeSelect = document.getElementById("transType");
    const categorySelect = document.getElementById("category");
    const walletSelect = document.getElementById("walletSelect");
    const statusMsg = document.getElementById("statusMsg");
    const loanStatusMsg = document.getElementById("loanStatusMsg");
    const loanWalletSelect = document.getElementById("loanWalletSelect");

    // Transfer elements
    const transferDate       = document.getElementById("transferDate");
    const fromWalletSelect   = document.getElementById("fromWalletSelect");
    const toWalletSelect     = document.getElementById("toWalletSelect");
    const transferAmount     = document.getElementById("transferAmount");
    const transferStatusMsg  = document.getElementById("transferStatusMsg");

    let unsubscribeCategories = null;
    let unsubscribeWallets = null;
    let allWallets = [];
    let lastTransactionsSnapshot = null;
    let lastLoanSnapshot = null;
    let lastTransferSnapshot = null;

    function setStatus(msg, isError = false) {
      if (!statusMsg) return;
      statusMsg.textContent = msg;
      statusMsg.style.color = isError ? "red" : "green";
      setTimeout(() => { if (statusMsg) statusMsg.textContent = ""; }, 3000);
    }

    function setLoanStatus(msg, isError = false) {
      if (!loanStatusMsg) return;
      loanStatusMsg.textContent = msg;
      loanStatusMsg.style.color = isError ? "red" : "green";
      setTimeout(() => { if (loanStatusMsg) loanStatusMsg.textContent = ""; }, 3000);
    }

    function setTransferStatus(msg, isError = false) {
      if (!transferStatusMsg) return;
      transferStatusMsg.textContent = msg;
      transferStatusMsg.style.color = isError ? "red" : "green";
      setTimeout(() => { if (transferStatusMsg) transferStatusMsg.textContent = ""; }, 3000);
    }

    window.showTab = function (event, tabId) {
      document.querySelectorAll(".tab-content").forEach(t => t.style.display = "none");
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      const target = document.getElementById(tabId);
      if (target) target.style.display = "block";
      if (event && event.currentTarget) event.currentTarget.classList.add("active");
    };

    // ------------------ Bangla formatting ------------------
    function formatBanglaNumber(number) {
      const engToBn = { 0: '০', 1: '১', 2: '২', 3: '৩', 4: '৪', 5: '৫', 6: '৬', 7: '৭', 8: '৮', 9: '৯' };
      return String(number).replace(/[0-9]/g, d => engToBn[d]);
    }

    function formatDateToBangla(dateStr) {
      if (!dateStr) return "";
      const monthsBn = ["জানুয়ারী", "ফেব্রুয়ারী", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
      const parts = String(dateStr).split("-");
      if (parts.length !== 3) return dateStr;
      const year = formatBanglaNumber(parts[0]);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = formatBanglaNumber(parts[2]);
      if (monthIdx < 0 || monthIdx > 11 || isNaN(monthIdx)) return dateStr;
      return `${day} ${monthsBn[monthIdx]} ${year}`;
    }

    // ------------------ Categories ------------------
    function loadCategories(type) {
      if (!type) return;
      if (unsubscribeCategories) unsubscribeCategories();
      unsubscribeCategories = db.collection("users").doc(currentUser.uid)
        .collection("categories").where("type", "==", type)
        .onSnapshot(snapshot => {
          categorySelect.innerHTML = '<option value="">ক্যাটেগরি নির্বাচন করুন</option>';
          if (snapshot.empty) {
            categorySelect.innerHTML = '<option value="">কোনো ক্যাটেগরি নেই (সেটিংস থেকে যোগ করুন)</option>';
            return;
          }
          snapshot.docs
            .sort((a, b) => (a.data().name || '').localeCompare(b.data().name || '', 'bn-BD'))
            .forEach(doc => {
              const opt = document.createElement("option");
              opt.value = doc.data().name;
              opt.textContent = doc.data().name;
              opt.dataset.docId = doc.id;
              categorySelect.appendChild(opt);
            });
        }, err => console.error("ক্যাটেগরি লোডে সমস্যা: " + err.message));
    }

    typeSelect.addEventListener("change", () => loadCategories(typeSelect.value));

    // ------------------ Wallets (Real-time) ------------------
    function loadWallets() {
      if (unsubscribeWallets) unsubscribeWallets();
      unsubscribeWallets = db.collection("users").doc(currentUser.uid)
        .collection("wallets")
        .onSnapshot(snapshot => {
          const prevWalletSel     = walletSelect.value;
          const prevLoanWalletSel = loanWalletSelect.value;
          const prevFromWalletSel = fromWalletSelect ? fromWalletSelect.value : "";
          const prevToWalletSel   = toWalletSelect ? toWalletSelect.value : "";
          allWallets = [];

          walletSelect.innerHTML     = '<option value="">ওয়ালেট নির্বাচন করুন</option>';
          loanWalletSelect.innerHTML = '<option value="">ওয়ালেট নির্বাচন করুন</option>';
          if (fromWalletSelect) fromWalletSelect.innerHTML = '<option value="">যে ওয়ালেট থেকে পাঠাবেন</option>';
          if (toWalletSelect)   toWalletSelect.innerHTML   = '<option value="">যে ওয়ালেটে জমা হবে</option>';

          snapshot.docs
            .sort((a, b) => (a.data().name || '').localeCompare(b.data().name || '', 'bn-BD'))
            .forEach(doc => {
              const data = doc.data();
              allWallets.push({ id: doc.id, ...data });

              const label = `${data.name} (${formatBanglaNumber(data.balance || 0)} ৳)`;

              // normal wallet select
              const opt = document.createElement("option");
              opt.value = doc.id;
              opt.textContent = label;
              walletSelect.appendChild(opt);

              // loan wallet select
              const opt3 = document.createElement("option");
              opt3.value = doc.id;
              opt3.textContent = label;
              loanWalletSelect.appendChild(opt3);

              // transfer selects
              if (fromWalletSelect) {
                const optFrom = document.createElement("option");
                optFrom.value = doc.id;
                optFrom.textContent = label;
                fromWalletSelect.appendChild(optFrom);
              }
              if (toWalletSelect) {
                const optTo = document.createElement("option");
                optTo.value = doc.id;
                optTo.textContent = label;
                toWalletSelect.appendChild(optTo);
              }
            });

          // restore selection
          if (prevWalletSel && [...walletSelect.options].some(o => o.value === prevWalletSel))
            walletSelect.value = prevWalletSel;
          if (prevLoanWalletSel && [...loanWalletSelect.options].some(o => o.value === prevLoanWalletSel))
            loanWalletSelect.value = prevLoanWalletSel;
          if (prevFromWalletSel && fromWalletSelect && [...fromWalletSelect.options].some(o => o.value === prevFromWalletSel))
            fromWalletSelect.value = prevFromWalletSel;
          if (prevToWalletSel && toWalletSelect && [...toWalletSelect.options].some(o => o.value === prevToWalletSel))
            toWalletSelect.value = prevToWalletSel;

          renderTransactionsTable();
          renderLoans();
          renderTransfers();
        }, err => console.error("ওয়ালেট লোডে সমস্যা: " + err.message));
    }

    // ------------------ Transactions ------------------
    document.getElementById("transactionForm").addEventListener("submit", e => {
      e.preventDefault();
      const date = document.getElementById("date").value;
      const type = typeSelect.value;
      const category = categorySelect.value;
      const amount = parseFloat(document.getElementById("amount").value);
      const walletId = walletSelect.value;

      if (!date || !type || !category || isNaN(amount) || amount <= 0)
        return alert("সব ফিল্ড পূরণ করুন");
      if (!walletId)
        return alert("ওয়ালেট নির্বাচন করুন!");

      const batch = db.batch();

      const transRef = db.collection("users").doc(currentUser.uid)
        .collection("transactions").doc();
      batch.set(transRef, {
        date, type, category, amount, walletId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      const walletRef = db.collection("users").doc(currentUser.uid)
        .collection("wallets").doc(walletId);
      const delta = type === 'income' ? amount : -amount;
      batch.update(walletRef, { balance: firebase.firestore.FieldValue.increment(delta) });

      batch.commit()
        .then(() => {
          e.target.reset();
          setStatus("লেনদেন সংরক্ষিত হয়েছে ও ওয়ালেট ব্যালেন্স আপডেট হয়েছে");
        })
        .catch(err => alert("লেনদেন সেভে সমস্যা: " + err.message));
    });

    function loadRecentTransactions(uid) {
      db.collection("users").doc(uid).collection("transactions")
        .orderBy("timestamp", "desc").limit(10)
        .onSnapshot(snapshot => {
          lastTransactionsSnapshot = snapshot;
          renderTransactionsTable();
        }, err => console.error("Recent transactions load error:", err));
    }

    function renderTransactionsTable() {
      if (!lastTransactionsSnapshot) return;
      const container = document.getElementById("recent-transactions");
      if (!container) return;

      let html = `<table class="transaction-table"><thead><tr><th>তারিখ</th><th>টাইপ</th><th>ক্যাটেগরি</th><th>ওয়ালেট</th><th>পরিমাণ</th></tr></thead><tbody>`;
      lastTransactionsSnapshot.forEach(doc => {
        const d = doc.data();
        if (!["income", "expense"].includes(d.type)) return;
        const rowClass = d.type === "income" ? "income-row" : "expense-row";
        const typeLabel = d.type === "income" ? "আয়" : "ব্যয়";
        let walletName = '—';
        if (d.walletId) {
          const w = allWallets.find(x => x.id === d.walletId);
          if (w) walletName = w.name;
        }
        html += `<tr class="${rowClass}"><td>${formatDateToBangla(d.date)}</td><td>${typeLabel}</td><td>${d.category}</td><td>${walletName}</td><td>${formatBanglaNumber(d.amount)} ৳</td></tr>`;
      });
      html += "</tbody></table>";
      container.innerHTML = html;
    }

    // ------------------ Loan Section ------------------
    function renderLoanSection() {
      const container = document.getElementById('loanNameContainer');
      const typeSelectLoan = document.getElementById('loanType');
      const dateInput = document.getElementById('loanDate');
      const amountInput = document.getElementById('loanAmount');
      let nameInput = null;
      let nameSelect = null;

      function createNameInput() {
        container.innerHTML = '';
        nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'form-input';
        nameInput.id = 'loanName';
        nameInput.placeholder = 'নাম লিখুন';
        container.appendChild(nameInput);
        nameSelect = null;
      }

      function createNameSelect(options = []) {
        container.innerHTML = '';
        nameSelect = document.createElement('select');
        nameSelect.className = 'form-input';
        nameSelect.id = 'loanName';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'নাম নির্বাচন করুন';
        nameSelect.appendChild(defaultOption);

        if (options.length === 0) {
          const opt = document.createElement('option');
          opt.value = '';
          opt.textContent = 'অপর্যাপ্ত লোন অবশিষ্ট নেই';
          nameSelect.appendChild(opt);
          nameSelect.disabled = true;
        } else {
          options.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            nameSelect.appendChild(opt);
          });
          nameSelect.disabled = false;
        }
        container.appendChild(nameSelect);
        nameInput = null;
      }

      function clearNameContainer() {
        container.innerHTML = '';
        nameInput = null;
        nameSelect = null;
      }

      async function updateLoanNames() {
        const val = typeSelectLoan.value;
        if (val === 'loan') {
          createNameInput();
        } else if (val === 'repayment') {
          try {
            const loanSnap = await db.collection("users").doc(currentUser.uid)
              .collection("transactions").where("category", "==", "লোন গ্রহণ").get();
            const repaymentSnap = await db.collection("users").doc(currentUser.uid)
              .collection("transactions").where("category", "==", "লোন পরিশোধ").get();

            const loanBalance = {};
            loanSnap.forEach(doc => {
              const d = doc.data();
              if (!d.name) return;
              loanBalance[d.name] = (loanBalance[d.name] || 0) + (Number(d.amount) || 0);
            });
            repaymentSnap.forEach(doc => {
              const d = doc.data();
              if (!d.name) return;
              if (loanBalance[d.name]) loanBalance[d.name] -= (Number(d.amount) || 0);
            });

            const remainingNames = Object.keys(loanBalance).filter(n => loanBalance[n] > 0);
            createNameSelect(remainingNames);
          } catch (err) {
            console.error("Loan names load error:", err);
            clearNameContainer();
          }
        } else {
          clearNameContainer();
        }
      }

      typeSelectLoan.addEventListener('change', updateLoanNames);

      document.getElementById('loanForm').addEventListener('submit', async e => {
        e.preventDefault();

        const loanType = typeSelectLoan.value;

        let name = '';
        if (loanType === 'loan') {
          if (!nameInput) {
            return alert("লোন গ্রহণ টাইপ নির্বাচন করুন!");
          }
          name = nameInput.value.trim();
        } else if (loanType === 'repayment') {
          if (!nameSelect || nameSelect.disabled) {
            return alert("লোন পরিশোধ টাইপ নির্বাচন করুন এবং নাম সিলেক্ট করুন!");
          }
          name = nameSelect.value;
        } else {
          return alert("লোনের ধরণ নির্বাচন করুন!");
        }

        const amount = parseFloat(amountInput.value);
        const date = dateInput.value;
        const walletId = loanWalletSelect.value;

        if (!name || isNaN(amount) || amount <= 0 || !date) {
          return alert("সব ফিল্ড পূরণ করুন");
        }
        if (!walletId) {
          return alert("কোন ওয়ালেটে লোন নিচ্ছেন/পরিশোধ করছেন সেটি নির্বাচন করুন!");
        }

        const entryType = (loanType === 'loan') ? 'income' : 'expense';
        const category = (loanType === 'loan') ? 'লোন গ্রহণ' : 'লোন পরিশোধ';

        const batch = db.batch();

        const transRef = db.collection("users").doc(currentUser.uid)
          .collection("transactions").doc();
        batch.set(transRef, {
          name, type: entryType, category, amount, date, walletId,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        const walletRef = db.collection("users").doc(currentUser.uid)
          .collection("wallets").doc(walletId);
        const delta = (loanType === 'loan') ? amount : -amount;
        batch.update(walletRef, { balance: firebase.firestore.FieldValue.increment(delta) });

        try {
          await batch.commit();
          dateInput.value = '';
          amountInput.value = '';
          setLoanStatus("লোন এন্ট্রি সংরক্ষিত হয়েছে ✅");
          await updateLoanNames();
        } catch (err) {
          setLoanStatus("লোন এন্ট্রি সেভে সমস্যা: " + err.message, true);
        }
      });

      updateLoanNames();
      loadLoansRealtime(currentUser.uid);
    }

    let loanChartInstance = null;
    function loadLoansRealtime(uid) {
      db.collection("users").doc(uid).collection("transactions")
        .orderBy("timestamp", "desc").onSnapshot(snapshot => {
          lastLoanSnapshot = snapshot;
          renderLoans();
        }, err => console.error("Loan realtime error:", err));
    }

    function renderLoans() {
      if (!lastLoanSnapshot) return;
      const tbody = document.querySelector("#loanTable tbody");
      if (!tbody) return;
      tbody.innerHTML = '';

      let summaryByPerson = {}, totalLoan = 0, totalRepayment = 0;

      lastLoanSnapshot.forEach(doc => {
        const d = doc.data();
        if (!["লোন গ্রহণ", "লোন পরিশোধ"].includes(d.category)) return;
        if (!d.name) return;

        const tr = document.createElement('tr');
        const displayDate = d.date ? formatDateToBangla(d.date) : '—';

        if (d.category === 'লোন গ্রহণ') {
          tr.classList.add('loan-taken');
          totalLoan += Number(d.amount) || 0;
          summaryByPerson[d.name] = summaryByPerson[d.name] || { taken: 0, repaid: 0 };
          summaryByPerson[d.name].taken += Number(d.amount) || 0;
        } else {
          tr.classList.add('loan-repaid');
          totalRepayment += Number(d.amount) || 0;
          summaryByPerson[d.name] = summaryByPerson[d.name] || { taken: 0, repaid: 0 };
          summaryByPerson[d.name].repaid += Number(d.amount) || 0;
        }

        let walletName = '—';
        if (d.walletId) {
          const w = allWallets.find(x => x.id === d.walletId);
          if (w) walletName = w.name;
        }

        tr.innerHTML = `<td>${displayDate}</td><td>${d.name}</td><td>${d.category}</td><td>${walletName}</td><td>${formatBanglaNumber(d.amount || 0)} টাকা</td>`;
        tbody.appendChild(tr);
      });

      // Summary
      const summaryDiv = document.getElementById("loanSummary");
      if (summaryDiv) {
        let html = `<h3>📊 লোন সারসংক্ষেপ</h3><table class="transaction-table" style="width:100%; border-collapse: collapse;"><thead><tr class="loan-repaid"><th>নাম</th><th>লোন গ্রহণ</th><th>পরিশোধ</th><th>অবশিষ্ট</th></tr></thead><tbody>`;
        const names = Object.keys(summaryByPerson);
        if (names.length === 0) {
          html += `<tr><td colspan="4" style="text-align:center;">কোনো লোন ডাটা নেই</td></tr>`;
        } else {
          names.forEach(name => {
            const taken = summaryByPerson[name].taken || 0;
            const repaid = summaryByPerson[name].repaid || 0;
            const remain = taken - repaid;
            html += `<tr><td>${name}</td><td>${formatBanglaNumber(taken)} টাকা</td><td>${formatBanglaNumber(repaid)} টাকা</td><td>${formatBanglaNumber(remain)} টাকা</td></tr>`;
          });
        }
        html += '</tbody></table>';
        summaryDiv.innerHTML = html;
      }

      // Chart
      const canvas = document.getElementById('loanChart');
      if (!canvas) return;

      const remaining = totalLoan - totalRepayment;
      const hasData = (totalLoan + totalRepayment + Math.max(remaining, 0)) > 0;

      const ctx = canvas.getContext('2d');
      if (loanChartInstance) {
        try { loanChartInstance.destroy(); } catch (e) {}
        loanChartInstance = null;
      }

      loanChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: hasData ? ['লোন গ্রহণ', 'পরিশোধ', 'বাকি'] : ['কোনো ডাটা নেই'],
          datasets: [{
            data: hasData ? [totalLoan, totalRepayment, Math.max(remaining, 0)] : [1],
            backgroundColor: hasData
              ? ['#4caf50', '#f44336', '#2196f3']
              : ['#9ca3af'],
            hoverOffset: hasData ? 10 : 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: {
              display: true,
              text: hasData ? 'লোন গ্রহণ বনাম পরিশোধ (৳)' : 'কোনো লোন ডাটা নেই',
              font: { size: 18 }
            },
            tooltip: {
              enabled: hasData,
              callbacks: {
                label: function (ctx) {
                  return `${ctx.label}: ${formatBanglaNumber(ctx.parsed)} টাকা`;
                }
              }
            },
            legend: {
              display: hasData
            }
          }
        }
      });
    }

    // ------------------ Wallet Transfer Section ------------------
    function loadTransfersRealtime(uid) {
      db.collection("users").doc(uid).collection("transactions")
        .where("category", "==", "ওয়ালেট ট্রান্সফার")
        .orderBy("timestamp", "desc")
        .onSnapshot(snapshot => {
          lastTransferSnapshot = snapshot;
          renderTransfers();
        }, err => console.error("Transfer realtime error:", err));
    }

    function renderTransfers() {
      const tbody = document.querySelector("#transferTable tbody");
      if (!tbody) return;
      tbody.innerHTML = "";

      if (!lastTransferSnapshot || lastTransferSnapshot.empty) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#6b7280;">কোনো ট্রান্সফার নেই</td></tr>`;
        return;
      }

      lastTransferSnapshot.forEach(doc => {
        const d = doc.data();
        if (d.category !== "ওয়ালেট ট্রান্সফার") return;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${formatDateToBangla(d.date)}</td>
          <td>${d.fromWalletName || '—'}</td>
          <td>${d.toWalletName || '—'}</td>
          <td>${formatBanglaNumber(Number(d.amount) || 0)} ৳</td>
        `;
        tbody.appendChild(tr);
      });
    }

    document.getElementById("transferForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const date      = transferDate.value;
      const fromId    = fromWalletSelect.value;
      const toId      = toWalletSelect.value;
      const amount    = parseFloat(transferAmount.value);

      if (!date || !fromId || !toId || isNaN(amount) || amount <= 0) {
        return alert("সব ফিল্ড পূরণ করুন এবং সঠিক পরিমাণ দিন।");
      }
      if (fromId === toId) {
        return alert("একই ওয়ালেটে ট্রান্সফার করা যাবে না!");
      }

      const fromWallet = allWallets.find(w => w.id === fromId);
      const toWallet   = allWallets.find(w => w.id === toId);

      if (!fromWallet || !toWallet) {
        return alert("ওয়ালেট পাওয়া যায়নি!");
      }

      const fromBalance = Number(fromWallet.balance) || 0;
      if (fromBalance < amount) {
        return alert(`পর্যাপ্ত ব্যালেন্স নেই! "${fromWallet.name}"-এ আছে ${formatBanglaNumber(fromBalance)} ৳`);
      }

      const batch = db.batch();

      const transRef = db.collection("users").doc(currentUser.uid)
        .collection("transactions").doc();

      batch.set(transRef, {
        date,
        type: "transfer",
        category: "ওয়ালেট ট্রান্সফার",
        fromWalletId: fromId,
        toWalletId: toId,
        fromWalletName: fromWallet.name,
        toWalletName: toWallet.name,
        amount,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      const fromRef = db.collection("users").doc(currentUser.uid)
        .collection("wallets").doc(fromId);
      batch.update(fromRef, {
        balance: firebase.firestore.FieldValue.increment(-amount)
      });

      const toRef = db.collection("users").doc(currentUser.uid)
        .collection("wallets").doc(toId);
      batch.update(toRef, {
        balance: firebase.firestore.FieldValue.increment(amount)
      });

      try {
        await batch.commit();
        e.target.reset();
        setTransferStatus("✅ ট্রান্সফার সফল হয়েছে!");
      } catch (err) {
        setTransferStatus("ট্রান্সফারে সমস্যা: " + err.message, true);
      }
    });

    // ------------------ Initial Load ------------------
    typeSelect.value = 'income';
    loadCategories('income');
    loadWallets();
    loadRecentTransactions(currentUser.uid);
    renderLoanSection();
    loadTransfersRealtime(currentUser.uid);  // 🆕 transfer listener চালু
  });
}