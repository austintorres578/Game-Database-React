import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
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
  addDoc,
  updateDoc,
  arrayRemove,
  arrayUnion,
};