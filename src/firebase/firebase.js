// firebase.js
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

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

// ✅ Prevent accidental double-init (can cause auth weirdness in dev/HMR)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

/**
 * ✅ Auth (fixed)
 * - Use a persistence *fallback list* so Firebase can restore in more environments.
 * - indexedDBLocalPersistence is best; if it fails, localStorage/session are fallbacks.
 * - Your SignIn page can still call setPersistence(...) to override per user choice.
 */
export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
      ],
    });
  } catch (e) {
    // If auth was already initialized (common with hot reload), reuse it.
    return getAuth(app);
  }
})();

// Firestore
export const db = getFirestore(app);

// Analytics (guarded so it doesn’t crash locally / non-HTTPS)
export let analytics = null;
isSupported()
  .then((supported) => {
    if (supported) analytics = getAnalytics(app);
  })
  .catch(() => {
    analytics = null;
  });
