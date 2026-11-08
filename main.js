// ============================================
// main.js — সম্পূর্ণ সংশোধিত
// ============================================

// Global Variables
let currentUser = null;
let currentManageType = 'income';
let savingsSettingsLoadedFor = null; // 🔧 flag দিয়ে duplicate load প্রতিরোধ

// ============================================
// AUTH CHECK & INITIALIZATION
// ============================================
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;

  // DOM প্রস্তুত হলে dashboard activate
  const initDashboard = () => {
    const dashBtn = document.getElementById('nav-dashboard');
    if (dashBtn && typeof activate === 'function') {
      activate(dashBtn, 'ড্যাশবোর্ড');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard, { once: true });
  } else {
    initDashboard();
  }

  showUserName(user);
  loadSavingsSettings(user.uid);
});

document.addEventListener('DOMContentLoaded', function () {
  // Summary Cards Animation
  const cards = document.querySelectorAll('.summary-card');
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 300 * index);
  });

  // Navigation Menu Listeners
  const navMap = {
    'nav-dashboard': 'ড্যাশবোর্ড',
    'nav-forms': 'ফর্মস',
    'nav-submit': 'ট্রানজেকশন',
    'nav-filter': 'ফিল্টার',
    'nav-settings': 'সেটিংস'
  };
  Object.keys(navMap).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', function () {
        activate(this, navMap[id]);
      });
    }
  });

  // Profile Click
  document.getElementById('user-name')?.addEventListener('click', () => {
    document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
    const content = document.getElementById('content');
    if (content) content.innerHTML = `<h2 class="titel">প্রোফাইল তথ্য</h2><p>লোড হচ্ছে...</p>`;
    if (typeof loadProfileInfo === 'function') loadProfileInfo();
  });
});

// ============================================
// SECTION ACTIVATION
// ============================================
function activate(button, sectionName) {
  document.querySelectorAll('.menu-button').forEach(btn => btn.classList.remove('active'));
  if (button) button.classList.add('active');

  const content = document.getElementById('content');
  if (!content) return;
  content.innerHTML = `<h2 class="titel">${sectionName}</h2><p>লোড হচ্ছে...</p>`;

  switch (sectionName) {
    case 'প্রোফাইল তথ্য':
      if (typeof loadProfileInfo === 'function') loadProfileInfo();
      break;
    case 'ড্যাশবোর্ড':
      if (typeof loadDashboardSummary === 'function') loadDashboardSummary();
      break;
    case 'ফর্মস':
      if (typeof lonefrom === 'function') lonefrom();
      break;
    case 'ফিল্টার':
      if (typeof transactionFilter === 'function') transactionFilter();
      break;
    case 'ট্রানজেকশন':
      if (typeof loadTransactions === 'function') loadTransactions();
      break;
    case 'সেটিংস':
      loadSettingsPage();
      break;
    default:
      content.innerHTML = `<h2 class="titel">${sectionName}</h2><p>এই অংশটি এখনো তৈরি হয়নি।</p>`;
  }
}

// ============================================
// SETTINGS PAGE
// ============================================
function loadSettingsPage() {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <h2 class="titel">সেটিংস</h2>

    <div class="settings-section">
      <h3 class="settings-title"><i class="fas fa-folder-open"></i> ক্যাটাগরি ও ওয়ালেট ম্যানেজ</h3>

      <div class="manage-tabs">
        <button class="manage-tab-btn active" data-tab="category" onclick="switchManageTab('category')">ক্যাটাগরি</button>
        <button class="manage-tab-btn" data-tab="wallet" onclick="switchManageTab('wallet')">ওয়ালেট</button>
      </div>

      <div id="manage-category-area">
        <div class="manage-tabs" style="margin-bottom:10px;">
          <button class="manage-tab-btn active" id="btn-cat-income" onclick="setCategoryType('income')">আয়</button>
          <button class="manage-tab-btn" id="btn-cat-expense" onclick="setCategoryType('expense')">ব্যয়</button>
        </div>

        <input type="text" id="newCategoryInput" class="form-input" placeholder="নতুন ক্যাটাগরির নাম..." />
        <button id="addCategoryBtn" onclick="addNewCategory()">ক্যাটাগরি যোগ করুন</button>
        <button id="delCategoryBtn" onclick="deleteSelectedCategory()">সিলেক্ট করা ক্যাটাগরি ডিলিট করুন</button>

        <select id="categoryList" class="form-input" size="5" style="height:auto; margin-top:10px;"></select>
      </div>

      <div id="manage-wallet-area" style="display:none;">
        <input type="text" id="newWalletInput" class="form-input" placeholder="নতুন ওয়ালেটের নাম..." />
        <button id="addWalletBtn" onclick="addNewWallet()">ওয়ালেট যোগ করুন</button>
        <button id="delWalletBtn" onclick="deleteSelectedWallet()">সিলেক্ট করা ওয়ালেট ডিলিট করুন</button>

        <select id="walletList" class="form-input" size="5" style="height:auto; margin-top:10px;"></select>
      </div>

      <p id="statusMsg"></p>
    </div>
  `;

  loadCategoriesToSelect();
  loadWalletsToSelect();
}

// ম্যানেজ ট্যাব
window.switchManageTab = function (tab) {
  const tabBtns = document.querySelectorAll('.manage-tabs .manage-tab-btn[data-tab]');
  tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));

  const categoryArea = document.getElementById('manage-category-area');
  const walletArea = document.getElementById('manage-wallet-area');

  if (tab === 'category') {
    if (categoryArea) categoryArea.style.display = 'block';
    if (walletArea) walletArea.style.display = 'none';
  } else {
    if (categoryArea) categoryArea.style.display = 'none';
    if (walletArea) walletArea.style.display = 'block';
  }
};

window.setCategoryType = function (type) {
  currentManageType = type;
  const btnIncome = document.getElementById('btn-cat-income');
  const btnExpense = document.getElementById('btn-cat-expense');
  if (btnIncome) btnIncome.classList.toggle('active', type === 'income');
  if (btnExpense) btnExpense.classList.toggle('active', type === 'expense');
  loadCategoriesToSelect();
};

// ============================================
// CATEGORY & WALLET FUNCTIONS
// ============================================
async function loadCategoriesToSelect() {
  const categoryList = document.getElementById('categoryList');
  if (!categoryList) return;
  if (!currentUser) return;

  categoryList.innerHTML = '<option value="">লোড হচ্ছে...</option>';

  try {
    const snapshot = await firebase.firestore()
      .collection("users").doc(currentUser.uid)
      .collection("categories")
      .where("type", "==", currentManageType)
      .get();

    categoryList.innerHTML = '';
    if (snapshot.empty) {
      categoryList.innerHTML = '<option value="">কোনো ক্যাটাগরি নেই</option>';
      return;
    }

    snapshot.docs
      .sort((a, b) => (a.data().name || '').localeCompare(b.data().name || '', 'bn-BD'))
      .forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = doc.data().name || '—';
        categoryList.appendChild(opt);
      });
  } catch (err) {
    console.error("Category load error:", err);
    categoryList.innerHTML = '<option value="">লোড করতে সমস্যা</option>';
  }
}

async function addNewCategory() {
  if (!currentUser) return;
  const input = document.getElementById('newCategoryInput');
  const statusEl = document.getElementById('statusMsg');
  if (!input) return;

  const name = input.value.trim();
  if (!name) return alert('ক্যাটাগরির নাম দিন!');

  try {
    const existing = await firebase.firestore()
      .collection("users").doc(currentUser.uid)
      .collection("categories")
      .where("type", "==", currentManageType)
      .where("name", "==", name)
      .get();

    if (!existing.empty) {
      if (statusEl) {
        statusEl.textContent = '⚠️ এই নামে ইতিমধ্যে ক্যাটাগরি আছে।';
        statusEl.style.color = '#dc2626';
      }
      return;
    }

    await firebase.firestore()
      .collection("users").doc(currentUser.uid)
      .collection("categories")
      .add({
        name: name,
        type: currentManageType,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    input.value = '';
    if (statusEl) {
      statusEl.textContent = '✅ ক্যাটাগরি যোগ হয়েছে।';
      statusEl.style.color = '#059669';
    }
    loadCategoriesToSelect();
  } catch (err) {
    console.error("Add category error:", err);
    alert('ক্যাটাগরি যোগ করতে সমস্যা হয়েছে!');
  }
}

async function deleteSelectedCategory() {
  if (!currentUser) return;
  const select = document.getElementById('categoryList');
  const statusEl = document.getElementById('statusMsg');
  if (!select) return;

  const docId = select.value;
  if (!docId) return alert('ডিলিট করার জন্য ক্যাটাগরি সিলেক্ট করুন!');

  if (!confirm('আপনি কি নিশ্চিতভাবে এই ক্যাটাগরিটি ডিলিট করতে চান?')) return;

  try {
    await firebase.firestore()
      .collection("users").doc(currentUser.uid)
      .collection("categories").doc(docId).delete();

    if (statusEl) {
      statusEl.textContent = '❌ ক্যাটাগরি ডিলিট হয়েছে।';
      statusEl.style.color = '#dc2626';
    }
    loadCategoriesToSelect();
  } catch (err) {
    console.error("Delete category error:", err);
    alert('ডিলিট করতে সমস্যা হয়েছে!');
  }
}

async function loadWalletsToSelect() {
  const walletList = document.getElementById('walletList');
  if (!walletList) return;
  if (!currentUser) return;

  walletList.innerHTML = '<option value="">লোড হচ্ছে...</option>';

  try {
    const snapshot = await firebase.firestore()
      .collection("users").doc(currentUser.uid)
      .collection("wallets")
      .get();

    walletList.innerHTML = '';
    if (snapshot.empty) {
      walletList.innerHTML = '<option value="">কোনো ওয়ালেট নেই</option>';
      return;
    }

    snapshot.docs
      .sort((a, b) => (a.data().name || '').localeCompare(b.data().name || '', 'bn-BD'))
      .forEach(doc => {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = doc.data().name || '—';
        walletList.appendChild(opt);
      });
  } catch (err) {
    console.error("Wallet load error:", err);
    walletList.innerHTML = '<option value="">লোড করতে সমস্যা</option>';
  }
}

async function addNewWallet() {
  if (!currentUser) return;
  const input = document.getElementById('newWalletInput');
  const statusEl = document.getElementById('statusMsg');
  if (!input) return;

  const name = input.value.trim();
  if (!name) return alert('ওয়ালেটের নাম দিন!');

  try {
    const existing = await firebase.firestore()
      .collection("users").doc(currentUser.uid)
      .collection("wallets")
      .where("name", "==", name)
      .get();

    if (!existing.empty) {
      if (statusEl) {
        statusEl.textContent = '⚠️ এই নামে ইতিমধ্যে ওয়ালেট আছে।';
        statusEl.style.color = '#dc2626';
      }
      return;
    }

    await firebase.firestore()
      .collection("users").doc(currentUser.uid)
      .collection("wallets")
      .add({
        name: name,
        balance: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    input.value = '';
    if (statusEl) {
      statusEl.textContent = '✅ ওয়ালেট যোগ হয়েছে।';
      statusEl.style.color = '#059669';
    }
    loadWalletsToSelect();
  } catch (err) {
    console.error("Add wallet error:", err);
    alert('ওয়ালেট যোগ করতে সমস্যা হয়েছে!');
  }
}

async function deleteSelectedWallet() {
  if (!currentUser) return;
  const select = document.getElementById('walletList');
  const statusEl = document.getElementById('statusMsg');
  if (!select) return;

  const docId = select.value;
  if (!docId) return alert('ডিলিট করার জন্য ওয়ালেট সিলেক্ট করুন!');

  if (!confirm('আপনি কি নিশ্চিতভাবে এই ওয়ালেটটি ডিলিট করতে চান?')) return;

  try {
    await firebase.firestore()
      .collection("users").doc(currentUser.uid)
      .collection("wallets").doc(docId).delete();

    if (statusEl) {
      statusEl.textContent = '❌ ওয়ালেট ডিলিট হয়েছে।';
      statusEl.style.color = '#dc2626';
    }
    loadWalletsToSelect();
  } catch (err) {
    console.error("Delete wallet error:", err);
    alert('ডিলিট করতে সমস্যা হয়েছে!');
  }
}

// ============================================
// 🔧 SAVINGS SETTINGS — নিরাপদ সংস্করণ
// ============================================
async function loadSavingsSettings(uid) {
  const toggle = document.getElementById('savings-toggle');
  if (!toggle) return;

  // 🔧 একবারই লোড করুন
  if (savingsSettingsLoadedFor === uid) return;
  savingsSettingsLoadedFor = uid;

  let isSavingsEnabled = true;

  try {
    const userDoc = await firebase.firestore().collection('users').doc(uid).get();
    const data = (userDoc.exists && userDoc.data()) || {};
    isSavingsEnabled = data.savingsEnabled !== undefined ? data.savingsEnabled : true;
  } catch (firestoreErr) {
    console.error('Firestore load error:', {
      code: firestoreErr?.code,
      message: firestoreErr?.message,
      stack: firestoreErr?.stack
    });
    // default true রাখুন
  }

  toggle.checked = isSavingsEnabled;

  // 🔧 updateSavingsUI আলাদা try/catch-এ
  try {
    if (typeof updateSavingsUI === 'function') {
      updateSavingsUI(isSavingsEnabled, uid);
    } else {
      console.warn('updateSavingsUI is not defined — skipping');
    }
  } catch (uiErr) {
    console.error('updateSavingsUI error:', uiErr);
  }

  // 🔧 onchange assignment (single listener)
  toggle.onchange = async (e) => {
    const newStatus = e.target.checked;
    try {
      await firebase.firestore().collection('users').doc(uid).update({
        savingsEnabled: newStatus
      });
      if (typeof updateSavingsUI === 'function') {
        updateSavingsUI(newStatus, uid);
      }
    } catch (err) {
      console.error('Savings toggle update error:', {
        code: err?.code,
        message: err?.message
      });
      toggle.checked = !newStatus;
      alert("সেভিংস সেটিং আপডেটে সমস্যা হয়েছে!");
    }
  };
}

// ============================================
// 🔧 UPDATE SAVINGS UI
// ============================================
function updateSavingsUI(isEnabled, uid) {
  const statusDiv = document.getElementById('today-saving-status');
  const markBtn = document.getElementById('mark-saving-btn');

  if (isEnabled) {
    if (statusDiv) statusDiv.style.display = 'block';
    // 🔧 async call — try/catch
    try {
      if (typeof checkTodaySavingFromTransactions === 'function') {
        checkTodaySavingFromTransactions(uid);
      }
    } catch (e) {
      console.error('checkTodaySavingFromTransactions call error:', e);
    }
  } else {
    if (statusDiv) statusDiv.style.display = 'none';
    if (markBtn) markBtn.style.display = 'none';
  }
}

// ============================================
// 🔧 TODAY SAVING CHECK — Firestore index issue handle
// ============================================
async function checkTodaySavingFromTransactions(uid) {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  const todayFormattedForMsg = `${convertToBanglaNumber(day)}-${convertToBanglaNumber(month)}-${convertToBanglaNumber(year.toString().slice(2))}`;

  try {
    const transactionsRef = firebase.firestore().collection("users").doc(uid).collection("transactions");
    const userRef = firebase.firestore().collection("users").doc(uid);

    // 🔧 দুইটি query আলাদা try/catch-এ (index error handle করতে)
    let totalSnapshot;
    try {
      totalSnapshot = await transactionsRef.where("category", "==", "সঞ্চয়").get();
    } catch (indexErr) {
      // 🔧 Firestore composite index error হলে
      if (indexErr?.code === 'failed-precondition') {
        console.warn(
          '⚠️ Firestore composite index needed. Firebase Console-এ এই index তৈরি করুন:\n' +
          'Collection: transactions (subcollection)\n' +
          'Fields: category (Ascending), date (Ascending)\n' +
          'Error link:', indexErr?.message
        );
      }
      throw indexErr;
    }

    const uniqueDates = new Set();
    let totalSavedAmount = 0;
    let hasToday = false;

    totalSnapshot.forEach(doc => {
      const d = doc.data();
      if (d.date) {
        uniqueDates.add(d.date);
        if (d.date === today) hasToday = true;
      }
      totalSavedAmount += Number(d.amount) || 0;
    });
    const dayCount = uniqueDates.size;

    const statusDiv = document.getElementById('today-saving-status');
    if (!statusDiv) return;

    const userDoc = await userRef.get();
    const userData = (userDoc.exists && userDoc.data()) || {};
    const totalTransferred = Number(userData.totalTransferredSavings) || 0;
    const lastTransferredCount = Number(userData.lastTransferredCount) || 0;

    const currentSavingsBalance = totalSavedAmount - totalTransferred;
    const nextTransferMilestone = (Math.floor(dayCount / 100)) * 100;

    if (dayCount >= 100 && nextTransferMilestone > lastTransferredCount && currentSavingsBalance > 0) {
      statusDiv.className = 'success';
      statusDiv.innerHTML = `
        <div style="text-align:center;">
          <p>🎉 অভিনন্দন! আপনি ${convertToBanglaNumber(dayCount)} দিন সঞ্চয় পূর্ণ করেছেন।</p>
          <p>বর্তমান সঞ্চয় ব্যালেন্স: <strong>${convertToBanglaNumber(currentSavingsBalance)} টাকা</strong></p>
          <button id="transferSavingsBtn" style="margin-top:10px; padding:8px 15px; background:#10b981; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">
            ওয়ালেটে ট্রান্সফার করুন
          </button>
        </div>
      `;

      const transferBtn = document.getElementById('transferSavingsBtn');
      if (transferBtn) {
        transferBtn.addEventListener('click', async () => {
          try {
            await transactionsRef.add({
              type: 'income',
              category: 'সঞ্চয় ট্রান্সফার',
              amount: currentSavingsBalance,
              date: today,
              timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            await userRef.update({
              totalTransferredSavings: totalTransferred + currentSavingsBalance,
              lastTransferredCount: nextTransferMilestone
            });

            alert('সফলভাবে ওয়ালেটে ট্রান্সফার হয়েছে! সেভিংস এখন ০ টাকা।');

            const activeNav = document.querySelector('.menu-button.active');
            if (activeNav && activeNav.id === 'nav-dashboard' && typeof loadDashboardSummary === 'function') {
              loadDashboardSummary();
            }
            checkTodaySavingFromTransactions(uid);
          } catch (err) {
            console.error("Transfer error:", err);
            alert('ট্রান্সফার করতে সমস্যা হয়েছে!');
          }
        }, { once: true });
      }
      return;
    }

    if (hasToday) {
      statusDiv.className = 'success';
      statusDiv.innerHTML = `<div class="scroll-text">✅ আজকের (${todayFormattedForMsg}) সঞ্চয় সম্পন্ন হয়েছে।</div>`;
    } else {
      const todayDayNumber = dayCount + 1;
      const todaySavingAmount = 2 * todayDayNumber - 1;

      statusDiv.className = 'warning';
      statusDiv.innerHTML = `<div class="scroll-text">⚠️ ${todayFormattedForMsg} তারিখে সঞ্চয় জমা হয়নি। আজকের সঞ্চয়: <strong>${convertToBanglaNumber(todaySavingAmount)}</strong> টাকা।</div>`;
    }
  } catch (error) {
    // 🔧 বিস্তারিত error logging
    console.error("সঞ্চয় চেক সমস্যা:", {
      name: error?.name,
      code: error?.code,
      message: error?.message,
      stack: error?.stack
    });
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function convertToBanglaNumber(number) {
  const banglaDigits = '০১২৩৪৫৬৭৮৯';
  if (number === null || number === undefined) return '';
  return String(number).replace(/[0-9]/g, d => banglaDigits[d]);
}

function showUserName(user) {
  const userNameDiv = document.getElementById('user-name');
  if (!userNameDiv) return;

  function setName(name) {
    const finalName = (name && String(name).trim()) ? String(name).trim() : 'অতিথি';
    userNameDiv.innerHTML = `
      <i class="fas fa-user-circle" style="font-size: 2.2rem; color: var(--primary);"></i>
      <div class="profile-name-row">
        <strong>${finalName}</strong>
        <i class="fas fa-sign-in-alt"></i>
      </div>
    `;
  }

  if (user.displayName) {
    setName(user.displayName);
  } else {
    firebase.firestore()
      .collection('users')
      .doc(user.uid)
      .get()
      .then(doc => {
        if (doc.exists && doc.data() && doc.data().name) {
          setName(doc.data().name);
        } else {
          setName('অতিথি');
        }
      })
      .catch(err => {
        console.error("নাম লোড করতে সমস্যা:", err);
        setName('অতিথি');
      });
  }
}