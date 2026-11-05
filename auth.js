// ============================================
// auth.js — সম্পূর্ণ (এরর মেসেজ ফিক্স ও নিরাপদ লজিক)
// ============================================

// ফর্ম টগল
function showForm(type) {
  document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
  document.getElementById(type + 'Form')?.classList.add('active');
  document.getElementById('resetSection').style.display = 'none';
}

// রেজিস্টার
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const gender = document.getElementById('regGender').value;
  const dob = document.getElementById('regDob').value;
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const retype = document.getElementById('regRetypePassword').value;
  const msgEl = document.getElementById('registerMessage');

  msgEl.style.color = '#fff';
  msgEl.textContent = 'রেজিস্টার করা হচ্ছে...';

  if (password !== retype) {
    msgEl.style.color = 'red';
    msgEl.textContent = 'পাসওয়ার্ড দুটি মেলেনি।';
    return;
  }

  if (password.length < 6) {
    msgEl.style.color = 'red';
    msgEl.textContent = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // ডেটাবেসে ইউজারের তথ্য সেভ করা
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      name: name, 
      gender: gender, 
      dob: dob, 
      email: email,
      savingsEnabled: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    msgEl.style.color = 'limegreen';
    msgEl.textContent = 'রেজিস্ট্রেশন সফল হয়েছে!';
    setTimeout(() => showForm('login'), 2000);
  } catch (err) {
    msgEl.style.color = 'red';
    
    // 🆕 এরর মেসেজ সুন্দর করা হলো
    if (err.code === 'auth/email-already-in-use') {
      msgEl.textContent = 'এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট আছে।';
    } else if (err.code === 'auth/invalid-email') {
      msgEl.textContent = 'ইমেইলটি সঠিক নয়।';
    } else if (err.code === 'auth/weak-password') {
      msgEl.textContent = 'পাসওয়ার্ডটি খুব দুর্বল।';
    } else {
      msgEl.textContent = 'রেজিস্ট্রেশনে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
    }
  }
});

// লগইন
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msgEl = document.getElementById('loginMessage'); // 🆕 লগইনের জন্য মেসেজ এলিমেন্ট

  // যদি মেসেজ এলিমেন্ট না থাকে, তবে alert ব্যবহার করব
  if (!msgEl) {
    try {
      await auth.signInWithEmailAndPassword(email, password);
      alert('লগইন সফল হয়েছে!');
      window.location.href = 'index.html';
    } catch (err) {
      alert('লগইন ব্যর্থ: ' + err.message);
    }
    return;
  }

  msgEl.style.color = '#fff';
  msgEl.textContent = 'লগইন করা হচ্ছে...';

  try {
    await auth.signInWithEmailAndPassword(email, password);
    msgEl.style.color = 'limegreen';
    msgEl.textContent = 'লগইন সফল হয়েছে!';
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  } catch (err) {
    msgEl.style.color = 'red';
    
    // 🆕 এরর মেসেজ সুন্দর করা হলো (আগে সরাসরি err.message দেখাত)
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msgEl.textContent = 'ইমেইল বা পাসওয়ার্ড ভুল!';
    } else if (err.code === 'auth/too-many-requests') {
      msgEl.textContent = 'অনেকবার ভুল চেষ্টা করেছেন। কিছুক্ষণ পর আবার চেষ্টা করুন।';
    } else {
      msgEl.textContent = 'লগইনে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
    }
  }
});

// রিসেট সেকশন টগল
function toggleResetSection() {
  const section = document.getElementById('resetSection');
  section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

// রিসেট পাসওয়ার্ড
async function resetPassword() {
  const email = document.getElementById('resetEmail').value.trim();
  const dob = document.getElementById('resetDob').value;
  const msgEl = document.getElementById('resetMessage');

  msgEl.style.color = '#fff';
  msgEl.textContent = 'তথ্য যাচাই করা হচ্ছে...';

  try {
    // 🆕 নিরাপত্তার জন্য ডেটাবেসে ইউজার খোঁজা হচ্ছে
    const snapshot = await db.collection('users').where('email', '==', email).get();
    
    if (snapshot.empty) {
      msgEl.style.color = 'red';
      msgEl.textContent = 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।';
      return;
    }

    let matched = false;
    snapshot.forEach(doc => {
      if (doc.data().dob === dob) {
        matched = true;
      }
    });

    if (!matched) {
      msgEl.style.color = 'red';
      msgEl.textContent = 'জন্ম তারিখ মিলছে না।';
      return;
    }

    await auth.sendPasswordResetEmail(email);
    msgEl.style.color = 'limegreen';
    msgEl.textContent = 'রিসেট লিঙ্ক পাঠানো হয়েছে! ইমেইল চেক করুন।';
  } catch (err) {
    msgEl.style.color = 'red';
    
    if (err.code === 'auth/user-not-found') {
      msgEl.textContent = 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট নেই।';
    } else {
      msgEl.textContent = 'সমস্যা হয়েছে: ' + err.message;
    }
  }
}