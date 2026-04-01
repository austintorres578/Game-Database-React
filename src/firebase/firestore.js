import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  arrayRemove,
  arrayUnion,
  addDoc
} from "firebase/firestore";

import { app } from "./firebase";

export const db = getFirestore(app);

export {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  addDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
};