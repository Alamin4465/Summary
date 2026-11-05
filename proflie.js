// ============================================
// Profile Section Styles
// ============================================
const profileStyle = document.createElement('style');
profileStyle.textContent = `
.change-password-section { margin-top: 30px; text-align: center; }
.change-password-section input { padding: 8px 12px; border-radius: 6px; border: 1px solid #ccc; margin: 10px 0; font-size: 16px; width: 100%; max-width: 300px; }
.change-password-section button { padding: 8px 14px; border: none; border-radius: 6px; background-color: #ffc107; color: #000; font-size: 16px; cursor: pointer; }
.change-password-section button:hover { background-color: #e0a800; }
.profile-box { max-width: 500px; margin: 30px auto; padding: 20px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; backdrop-filter: blur(10px); box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); font-family: 'SolaimanLipi', sans-serif; color: #fff; }
.profile-box h2 { text-align: center; margin-bottom: 20px; font-size: 24px; font-weight: bold; }
.profile-box .field-label { font-weight: bold; margin-top: 15px; margin-bottom: 5px; }
.profile-box .value { padding: 8px 12px; background-color: rgba(255,255,255,0.1); border-radius: 6px; margin-bottom: 10px; }
.profile-box input, .profile-box select { width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid #ccc; margin-bottom: 15px; font-size: 16px; background-color: rgba(255,255,255,0.1); color: #fff; }
.profile-box .buttons { display: flex; justify-content: space-between; margin-top: 20px; }
.profile-box button { flex: 1; margin: 0 5px; padding: 10px 12px; border: none; border-radius: 6px; background-color: #007bff; color: white; font-size: 16px; cursor: pointer; }
.profile-box button:hover { background-color: #0056b3; }
#message { margin-top: 15px; text-align: center; font-weight: bold; font-size: 15px; color: lightgreen; }
.logout-btn { display: block; margin: 25px auto 0; padding: 10px 16px; background-color: #dc3545; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; }
.logout-btn:hover { background-color: #b02a37; }
`;
document.head.appendChild(profileStyle);

// ============================================
// Utility helpers (local scope)
// ============================================
function toBanglaNumber(number) {
  if (typeof number !== "number") number = parseFloat(number);
  if (!Number.isFinite(number)) return '০';
  return number.toLocaleString('bn-BD', { maximumFractionDigits: 2 });
}

function convertToBanglaDigits(input) {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  if (input === null || input === undefined) return '';
  return String(input).replace(/\d/g, d => banglaDigits[d]);
}

// ============================================
// Load Profile Info
// ============================================
async function loadProfileInfo() {
  const content = document.getElementById("content");
  if (!content) return;

  content.innerHTML = `
    <div class="profile-box">
      <h2>প্রোফাইল তথ্য</h2>
      <div>
        <div class="field-label">নাম:</div>
        <div class="value" id="nameDisplay">লোড হচ্ছে...</div>
        <input type="text" id="nameInput" style="display:none" />
      </div>
      <div>
        <div class="field-label">ইমেইল:</div>
        <div class="value" id="emailDisplay">লোড হচ্ছে...</div>
      </div>
      <div>
        <div class="field-label">লিঙ্গ:</div>
        <div class="value" id="genderDisplay">লোড হচ্ছে...</div>
        <select id="genderInput" style="display:none">
          <option value="">-- নির্বাচন করুন --</option>
          <option value="পুরুষ">পুরুষ</option>
          <option value="মহিলা">মহিলা</option>
          <option value="অন্যান্য">অন্যান্য</option>
        </select>
      </div>
      <div>
        <div class="field-label">জন্মতারিখ:</div>
        <div class="value" id="dobDisplay">লোড হচ্ছে...</div>
        <input type="date" id="dobInput" style="display:none" />
      </div>
      <div class="buttons">
        <button id="editBtn">এডিট করুন</button>
        <button id="saveBtn" style="display:none">সংরক্ষণ করুন</button>
        <button id="cancelBtn" style="display:none">বাতিল করুন</button>
      </div>
      <div id="message"></div>
      <button id="logout-button" class="logout-btn">লগআউট</button>

      <div class="change-password-section">
        <button id="togglePasswordFormBtn">🔐 পাসওয়ার্ড পরিবর্তন করুন</button>
        <div id="passwordForm" style="display: none;">
          <input type="password" id="newPassword" placeholder="নতুন পাসওয়ার্ড দিন" />
          <br />
          <button id="changePasswordBtn">আপডেট করুন</button>
          <div id="passwordMessage"></div>
        </div>
      </div>
    </div>
  `;

  const user = firebase.auth().currentUser;
  const messageEl = document.getElementById("message");

  if (!user) {
    if (messageEl) {
      messageEl.innerText = "লগইন পাওয়া যায়নি! আবার লগইন করুন।";
      messageEl.style.color = "red";
    }
    return;
  }

  const uid = user.uid;
  const db = firebase.firestore();
  const nameDisplay = document.getElementById("nameDisplay");
  const emailDisplay = document.getElementById("emailDisplay");
  const genderDisplay = document.getElementById("genderDisplay");
  const dobDisplay = document.getElementById("dobDisplay");

  // 🆕 Form elements references
  const nameInput = document.getElementById("nameInput");
  const genderInput = document.getElementById("genderInput");
  const dobInput = document.getElementById("dobInput");

  try {
    // ১. শুধুমাত্র আপনার বর্তমান UID দিয়ে ডাটা খোঁজা
    const doc = await db.collection("users").doc(uid).get();

    if (doc.exists && doc.data() && doc.data().name) {
      const data = doc.data();
      if (nameDisplay)  nameDisplay.innerText  = data.name || "—";
      if (emailDisplay) emailDisplay.innerText = data.email || user.email || "—";
      if (genderDisplay) genderDisplay.innerText = data.gender || "—";
      if (dobDisplay)   dobDisplay.innerText   = data.dob
        ? convertToBanglaDigits(data.dob)
        : "—";

      if (nameInput)   nameInput.value   = data.name || "";
      if (genderInput) genderInput.value = data.gender || "";
      if (dobInput)    dobInput.value    = data.dob || "";
    } else {
      // ২. ডাটা না থাকলে নতুন ডকুমেন্ট তৈরি
      if (nameDisplay)   nameDisplay.innerText   = "—";
      if (emailDisplay)  emailDisplay.innerText  = user.email || "—";
      if (genderDisplay) genderDisplay.innerText = "—";
      if (dobDisplay)    dobDisplay.innerText    = "—";

      await db.collection("users").doc(uid).set({
        name: "",
        email: user.email || "",
        gender: "",
        dob: "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      if (messageEl) {
        messageEl.innerText = "নতুন প্রোফাইল তৈরি হয়েছে। এডিট করে তথ্য দিন।";
        messageEl.style.color = "orange";
      }
    }

  } catch (error) {
    console.error("Firebase Error:", error);
    if (nameDisplay)   nameDisplay.innerText   = "—";
    if (emailDisplay)  emailDisplay.innerText  = user.email || "—";
    if (genderDisplay) genderDisplay.innerText = "—";
    if (dobDisplay)    dobDisplay.innerText    = "—";
    if (messageEl) {
      messageEl.innerText = "লোডে সমস্যা: " + error.message;
      messageEl.style.color = "red";
    }
  }

  // ============================================
  // Edit / Save / Cancel
  // ============================================
  const editBtn = document.getElementById("editBtn");
  const saveBtn = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  // 🆕 onclick assignment diye replace — multiple listener attach hobe na
  if (editBtn) {
    editBtn.onclick = () => toggleEditMode(true);
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => toggleEditMode(false);
  }

  if (saveBtn) {
    saveBtn.onclick = async () => {
      const name = (nameInput?.value || "").trim();
      const gender = genderInput?.value || "";
      const dob = dobInput?.value || "";

      // 🆕 Name required check
      if (!name) {
        if (messageEl) {
          messageEl.innerText = "নাম অবশ্যই দিতে হবে!";
          messageEl.style.color = "red";
        }
        return;
      }

      // 🆕 Button disable while saving
      saveBtn.disabled = true;
      saveBtn.textContent = "সংরক্ষণ হচ্ছে...";

      try {
        await db.collection("users").doc(uid).update({ name, gender, dob });

        if (messageEl) {
          messageEl.innerText = "তথ্য সংরক্ষণ হয়েছে!";
          messageEl.style.color = "lightgreen";
        }

        // 🆕 Sidebar user-name update (simple textContent)
        const userNameDiv = document.getElementById("user-name");
        if (userNameDiv && name) {
          userNameDiv.textContent = name;
        }

        // 🆕 Display update without full reload
        if (nameDisplay)   nameDisplay.innerText   = name || "—";
        if (genderDisplay) genderDisplay.innerText = gender || "—";
        if (dobDisplay)    dobDisplay.innerText    = dob ? convertToBanglaDigits(dob) : "—";

        toggleEditMode(false);

      } catch (err) {
        if (messageEl) {
          messageEl.innerText = "সংরক্ষণে সমস্যা: " + err.message;
          messageEl.style.color = "red";
        }
      } finally {
        // 🆕 P1 fix: error hole o button state restore
        saveBtn.disabled = false;
        saveBtn.textContent = "সংরক্ষণ করুন";
      }
    };
  }

  // ============================================
  // Logout
  // ============================================
  const logoutBtn = document.getElementById("logout-button");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      // 🆕 confirm dialog
      if (!confirm("আপনি কি লগআউট করতে চান?")) return;
      firebase.auth().signOut()
        .then(() => { window.location.href = "login.html"; })
        .catch(err => {
          if (messageEl) {
            messageEl.innerText = "লগআউটে সমস্যা: " + err.message;
            messageEl.style.color = "red";
          }
        });
    };
  }

  // ============================================
  // Password Change
  // ============================================
  const togglePasswordFormBtn = document.getElementById("togglePasswordFormBtn");
  const passwordForm = document.getElementById("passwordForm");
  const passwordMessage = document.getElementById("passwordMessage");

  if (togglePasswordFormBtn && passwordForm) {
    togglePasswordFormBtn.onclick = () => {
      const isHidden = passwordForm.style.display === "none";
      passwordForm.style.display = isHidden ? "block" : "none";
      // 🆕 message clear on toggle
      if (passwordMessage) passwordMessage.innerText = "";
    };
  }

  const changePasswordBtn = document.getElementById("changePasswordBtn");
  if (changePasswordBtn) {
    changePasswordBtn.onclick = () => {
      const newPasswordInput = document.getElementById("newPassword");
      const newPassword = (newPasswordInput?.value || "").trim();

      if (!passwordMessage) return;

      if (newPassword.length < 6) {
        passwordMessage.style.color = "red";
        passwordMessage.innerText = "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!";
        return;
      }

      changePasswordBtn.disabled = true;
      changePasswordBtn.textContent = "আপডেট হচ্ছে...";

      firebase.auth().currentUser.updatePassword(newPassword)
        .then(() => {
          passwordMessage.style.color = "lightgreen";
          passwordMessage.innerText = "পাসওয়ার্ড পরিবর্তন সফল হয়েছে!";
          if (newPasswordInput) newPasswordInput.value = "";
          // 🆕 form hide on success
          if (passwordForm) passwordForm.style.display = "none";
        })
        .catch(error => {
          passwordMessage.style.color = "red";
          if (error.code === 'auth/requires-recent-login') {
            passwordMessage.innerText = "অনুগ্রহ করে আবার লগইন করে চেষ্টা করুন।";
          } else {
            passwordMessage.innerText = "সমস্যা হয়েছে! " + error.message;
          }
        })
        .finally(() => {
          // 🆕 restore button state
          changePasswordBtn.disabled = false;
          changePasswordBtn.textContent = "আপডেট করুন";
        });
    };
  }
}

// ============================================
// Toggle Edit Mode
// ============================================
function toggleEditMode(enable) {
  const nameDisplay   = document.getElementById("nameDisplay");
  const nameInput     = document.getElementById("nameInput");
  const genderDisplay = document.getElementById("genderDisplay");
  const genderInput   = document.getElementById("genderInput");
  const dobDisplay    = document.getElementById("dobDisplay");
  const dobInput      = document.getElementById("dobInput");

  const editBtn   = document.getElementById("editBtn");
  const saveBtn   = document.getElementById("saveBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  // 🆕 Null guards — element na thakle crash hobe na
  if (nameDisplay)   nameDisplay.style.display   = enable ? "none" : "block";
  if (nameInput)     nameInput.style.display     = enable ? "block" : "none";
  if (genderDisplay) genderDisplay.style.display = enable ? "none" : "block";
  if (genderInput)   genderInput.style.display   = enable ? "block" : "none";
  if (dobDisplay)    dobDisplay.style.display    = enable ? "none" : "block";
  if (dobInput)      dobInput.style.display      = enable ? "block" : "none";

  if (editBtn)   editBtn.style.display   = enable ? "none" : "inline-block";
  if (saveBtn)   saveBtn.style.display   = enable ? "inline-block" : "none";
  if (cancelBtn) cancelBtn.style.display = enable ? "inline-block" : "none";
}