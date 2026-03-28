// Firestore service for managing game group membership on the Game Page.

import {
  collection,
  getDocs,
  updateDoc,
  arrayRemove,
  db,
} from "../../firebase/firestore";

/**
 * Removes a game from every group the user has in Firestore.
 * Called when a game is deleted from the library so groups stay in sync.
 */
export async function removeGameFromAllGroups(userId, gameIdStr) {
  try {
    const groupsRef = collection(db, "users", userId, "groups");
    const snap = await getDocs(groupsRef);

    const updates = snap.docs.map(async (groupSnap) => {
      const data = groupSnap.data();
      const ids = Array.isArray(data.gameIds) ? data.gameIds.map(String) : [];

      if (!ids.includes(String(gameIdStr))) return;

      await updateDoc(groupSnap.ref, {
        gameIds: arrayRemove(String(gameIdStr)),
      });
    });

    await Promise.all(updates);
  } catch (err) {
    console.error("Error removing game from all groups:", err);
  }
}
