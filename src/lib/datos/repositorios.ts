import type { ConsultaNueva, PortalCliente, SeguimientoPublico, Sesion } from "@/lib/dominio/tipos";
import { firebaseConfigurado } from "./firebase/config";

/**
 * Contratos de acceso a datos. Los componentes solo conocen estas interfaces;
 * la implementación (Firebase hoy, Postgres/Supabase mañana) se elige acá.
 */
export interface SeguimientoRepositorio {
  /** Devuelve `null` si el código no existe. */
  obtenerPorCodigo(codigo: string): Promise<SeguimientoPublico | null>;
}

export interface ConsultasRepositorio {
  crear(consulta: ConsultaNueva): Promise<void>;
}

export interface AutenticacionRepositorio {
  /** Inicia sesión con email y contraseña. Si falla, lanza `ErrorDeIngreso`. */
  ingresar(email: string, clave: string): Promise<Sesion>;
  salir(): Promise<void>;
  /** Envía el enlace para elegir una contraseña nueva. No revela si el email tiene cuenta. */
  restablecerClave(email: string): Promise<void>;
  /** Avisa la sesión actual y cada cambio. Devuelve la función para dejar de escuchar. */
  observarSesion(alCambiar: (sesion: Sesion | null) => void): () => void;
}

export interface PortalRepositorio {
  /** Empresa y equipos de una cuenta de cliente. `null` si la cuenta no está asociada a una empresa. */
  obtenerPortal(uid: string): Promise<PortalCliente | null>;
}

export type MotivoErrorDeIngreso = "credenciales" | "intentos" | "deshabilitada" | "conexion" | "desconocido";

export class ErrorDeIngreso extends Error {
  constructor(readonly motivo: MotivoErrorDeIngreso) {
    super(`No se pudo ingresar: ${motivo}`);
    this.name = "ErrorDeIngreso";
  }
}

export interface Repositorios {
  seguimiento: SeguimientoRepositorio;
  consultas: ConsultasRepositorio;
}

export type ModoDatos = "firebase" | "local" | "sin-configurar";

/** Sin Firebase, en desarrollo se usan datos locales de prueba; en producción, nunca. */
export const modoDatos: ModoDatos = firebaseConfigurado
  ? "firebase"
  : process.env.NODE_ENV === "production"
    ? "sin-configurar"
    : "local";

export class ServicioNoConfiguradoError extends Error {
  constructor() {
    super("Firebase no está configurado para este entorno.");
    this.name = "ServicioNoConfiguradoError";
  }
}

let repositorios: Promise<Repositorios> | null = null;

export function obtenerRepositorios(): Promise<Repositorios> {
  repositorios ??= cargarRepositorios();
  return repositorios;
}

async function cargarRepositorios(): Promise<Repositorios> {
  if (modoDatos === "firebase") {
    const [{ SeguimientoFirestore }, { ConsultasFirestore }] = await Promise.all([
      import("./firebase/seguimiento"),
      import("./firebase/consultas"),
    ]);
    return { seguimiento: new SeguimientoFirestore(), consultas: new ConsultasFirestore() };
  }
  if (modoDatos === "local") {
    const { SeguimientoLocal, ConsultasLocal } = await import("./local");
    return { seguimiento: new SeguimientoLocal(), consultas: new ConsultasLocal() };
  }
  throw new ServicioNoConfiguradoError();
}

let autenticacion: Promise<AutenticacionRepositorio> | null = null;

/** La autenticación se carga aparte, para que las páginas públicas no descarguen Firebase Auth. */
export function obtenerAutenticacion(): Promise<AutenticacionRepositorio> {
  autenticacion ??= cargarAutenticacion();
  return autenticacion;
}

async function cargarAutenticacion(): Promise<AutenticacionRepositorio> {
  if (modoDatos === "firebase") {
    const { AutenticacionFirebase } = await import("./firebase/autenticacion");
    return new AutenticacionFirebase();
  }
  if (modoDatos === "local") {
    const { AutenticacionLocal } = await import("./local/autenticacion");
    return new AutenticacionLocal();
  }
  throw new ServicioNoConfiguradoError();
}

let portal: Promise<PortalRepositorio> | null = null;

/** Los datos del portal también se cargan aparte: solo los necesita quien ingresó como cliente. */
export function obtenerPortal(): Promise<PortalRepositorio> {
  portal ??= cargarPortal();
  return portal;
}

async function cargarPortal(): Promise<PortalRepositorio> {
  if (modoDatos === "firebase") {
    const { PortalFirestore } = await import("./firebase/portal");
    return new PortalFirestore();
  }
  if (modoDatos === "local") {
    const { PortalLocal } = await import("./local/portal");
    return new PortalLocal();
  }
  throw new ServicioNoConfiguradoError();
}
