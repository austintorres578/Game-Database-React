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
  bannerFile,
  existingBannerUrl,
  selectedBanner,
}) {
  if (!displayName.trim() || !shortAboutMe.trim() || !aboutMe.trim()) {
    throw new Error("All required profile fields must be filled out.");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be logged in to save your profile.");
  }

  const storage = getStorage(app);

  let avatarUrl = existingAvatarUrl || null;

  if (avatarFile) {
    const avatarRef = ref(storage, `users/${user.uid}/avatar`);
    await uploadBytes(avatarRef, avatarFile);
    avatarUrl = await getDownloadURL(avatarRef);
  }

  let bannerUrl = existingBannerUrl || null;

  if (bannerFile) {
    const bannerRef = ref(storage, `users/${user.uid}/banner`);
    await uploadBytes(bannerRef, bannerFile);
    bannerUrl = await getDownloadURL(bannerRef);
  }

  const payload = {
    displayName,
    shortAboutMe,
    aboutMe,
    selectedPlatforms,
    selectedGenres,
    profileTags,
    avatarUrl,
    bannerUrl,
    selectedBanner: selectedBanner,
    bannerUrl: bannerUrl,
    updatedAt: new Date().toISOString(),
  };

  const userDocRef = doc(db, "users", user.uid);
  await setDoc(userDocRef, payload, { merge: true });

  return payload;
}
