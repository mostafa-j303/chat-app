import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/config.js";

export function createGuestUsername() {
  return `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
}

function getProviderId(user, fallbackProvider) {
  if (fallbackProvider) {
    return fallbackProvider;
  }

  if (user.isAnonymous) {
    return "anonymous";
  }

  return user.providerData?.[0]?.providerId || "password";
}

export async function ensureUserProfile(user, metadata = {}) {
  const db = getFirestoreDb();

  if (!db) {
    throw new Error("Firestore is only available in the browser.");
  }

  const userRef = doc(db, "users", user.uid);
  const existingProfile = await getDoc(userRef);
  const username =
    metadata.username ||
    user.displayName ||
    user.email?.split("@")[0] ||
    createGuestUsername();

  const profile = {
    uid: user.uid,
    email: user.email || metadata.email || null,
    gender: metadata.gender || "not_provided",
    age: metadata.age ? Number(metadata.age) : null,
    username,
    photoURL: user.photoURL || null,
    authProvider: getProviderId(user, metadata.authProvider),
    isGuest: Boolean(user.isAnonymous),
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!existingProfile.exists()) {
    await setDoc(userRef, {
      ...profile,
      createdAt: serverTimestamp(),
    });
    return profile;
  }

  await updateDoc(userRef, {
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    ...profile,
    ...existingProfile.data(),
  };
}
