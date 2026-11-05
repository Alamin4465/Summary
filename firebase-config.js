const firebaseConfig = {
  apiKey: "AIzaSyAARMOWfVK5HNtoUkSd0rTXHvx_pLUG9pw",
  authDomain: "income-expenses-fe526.firebaseapp.com",
  projectId: "income-expenses-fe526",
  storageBucket: "income-expenses-fe526.firebasestorage.app",
  messagingSenderId: "1095511426817",
  appId: "1:1095511426817:web:117d3f6748ace7dfb0fd00"
};

// ১. প্রথমে ফায়ারবেস ইনিশিয়ালাইজ হবে
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ২. এরপর অফলাইন পারসিস্টেন্স চালু হবে
firebase.firestore().enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('একাধিক ট্যাব খোলা থাকলে অফলাইন মোড কাজ করে না।');
    } else if (err.code == 'unimplemented') {
      console.warn('আপনার ব্রাউজারটি অফলাইন মোড সাপোর্ট করে না।');
    }
  });