import { auth, onAuthStateChanged } from "../../firebase/fireAuth";
import { doc, getDoc, collection, getDocs, db } from "../../firebase/firestore";

export function loadProfileUserData(callback) {
  return onAuthStateChanged(auth, async (user) => {

    if (!user) {
      callback({
        user: null,
        gameLibrary: [],
        completedGames: [],
        favoriteGames: [],
        loading: false,
      });
      return;
    }

    try {
      const [profileSnap, librarySnap, completedSnap, favoritesSnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDocs(collection(db, "users", user.uid, "library")),
        getDocs(collection(db, "users", user.uid, "completed")),
        getDocs(collection(db, "users", user.uid, "favorites")),
      ]);

      const profile = profileSnap.exists() ? profileSnap.data() : null;

      const games = librarySnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const completed = completedSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const favorites = favoritesSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      callback({
        user,
        profile,
        gameLibrary: games,
        completedGames: completed,
        favoriteGames: favorites,
        loading: false,
      });
    } catch (err) {
      console.error(err);
    }
  });
}
