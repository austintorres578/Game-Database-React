// Firestore service for creating, updating, deleting, and managing
// game group membership in the user's library.

import {
  collection,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  db,
} from "../../firebase/firestore";

/**
 * Adds an array of game IDs to an existing Firestore group document.
 * Does not update React state — the caller handles optimistic UI.
 */
export async function addGameIdsToGroupFirestore(userId, groupId, gameIds) {
  const groupRef = doc(db, "users", userId, "groups", groupId);
  await updateDoc(groupRef, {
    gameIds: arrayUnion(...gameIds.map(String)),
  });
}

/**
 * Creates a new group document in Firestore.
 * Returns the saved group object including the generated Firestore ID.
 */
export async function createGroupInFirestore(userId, groupData) {
  const groupsRef = collection(db, "users", userId, "groups");
  const docRef = await addDoc(groupsRef, groupData);
  return { id: docRef.id, ...groupData };
}

/**
 * Overwrites an existing group document in Firestore with new data.
 */
export async function updateGroupInFirestore(userId, groupId, groupData) {
  const groupDocRef = doc(db, "users", userId, "groups", groupId);
  await setDoc(groupDocRef, groupData, { merge: false });
}

/**
 * Deletes a group document from Firestore.
 */
export async function deleteGroupFromFirestore(userId, groupId) {
  const groupDocRef = doc(db, "users", userId, "groups", groupId);
  await deleteDoc(groupDocRef);
}
