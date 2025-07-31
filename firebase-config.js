// Import fungsi yang diperlukan dari SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// KONFIGURASI FIREBASE ANDA
const firebaseConfig = {
  apiKey: "AIzaSyDdsoytKVxfkR4yTLKbMSKLf58vbsHbbtw",
  authDomain: "togelup-management.firebaseapp.com",
  projectId: "togelup-management",
  storageBucket: "togelup-management.firebasestorage.app",
  messagingSenderId: "373446796420",
  appId: "1:373446796420:web:527dd3f01ab82e7b908ed1"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor instance Auth dan Firestore agar bisa digunakan di file lain
export const auth = getAuth(app);
export const db = getFirestore(app);