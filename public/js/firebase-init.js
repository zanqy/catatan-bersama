// ============================================================
// Konfigurasi Firebase — project: catatan-bersama-app
// ------------------------------------------------------------
// Nilai config ini PUBLIK — aman tampil di klien.
// Keamanan data dijaga oleh Firestore Security Rules (firestore.rules).
// ============================================================
const firebaseConfig = {
  apiKey: 'AIzaSyD2BBIs8pr9gL2EEd-_4v8D4iFY-dak1_I',
  authDomain: 'catatan-bersama-app.firebaseapp.com',
  projectId: 'catatan-bersama-app',
  storageBucket: 'catatan-bersama-app.firebasestorage.app',
  messagingSenderId: '1099506843035',
  appId: '1:1099506843035:web:9ddfaf8ec53033af94353e'
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();