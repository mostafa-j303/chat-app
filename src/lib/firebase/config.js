import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

export function getMissingFirebaseEnv() {
  return Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`);
}

export function hasFirebaseConfig() {
  return getMissingFirebaseEnv().length === 0;
}

export function getFirebaseApp() {
  if (!hasFirebaseConfig()) {
    throw new Error(`Missing Firebase configuration: ${getMissingFirebaseEnv().join(", ")}`);
  }

  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  return app;
}

export function getFirebaseAuth() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }

  return auth;
}

export function getFirestoreDb() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!db) {
    db = getFirestore(getFirebaseApp());
  }

  return db;
}

export function getGoogleProvider() {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({
      prompt: "select_account",
    });
  }

  return googleProvider;
}
