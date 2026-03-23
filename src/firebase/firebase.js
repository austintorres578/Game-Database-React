// src/firebase/firebase.js

import { initializeApp, getApps } from "firebase/app";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCFviA96inC7S5_oqXmR-bjbB0f_Nl52Kg",
  authDomain: "game-database-799bd.firebaseapp.com",
  projectId: "game-database-799bd",
  storageBucket: "game-database-799bd.firebasestorage.app",
  messagingSenderId: "182012856457",
  appId: "1:182012856457:web:358be2eb01725b0a1ade58",
  measurementId: "G-E8EBHKCQZ4",
};

// ✅ Prevent double initialization (important for dev/HMR)
export const app =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);