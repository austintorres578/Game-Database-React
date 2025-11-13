// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCFviA96inC7S5_oqXmR-bjbB0f_Nl52Kg",
  authDomain: "game-database-799bd.firebaseapp.com",
  projectId: "game-database-799bd",
  storageBucket: "game-database-799bd.firebasestorage.app",
  messagingSenderId: "182012856457",
  appId: "1:182012856457:web:358be2eb01725b0a1ade58",
  measurementId: "G-E8EBHKCQZ4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth (this is what you will use)
export const auth = getAuth(app);

// Analytics (optional – only works in production HTTPS)
export const analytics = getAnalytics(app);
