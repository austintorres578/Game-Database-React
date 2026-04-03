import { auth } from "../../firebase/fireAuth";
import { doc, getDoc, collection, getDocs, db } from "../../firebase/firestore";

export const loadCustomizeProfileAndStats = async () => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userDocRef = doc(db, "users", user.uid);
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) return;

    const data = snap.data();

    const [librarySnap, completedSnap] = await Promise.all([
      getDocs(collection(db, "users", user.uid, "library")),
      getDocs(collection(db, "users", user.uid, "completed")),
    ]);

    const games = librarySnap.docs.map((docSnap) => docSnap.data());
    const completedGames = completedSnap.docs.map((docSnap) => docSnap.data());

    return [data, games, completedGames];
  } catch (err) {
    console.error("Error loading profile or library stats:", err);
  }
};
