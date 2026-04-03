import { auth } from "../../firebase/fireAuth";
import { doc, setDoc, db } from "../../firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../../firebase/firebase";

export async function handleSaveSubmit({
  displayName,
  shortAboutMe,
  aboutMe,
  selectedPlatforms,
  selectedGenres,
  profileTags,
  avatarFile,
  existingAvatarUrl,
}) {
  if (!displayName.trim() || !shortAboutMe.trim() || !aboutMe.trim()) {
    throw new Error("All required profile fields must be filled out.");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be logged in to save your profile.");
  }

  let avatarUrl = existingAvatarUrl || null;

  if (avatarFile) {
    const storage = getStorage(app);
    const avatarRef = ref(storage, `users/${user.uid}/avatar`);
    await uploadBytes(avatarRef, avatarFile);
    avatarUrl = await getDownloadURL(avatarRef);
  }

  const payload = {
    displayName,
    shortAboutMe,
    aboutMe,
    selectedPlatforms,
    selectedGenres,
    profileTags,
    avatarUrl,
    updatedAt: new Date().toISOString(),
  };

  const userDocRef = doc(db, "users", user.uid);
  await setDoc(userDocRef, payload, { merge: true });

  return payload;
}
