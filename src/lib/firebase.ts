import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  connectAuthEmulator,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence, indexedDBLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Emulator access is explicit, development-only, and restricted to demo projects.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  if (!firebaseConfig.projectId?.startsWith("demo-")) throw new Error("Emulator mode requires a demo Firebase project.")
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true })
  connectFirestoreEmulator(db, "127.0.0.1", 8080)
  connectFunctionsEmulator(functions, "127.0.0.1", 5001)
}
