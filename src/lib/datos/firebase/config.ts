import type { FirebaseOptions } from "firebase/app";

// Next.js reemplaza cada `process.env.NEXT_PUBLIC_*` en el build: hay que nombrarlas una por una.
export const configuracionFirebase: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigurado = Boolean(
  configuracionFirebase.apiKey && configuracionFirebase.projectId && configuracionFirebase.appId,
);

export const claveRecaptcha = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
export const appCheckDepuracion = process.env.NEXT_PUBLIC_APPCHECK_DEBUG === "true";
