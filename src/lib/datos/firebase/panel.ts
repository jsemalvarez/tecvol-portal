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
import { informeParaGuardar, leerInforme, type Informe, type InformeGuardado } from "@/lib/dominio/informe";
import { esUso, leerPlaca } from "@/lib/dominio/placa";
import { esRolPersonal, puede } from "@/lib/dominio/roles";
import type { CuentaCliente, CuentaPersonal, DatosEquipo, Empresa, EquipoTaller, Registro, RolPersonal, Taller } from "@/lib/dominio/tipos";
import { ErrorDePanel, type MotivoErrorDePanel, type PanelRepositorio } from "../repositorios";
import { obtenerFirestore } from "./app";
import { configuracionFirebase } from "./config";
import { leerSeguimiento } from "./seguimiento";

const texto = (valor: unknown) => (typeof valor === "string" && valor.trim() ? valor.trim() : undefined);
const fecha = (valor: unknown) => (valor instanceof Timestamp ? valor.toDate() : undefined);

/** Dónde vive cada registro que se da de baja. El equipo son dos documentos: ver `cambiarBaja`. */
const COLECCIONES: Record<Exclude<Registro, "equipo">, string> = { empresa: "empresas", cuenta: "clientes", personal: "personal" };

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
    case "auth/too-many-requests":
      return "intentos";
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
    authAltas.languageCode = "es";
  }
  return authAltas;
}

/** Contraseña inicial que nadie conoce: el cliente elige la suya con el email de restablecimiento. */
function claveInicial() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("");
}

export class PanelFirestore implements PanelRepositorio {
  async obtenerTaller(rol: RolPersonal): Promise<Taller> {
    const db = obtenerFirestore();
    // Las reglas solo dejan leer las cuentas a quien puede administrarlas: los demás ni las piden.
    const conCuentas = puede(rol, "cuentas");
    const [empresas, ordenes, seguimientos, clientes, personal] = await guardar(() =>
      Promise.all([
        getDocs(collection(db, "empresas")),
        getDocs(collection(db, "ordenes")),
        getDocs(collection(db, "seguimiento")),
        conCuentas ? getDocs(collection(db, "clientes")) : null,
        conCuentas ? getDocs(collection(db, "personal")) : null,
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
        numeroOrden: texto(orden.numeroOrden),
        numeroTrafo: texto(orden.numeroTrafo),
        uso: esUso(orden.uso) ? orden.uso : undefined,
        placa: leerPlaca(orden.placa),
        baja: fecha(s.data().baja),
      });
    }

    return {
      empresas: empresas.docs
        .map((e) => ({ id: e.id, nombre: texto(e.data().nombre) ?? e.id, baja: fecha(e.data().baja) }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      equipos,
      cuentas: (clientes?.docs ?? []).map((c) => ({
        uid: c.id,
        email: texto(c.data().email) ?? "",
        empresa: texto(c.data().empresa) ?? "",
        baja: fecha(c.data().baja),
      })),
      // Un documento sin un rol válido no da acceso al panel (ver las reglas): no se lista.
      personal: (personal?.docs ?? []).flatMap((p) => {
        const datos = p.data();
        return esRolPersonal(datos.rol) ? [{ uid: p.id, email: texto(datos.email) ?? "", rol: datos.rol, baja: fecha(datos.baja) }] : [];
      }),
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
        ...(datos.numeroOrden ? { numeroOrden: datos.numeroOrden } : {}),
        ...(datos.numeroTrafo ? { numeroTrafo: datos.numeroTrafo } : {}),
        ...(datos.uso ? { uso: datos.uso } : {}),
        ...(datos.placa ? { placa: datos.placa } : {}),
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
      // `update` reemplaza la placa entera: un `set` con `merge` mezclaría la anterior y no borraría lo que se vació.
      lote.update(doc(db, "ordenes", codigo), {
        empresa: datos.empresa,
        referencia: datos.referencia ?? deleteField(),
        serie: datos.serie ?? deleteField(),
        numeroOrden: datos.numeroOrden ?? deleteField(),
        numeroTrafo: datos.numeroTrafo ?? deleteField(),
        uso: datos.uso ?? deleteField(),
        placa: datos.placa ?? deleteField(),
      });
      await lote.commit();
    });
  }

  async obtenerInforme(codigo: string): Promise<InformeGuardado | null> {
    const informe = await guardar(() => getDoc(doc(obtenerFirestore(), "informes", codigo)));
    if (!informe.exists()) return null;
    const datos = informe.data();
    return {
      ...leerInforme(datos),
      actualizado: datos.actualizado instanceof Timestamp ? datos.actualizado.toDate() : null,
      por: texto(datos.por),
    };
  }

  async guardarInforme(codigo: string, informe: Informe, por: string): Promise<void> {
    // Sin `merge`: el informe se reemplaza entero, así lo que se borró en el formulario no queda guardado.
    await guardar(() =>
      setDoc(doc(obtenerFirestore(), "informes", codigo), { ...informeParaGuardar(informe), por, actualizado: serverTimestamp() }),
    );
  }

  async crearEmpresa(nombre: string): Promise<Empresa> {
    const ref = await guardar(() => addDoc(collection(obtenerFirestore(), "empresas"), { nombre, creada: serverTimestamp() }));
    return { id: ref.id, nombre };
  }

  async editarEmpresa(id: string, nombre: string): Promise<void> {
    await guardar(() => updateDoc(doc(obtenerFirestore(), "empresas", id), { nombre }));
  }

  async crearCuenta(email: string, empresa: string): Promise<CuentaCliente> {
    return guardar(async () => {
      const uid = await crearUsuario(email);
      await setDoc(doc(obtenerFirestore(), "clientes", uid), { empresa, email, creada: serverTimestamp() });
      return { uid, email, empresa };
    });
  }

  async editarCuenta(uid: string, empresa: string): Promise<void> {
    await guardar(() => updateDoc(doc(obtenerFirestore(), "clientes", uid), { empresa }));
  }

  async crearPersonal(email: string, rol: RolPersonal): Promise<CuentaPersonal> {
    return guardar(async () => {
      const uid = await crearUsuario(email);
      await setDoc(doc(obtenerFirestore(), "personal", uid), { rol, email, creada: serverTimestamp() });
      return { uid, email, rol };
    });
  }

  async editarPersonal(uid: string, rol: RolPersonal): Promise<void> {
    await guardar(() => updateDoc(doc(obtenerFirestore(), "personal", uid), { rol }));
  }

  async reenviarAcceso(email: string): Promise<void> {
    await guardar(() => sendPasswordResetEmail(obtenerAuthAltas(), email));
  }

  async cambiarBaja(registro: Registro, id: string, baja: boolean): Promise<void> {
    const db = obtenerFirestore();
    const valor = { baja: baja ? serverTimestamp() : deleteField() };
    await guardar(async () => {
      if (registro !== "equipo") return updateDoc(doc(db, COLECCIONES[registro], id), valor);
      // El seguimiento esconde el código de la consulta pública; la orden, el equipo del portal del cliente.
      const lote = writeBatch(db);
      lote.update(doc(db, "seguimiento", id), valor);
      lote.update(doc(db, "ordenes", id), valor);
      await lote.commit();
    });
  }
}

/**
 * Crea el usuario en Firebase Auth con una contraseña que nadie conoce y le envía el email para elegir la
 * suya. Devuelve su UID, para asociarle la empresa o el rol.
 */
async function crearUsuario(email: string): Promise<string> {
  const auth = obtenerAuthAltas();
  const { user } = await createUserWithEmailAndPassword(auth, email, claveInicial());
  try {
    await sendPasswordResetEmail(auth, email);
  } finally {
    await signOut(auth);
  }
  return user.uid;
}
