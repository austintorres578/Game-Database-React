// Firestore service for managing game group membership on the Game Page.

import {
  collection,
  getDocs,
  updateDoc,
  arrayRemove,
  db,
} from "../../firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { app } from "../../firebase/firebase";

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

export async function deleteCustomGameStorageFiles(userId, docId, backgroundImage, screenshots) {
  const storage = getStorage(app);
  const deletions = [];

  if (typeof backgroundImage === "string" && backgroundImage.includes("firebasestorage.googleapis.com")) {
    const coverRef = ref(storage, `users/${userId}/customGameCovers/${docId}`);
    deletions.push(deleteObject(coverRef).catch(() => {}));
  }

  if (Array.isArray(screenshots)) {
    for (const screenshot of screenshots) {
      if (screenshot?.storagePath) {
        const screenshotRef = ref(storage, screenshot.storagePath);
        deletions.push(deleteObject(screenshotRef).catch(() => {}));
      }
    }
  }

  await Promise.all(deletions);
}
