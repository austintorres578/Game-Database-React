// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCFviA96inC7S5_oqXmR-bjbB0f_Nl52Kg",
  authDomain: "game-database-799bd.firebaseapp.com",
  projectId: "game-database-799bd",
  storageBucket: "game-database-799bd.firebasestorage.app",
  messagingSenderId: "182012856457",
  appId: "1:182012856457:web:358be2eb01725b0a1ade58",
  measurementId: "G-E8EBHKCQZ4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth (for login / currentUser)
export const auth = getAuth(app);

// Firestore (for storing profiles, etc.)
export const db = getFirestore(app);

// Analytics (optional – only works in browser/production HTTPS)
export const analytics = getAnalytics(app);
