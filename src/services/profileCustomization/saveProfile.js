import { auth } from "../../firebase/fireAuth";
import { doc, setDoc, db } from "../../firebase/firestore";

export async function handleSaveSubmit({
  displayName,
  shortAboutMe,
  aboutMe,
  selectedPlatforms,
  selectedGenres,
  profileTags,
  previewSrc,
}) {
  if (!displayName.trim() || !shortAboutMe.trim() || !aboutMe.trim()) {
    throw new Error("All required profile fields must be filled out.");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be logged in to save your profile.");
  }

  const payload = {
    displayName,
    shortAboutMe,
    aboutMe,
    selectedPlatforms,
    selectedGenres,
    profileTags,
    avatarPreview: previewSrc,
    updatedAt: new Date().toISOString(),
  };

  const userDocRef = doc(db, "users", user.uid);
  await setDoc(userDocRef, payload, { merge: true });

  return payload;
}