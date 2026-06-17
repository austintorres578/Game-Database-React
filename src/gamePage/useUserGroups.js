// Loads the current user's custom groups from Firestore.
// Re-runs whenever the game data changes so groups are fresh per game.

import { useState, useEffect } from "react";
import { collection, getDocs, db } from "../../firebase/firestore";

/**
 * @param {object} auth       - Firebase auth instance
 * @param {object|null} gameData - The RAWG game object
 * @returns {{ userGroups: object[], setUserGroups: Function }}
 */
export function useUserGroups(auth, gameData) {
  const [userGroups, setUserGroups] = useState([]);

  useEffect(() => {
    if (!gameData?.id) return;

    const loadGroups = async () => {
      const user = auth.currentUser;
      if (!user) { setUserGroups([]); return; }

      try {
        const groupsRef = collection(db, "users", user.uid, "groups");
        const snap = await getDocs(groupsRef);

        const groups = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "Untitled Group",
            pinned: data.pinned ?? true,
            gameIds: Array.isArray(data.gameIds)
              ? data.gameIds.map(String)
              : [],
          };
        });

        groups.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        );
        setUserGroups(groups);
      } catch (err) {
        console.error("Error loading user groups:", err);
      }
    };

    loadGroups();
  }, [gameData]);

  return { userGroups, setUserGroups };
}
