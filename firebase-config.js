// ============================================
// firebase-config.js — সম্পূর্ণ (Offline persistence সহ)
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyAARMOWfVK5HNtoUkSd0rTXHvx_pLUG9pw",
  authDomain: "income-expenses-fe526.firebaseapp.com",
  projectId: "income-expenses-fe526",
  storageBucket: "income-expenses-fe526.firebasestorage.app",
  messagingSenderId: "1095511426817",
  appId: "1:1095511426817:web:117d3f6748ace7dfb0fd00"
};

// 🔧 Duplicate init guard
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// 🔧 Global auth ও db
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// 🔥 Offline Persistence (অফলাইনে data add করার জন্য)
// ============================================
db.enablePersistence({ synchronizeTabs: true })
  .then(() => {
    console.log('✅ Offline persistence enabled — অফলাইনে data add করা যাবে');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open — persistence only in one tab');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Browser does not support offline persistence');
    } else {
      console.warn('⚠️ Persistence error:', err.code, err.message);
    }
  });