import type { Bobinado, BobinadoGuardado } from "@/lib/dominio/bobinado";
import type { EstadoReparacion } from "@/lib/dominio/estados";
import type { Informe, InformeGuardado } from "@/lib/dominio/informe";
import type {
  ConsultaNueva,
  CuentaCliente,
  CuentaPersonal,
  DatosEquipo,
  Empresa,
  EquipoTaller,
  PortalCliente,
  Registro,
  RolPersonal,
  SeguimientoPublico,
  Sesion,
  Taller,
} from "@/lib/dominio/tipos";
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
  /** Email de la cuenta del enlace para elegir la contraseña. Si venció o ya no sirve, lanza `ErrorDeEnlace`. */
  verificarEnlaceClave(codigo: string): Promise<string>;
  /** Guarda la contraseña nueva con el código del enlace. Si falla, lanza `ErrorDeEnlace`. */
  elegirClave(codigo: string, clave: string): Promise<void>;
  /** Avisa la sesión actual y cada cambio. Devuelve la función para dejar de escuchar. */
  observarSesion(alCambiar: (sesion: Sesion | null) => void): () => void;
}

export interface PortalRepositorio {
  /** Empresa y equipos de una cuenta de cliente. `null` si la cuenta no está asociada a una empresa. */
  obtenerPortal(uid: string): Promise<PortalCliente | null>;
}

export interface PanelRepositorio {
  /**
   * Empresas y equipos, también los dados de baja. Solo para el personal. Las cuentas de clientes y del
   * personal vienen solo si el rol puede administrarlas; si no, las listas quedan vacías.
   */
  obtenerTaller(rol: RolPersonal): Promise<Taller>;
  /** Guarda el estado de un equipo con las fechas de sus etapas (ver `etapasConEstado`). */
  guardarEstado(codigo: string, estado: EstadoReparacion, etapas: Partial<Record<EstadoReparacion, Date>>): Promise<void>;
  /** Registra un equipo nuevo con un código de seguimiento nuevo, en estado "ingresado". */
  registrarEquipo(datos: DatosEquipo, ingreso: Date): Promise<EquipoTaller>;
  editarEquipo(codigo: string, datos: DatosEquipo): Promise<void>;
  /** Informe de diagnóstico de un equipo; `null` si todavía no tiene. */
  obtenerInforme(codigo: string): Promise<InformeGuardado | null>;
  /** Reemplaza el informe entero y anota quién lo guardó. */
  guardarInforme(codigo: string, informe: Informe, por: string): Promise<void>;
  /** Datos de bobinado de una reparación; `null` si todavía no tiene. */
  obtenerBobinado(codigo: string): Promise<BobinadoGuardado | null>;
  /** Reemplaza el bobinado entero y anota quién lo guardó. */
  guardarBobinado(codigo: string, bobinado: Bobinado, por: string): Promise<void>;
  crearEmpresa(nombre: string): Promise<Empresa>;
  editarEmpresa(id: string, nombre: string): Promise<void>;
  /** Crea la cuenta, la asocia a la empresa y envía al cliente el email para elegir su contraseña. */
  crearCuenta(email: string, empresa: string): Promise<CuentaCliente>;
  /** Pasa la cuenta de un cliente a otra empresa. El email no se cambia desde la app. */
  editarCuenta(uid: string, empresa: string): Promise<void>;
  /** Como `crearCuenta`, pero la cuenta entra al panel con el rol elegido. */
  crearPersonal(email: string, rol: RolPersonal): Promise<CuentaPersonal>;
  editarPersonal(uid: string, rol: RolPersonal): Promise<void>;
  /** Envía otra vez el email para elegir la contraseña, por si el anterior venció. El enlace anterior deja de servir. */
  reenviarAcceso(email: string): Promise<void>;
  /**
   * Baja lógica: nada se borra. El registro queda guardado con la fecha de baja y deja de verse o de dar
   * acceso; con `baja` en `false` se reactiva.
   */
  cambiarBaja(registro: Registro, id: string, baja: boolean): Promise<void>;
}

export type MotivoErrorDePanel =
  | "email-en-uso"
  | "email-invalido"
  | "altas-deshabilitadas"
  | "permiso"
  | "intentos"
  | "conexion"
  | "desconocido";

export class ErrorDePanel extends Error {
  constructor(readonly motivo: MotivoErrorDePanel) {
    super(`No se pudo guardar: ${motivo}`);
    this.name = "ErrorDePanel";
  }
}

export type MotivoErrorDeIngreso = "credenciales" | "intentos" | "deshabilitada" | "conexion" | "desconocido";

export class ErrorDeIngreso extends Error {
  constructor(readonly motivo: MotivoErrorDeIngreso) {
    super(`No se pudo ingresar: ${motivo}`);
    this.name = "ErrorDeIngreso";
  }
}

/**
 * Por qué no sirve un enlace para elegir la contraseña: `vencido` pasó su plazo; `usado` ya se usó o lo
 * reemplazó uno más nuevo (cada email anula el anterior); `debil`, la contraseña no alcanza.
 */
export type MotivoErrorDeEnlace = "vencido" | "usado" | "debil" | "deshabilitada" | "conexion" | "desconocido";

export class ErrorDeEnlace extends Error {
  constructor(readonly motivo: MotivoErrorDeEnlace) {
    super(`El enlace no sirve: ${motivo}`);
    this.name = "ErrorDeEnlace";
  }
}

export interface Repositorios {
  seguimiento: SeguimientoRepositorio;
  consultas: ConsultasRepositorio;
}

export type ModoDatos = "firebase" | "local" | "sin-configurar";

/** Para publicar una demo con datos de prueba, aunque sea un build de producción. */
const datosDePrueba = process.env.NEXT_PUBLIC_DATOS_DE_PRUEBA === "true";

/**
 * Sin Firebase, en desarrollo se usan datos locales de prueba. En producción solo si se piden
 * con `NEXT_PUBLIC_DATOS_DE_PRUEBA`; si no, la app queda sin configurar.
 */
export const modoDatos: ModoDatos = datosDePrueba
  ? "local"
  : firebaseConfigurado
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

let panel: Promise<PanelRepositorio> | null = null;

/** Los datos del panel, solo para quien ingresó como personal del taller. */
export function obtenerPanel(): Promise<PanelRepositorio> {
  panel ??= cargarPanel();
  return panel;
}

async function cargarPanel(): Promise<PanelRepositorio> {
  if (modoDatos === "firebase") {
    const { PanelFirestore } = await import("./firebase/panel");
    return new PanelFirestore();
  }
  if (modoDatos === "local") {
    const { PanelLocal } = await import("./local/panel");
    return new PanelLocal();
  }
  throw new ServicioNoConfiguradoError();
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
