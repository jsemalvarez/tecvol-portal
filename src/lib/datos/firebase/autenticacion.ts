import { FirebaseError } from "firebase/app";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import type { Rol, Sesion } from "@/lib/dominio/tipos";
import { ErrorDeIngreso, type AutenticacionRepositorio, type MotivoErrorDeIngreso } from "../repositorios";
import { obtenerAuth, obtenerFirestore } from "./app";

/** Códigos de Firebase Auth traducidos a los motivos que la interfaz sabe explicar. */
function motivo(error: unknown): MotivoErrorDeIngreso {
  if (!(error instanceof FirebaseError)) return "desconocido";
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "credenciales";
    case "auth/too-many-requests":
      return "intentos";
    case "auth/user-disabled":
      return "deshabilitada";
    case "auth/network-request-failed":
      return "conexion";
    default:
      return "desconocido";
  }
}

/**
 * El rol sale de `personal/{uid}`: si el documento existe, es personal del taller. Las reglas
 * permiten que cada usuario lea solo su propio documento.
 */
async function rolDe(usuario: User): Promise<Rol> {
  const snap = await getDoc(doc(obtenerFirestore(), "personal", usuario.uid));
  return snap.exists() ? "personal" : "cliente";
}

async function sesionDe(usuario: User): Promise<Sesion> {
  return { uid: usuario.uid, email: usuario.email ?? "", rol: await rolDe(usuario) };
}

export class AutenticacionFirebase implements AutenticacionRepositorio {
  async ingresar(email: string, clave: string): Promise<Sesion> {
    try {
      const { user } = await signInWithEmailAndPassword(obtenerAuth(), email, clave);
      return await sesionDe(user);
    } catch (error) {
      throw new ErrorDeIngreso(motivo(error));
    }
  }

  async salir(): Promise<void> {
    await signOut(obtenerAuth());
  }

  async restablecerClave(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(obtenerAuth(), email);
    } catch (error) {
      // Un email sin cuenta no se informa, para no revelar quién tiene cuenta.
      if (error instanceof FirebaseError && error.code === "auth/user-not-found") return;
      throw new ErrorDeIngreso(motivo(error));
    }
  }

  observarSesion(alCambiar: (sesion: Sesion | null) => void): () => void {
    return onAuthStateChanged(obtenerAuth(), (usuario) => {
      if (!usuario) {
        alCambiar(null);
        return;
      }
      sesionDe(usuario).then(alCambiar, () => alCambiar(null));
    });
  }
}
