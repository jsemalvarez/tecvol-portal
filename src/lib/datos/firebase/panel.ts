import { FirebaseError, getApps, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, inMemoryPersistence, initializeAuth, sendPasswordResetEmail, signOut, type Auth } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { generarCodigo } from "@/lib/dominio/codigo";
import type { EstadoReparacion } from "@/lib/dominio/estados";
import type { CuentaCliente, DatosEquipo, Empresa, EquipoTaller, Taller } from "@/lib/dominio/tipos";
import { ErrorDePanel, type MotivoErrorDePanel, type PanelRepositorio } from "../repositorios";
import { obtenerFirestore } from "./app";
import { configuracionFirebase } from "./config";
import { leerSeguimiento } from "./seguimiento";

const texto = (valor: unknown) => (typeof valor === "string" && valor.trim() ? valor.trim() : undefined);

function motivo(error: unknown): MotivoErrorDePanel {
  if (!(error instanceof FirebaseError)) return "desconocido";
  switch (error.code) {
    case "auth/email-already-in-use":
      return "email-en-uso";
    case "auth/invalid-email":
      return "email-invalido";
    case "auth/operation-not-allowed":
    case "auth/admin-restricted-operation":
      return "altas-deshabilitadas";
    case "permission-denied":
      return "permiso";
    case "unavailable":
    case "auth/network-request-failed":
      return "conexion";
    default:
      return "desconocido";
  }
}

/** Ejecuta una escritura y traduce el error a un motivo que la interfaz sabe explicar. */
async function guardar<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion();
  } catch (error) {
    throw error instanceof ErrorDePanel ? error : new ErrorDePanel(motivo(error));
  }
}

function aTimestamps(etapas: Partial<Record<EstadoReparacion, Date>>) {
  return Object.fromEntries(Object.entries(etapas).map(([estado, fecha]) => [estado, Timestamp.fromDate(fecha)]));
}

/**
 * Las cuentas se crean con una segunda instancia de Firebase Auth, en memoria: así el alta no
 * cierra la sesión del personal que la hace. Requiere que el proyecto permita crear cuentas.
 */
let authAltas: Auth | null = null;

function obtenerAuthAltas(): Auth {
  if (!authAltas) {
    const app = getApps().find((a) => a.name === "altas") ?? initializeApp(configuracionFirebase, "altas");
    authAltas = initializeAuth(app, { persistence: inMemoryPersistence });
  }
  return authAltas;
}

/** Contraseña inicial que nadie conoce: el cliente elige la suya con el email de restablecimiento. */
function claveInicial() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("");
}

export class PanelFirestore implements PanelRepositorio {
  async obtenerTaller(): Promise<Taller> {
    const db = obtenerFirestore();
    const [empresas, ordenes, seguimientos, clientes] = await guardar(() =>
      Promise.all([
        getDocs(collection(db, "empresas")),
        getDocs(collection(db, "ordenes")),
        getDocs(collection(db, "seguimiento")),
        getDocs(collection(db, "clientes")),
      ]),
    );

    const privados = new Map(ordenes.docs.map((o) => [o.id, o.data()]));
    const equipos: EquipoTaller[] = [];
    for (const s of seguimientos.docs) {
      const publico = leerSeguimiento(s.id, s.data());
      if (!publico) continue;
      const orden = privados.get(s.id) ?? {};
      equipos.push({
        ...publico,
        empresa: texto(orden.empresa) ?? "",
        referencia: texto(orden.referencia),
        serie: texto(orden.serie),
      });
    }

    return {
      empresas: empresas.docs
        .map((e) => ({ id: e.id, nombre: texto(e.data().nombre) ?? e.id }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      equipos,
      cuentas: clientes.docs.map((c) => ({ uid: c.id, email: texto(c.data().email) ?? "", empresa: texto(c.data().empresa) ?? "" })),
    };
  }

  async guardarEstado(codigo: string, estado: EstadoReparacion, etapas: Partial<Record<EstadoReparacion, Date>>): Promise<void> {
    await guardar(() =>
      updateDoc(doc(obtenerFirestore(), "seguimiento", codigo), { estado, etapas: aTimestamps(etapas), actualizado: serverTimestamp() }),
    );
  }

  async registrarEquipo(datos: DatosEquipo, ingreso: Date): Promise<EquipoTaller> {
    const db = obtenerFirestore();
    return guardar(async () => {
      // El código es aleatorio: se descarta si ya existe, algo muy improbable.
      let codigo = generarCodigo();
      for (let intento = 0; (await getDoc(doc(db, "seguimiento", codigo))).exists(); intento++) {
        if (intento >= 4) throw new ErrorDePanel("desconocido");
        codigo = generarCodigo();
      }
      const lote = writeBatch(db);
      lote.set(doc(db, "seguimiento", codigo), {
        estado: "ingresado",
        equipo: datos.equipo,
        etapas: { ingresado: Timestamp.fromDate(ingreso) },
        actualizado: serverTimestamp(),
      });
      lote.set(doc(db, "ordenes", codigo), {
        empresa: datos.empresa,
        ...(datos.referencia ? { referencia: datos.referencia } : {}),
        ...(datos.serie ? { serie: datos.serie } : {}),
        creada: serverTimestamp(),
      });
      await lote.commit();
      return { codigo, estado: "ingresado", etapas: { ingresado: ingreso }, actualizado: new Date(), ...datos };
    });
  }

  async editarEquipo(codigo: string, datos: DatosEquipo): Promise<void> {
    const db = obtenerFirestore();
    await guardar(async () => {
      const lote = writeBatch(db);
      lote.update(doc(db, "seguimiento", codigo), { equipo: datos.equipo, actualizado: serverTimestamp() });
      lote.set(
        doc(db, "ordenes", codigo),
        { empresa: datos.empresa, referencia: datos.referencia ?? deleteField(), serie: datos.serie ?? deleteField() },
        { merge: true },
      );
      await lote.commit();
    });
  }

  async crearEmpresa(nombre: string): Promise<Empresa> {
    const ref = await guardar(() => addDoc(collection(obtenerFirestore(), "empresas"), { nombre, creada: serverTimestamp() }));
    return { id: ref.id, nombre };
  }

  async crearCuenta(email: string, empresa: string): Promise<CuentaCliente> {
    return guardar(async () => {
      const auth = obtenerAuthAltas();
      const { user } = await createUserWithEmailAndPassword(auth, email, claveInicial());
      try {
        await sendPasswordResetEmail(auth, email);
      } finally {
        await signOut(auth);
      }
      await setDoc(doc(obtenerFirestore(), "clientes", user.uid), { empresa, email, creada: serverTimestamp() });
      return { uid: user.uid, email, empresa };
    });
  }
}
