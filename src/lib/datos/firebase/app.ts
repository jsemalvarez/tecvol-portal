import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { appCheckDepuracion, claveRecaptcha, configuracionFirebase } from "./config";

declare global {
  // Token de depuración de App Check para localhost.
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}

function iniciarApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  const app = initializeApp(configuracionFirebase);

  // App Check con reCAPTCHA v3 protege la cuota gratuita de lecturas frente a bots.
  // Se activa solo si hay clave configurada, así el desarrollo local no depende de él.
  if (typeof window !== "undefined" && claveRecaptcha) {
    if (appCheckDepuracion) globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(claveRecaptcha),
      isTokenAutoRefreshEnabled: true,
    });
  }
  return app;
}

let db: Firestore | null = null;

export function obtenerFirestore(): Firestore {
  db ??= getFirestore(iniciarApp());
  return db;
}

let auth: Auth | null = null;

export function obtenerAuth(): Auth {
  if (!auth) {
    auth = getAuth(iniciarApp());
    // Los emails de Firebase (elegir contraseña) salen en el idioma de la instancia.
    auth.languageCode = "es";
  }
  return auth;
}
