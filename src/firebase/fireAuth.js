import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from "firebase/auth";
import { app } from "./firebase";

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
      ],
    });
  } catch {
    return getAuth(app);
  }
})();

export {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  indexedDBLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
};