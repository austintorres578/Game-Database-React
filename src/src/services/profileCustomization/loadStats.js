import { auth } from "../../firebase/fireAuth";
import { doc, getDoc, collection, getDocs, db } from "../../firebase/firestore";

export const loadCustomizeProfileAndStats = async () => {
  const user = auth.currentUser;
  if (!user) return; // not logged in, keep defaults

  try {
    const userDocRef = doc(db, "users", user.uid);
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) {
      // No profile yet → keep defaults but at least fill username once
      //   setUsername(fallbackUsername);
    } else {
      const data = snap.data();

      const libraryRef = collection(db, "users", user.uid, "library");
      const librarySnap = await getDocs(libraryRef);
      const games = librarySnap.docs.map((docSnap) => docSnap.data());

      return [data, games];
    }
  } catch (err) {
    console.error("Error loading profile or library stats:", err);
  }
};