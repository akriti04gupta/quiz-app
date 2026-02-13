/**
 * Firebase Configuration - Web SDK
 * 
 * This configuration is loaded by frontend JavaScript files
 * Safe to expose in frontend code (Web SDK configuration only)
 */

const firebaseConfig = {
  apiKey: "AIzaSyAjbOfPH6tZjFGn4_Eqv62PsMya9JL4G5I",
  authDomain: "aus--kracken.firebaseapp.com",
  databaseURL: "https://aus--kracken-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aus--kracken",
  storageBucket: "aus--kracken.firebasestorage.app",
  messagingSenderId: "414012074136",
  appId: "1:414012074136:web:f38761bb2f70ac5b2508ed",
  measurementId: "G-BV98LQYRCX"
};

// Export for use in frontend modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
}

// Make available globally for inline scripts
window.firebaseConfig = firebaseConfig;
