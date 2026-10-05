import type { ConsultaNueva, SeguimientoPublico } from "@/lib/dominio/tipos";
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
