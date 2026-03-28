import { auth, onAuthStateChanged } from "../../firebase/fireAuth";
import { doc, getDoc, collection, getDocs, db } from "../../firebase/firestore";

export function loadProfileUserData(callback) {
  return onAuthStateChanged(auth, async (user) => {

    if (!user) {
      callback({
        user: null,
        gameLibrary: [],
        loading: false,
      });
      return;
    }

    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      const profile = snap.exists() ? snap.data() : null;

      const libraryRef = collection(db, "users", user.uid, "library");
      const librarySnap = await getDocs(libraryRef);

      const games = librarySnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      callback({
        user,
        profile,
        gameLibrary: games,
        loading: false,
      });
    } catch (err) {
      console.error(err);
    }
  });
}

