import type { LimitesAvisos } from "./avisos";
import type { EstadoReparacion } from "./estados";
import type { Facturacion } from "./facturacion";
import type { Placa, Uso } from "./placa";
import type { Rol, RolPersonal } from "./roles";

export type { Rol, RolPersonal } from "./roles";

/** Lo que se puede dar de baja en el panel. La baja es lógica: queda guardado con la fecha y se puede reactivar. */
export type Registro = "equipo" | "transformador" | "empresa" | "cuenta" | "personal";

/**
 * Documento público `seguimiento/{codigo}`: solo lo que puede ver cualquiera
 * que tenga el código. Nada del cliente ni de presupuestos.
 */
export interface SeguimientoPublico {
  codigo: string;
  estado: EstadoReparacion;
  /** Descripción básica del equipo, p. ej. "Transformador trifásico 315 kVA · 13,2/0,4 kV". */
  equipo: string;
  /** Fecha de inicio de cada etapa alcanzada. */
  etapas: Partial<Record<EstadoReparacion, Date>>;
  actualizado: Date | null;
}

/**
 * Equipo de una empresa cliente, tal como lo ve en el portal: los datos públicos del seguimiento más
 * los privados de la orden (`ordenes/{codigo}`), que solo lee la empresa dueña.
 */
export interface EquipoCliente extends SeguimientoPublico {
  /** Cómo identifica el cliente a este equipo, p. ej. "Subestación Barrio Norte". */
  referencia?: string;
  /** N.º de fabricación de la chapa (en algunas, N.º de serie). */
  serie?: string;
  /** Los PDF de la orden. En el portal llegan solo los que no están dados de baja. */
  archivos?: ArchivoOrden[];
}

/**
 * Un PDF de una orden de trabajo: un ensayo, un presupuesto, un informe… Lo sube el personal y lo ve también
 * el cliente de la empresa en su portal. El archivo está en Supabase Storage; la orden guarda estos datos.
 */
export interface ArchivoOrden {
  id: string;
  /** El nombre que tenía en la computadora de quien lo subió. */
  nombre: string;
  /** En bytes. */
  tamano: number;
  subido: Date;
  /** Email de quien lo subió. */
  por: string;
  /** Fecha de baja: se subió por error o ya no corresponde. El cliente deja de verlo; el archivo queda guardado. */
  baja?: Date;
}

/** Lo que ve una cuenta de cliente en el portal: su empresa y sus equipos. */
export interface PortalCliente {
  empresa: string;
  equipos: EquipoCliente[];
}

/** Empresa cliente del taller (`empresas/{id}`). */
export interface Empresa {
  id: string;
  nombre: string;
  /** Para el certificado y la factura. Puede faltar: las empresas se crean con solo el nombre. */
  facturacion?: Facturacion;
  /** Fecha de baja: ya no aparece para registrar equipos. Antes hay que dar de baja sus cuentas. */
  baja?: Date;
}

/** Lo que carga el administrador al crear o editar una empresa. */
export type DatosEmpresa = Pick<Empresa, "nombre" | "facturacion">;

/** Cuenta de cliente asociada a una empresa (`clientes/{uid}`). */
export interface CuentaCliente {
  uid: string;
  email: string;
  empresa: string;
  /** Fecha de baja: la cuenta ya no puede ingresar. */
  baja?: Date;
}

/** Cuenta del personal de Tecvol (`personal/{uid}`): entra al panel con los permisos de su rol. */
export interface CuentaPersonal {
  uid: string;
  email: string;
  rol: RolPersonal;
  /** Fecha de baja: la cuenta ya no puede ingresar. */
  baja?: Date;
}

/**
 * Un transformador (`transformadores/{id}`): la máquina, que pasa por el taller una o más veces, cada vez
 * con una orden de trabajo. Es siempre del mismo cliente: no se vende ni pasa de una empresa a otra.
 */
export interface Transformador {
  id: string;
  empresa: string;
  /**
   * N.º de trafo: el de fábrica, en la chapa. Si no se ve o no lo tiene, uno temporal (`NT-0001`) hasta que
   * se corrija; `provisorio` dice que es temporal.
   */
  numero: string;
  provisorio?: boolean;
  /**
   * N.º T: el número interno que le pone el cliente. No todos lo usan. El cliente puede cambiárselo o
   * pasárselo a otro transformador: entre los activos de un cliente no se repite, y cada O.T. guarda el que
   * tenía al ingresar (ver `historialNumeroT`).
   */
  numeroT?: string;
  /**
   * Los N.º T que tuvo antes, con la fecha en que dejó de tenerlos: así se sabe que lo tuvo aunque no haya
   * ingresado al taller con él. Lo anota el repositorio al cambiar el N.º T (ver `conCambioDeT`).
   */
  cambiosT?: CambioT[];
  /** Descripción pública, armada con la chapa (ver `describirEquipo`). La copian sus órdenes. */
  equipo: string;
  uso?: Uso;
  placa?: Placa;
  /** Fecha de baja: se destruyó o el cliente ya no lo tiene. Sus órdenes quedan y su N.º T queda libre. */
  baja?: Date;
}

/** Un N.º T que tuvo un transformador y la fecha en que dejó de tenerlo. */
export interface CambioT {
  numeroT: string;
  hasta: Date;
}

/**
 * Lo que se carga de un transformador. El cliente se elige al darlo de alta y no cambia; los N.º T de antes
 * los anota el repositorio.
 */
export type DatosTransformador = Omit<Transformador, "id" | "empresa" | "baja" | "cambiosT">;

/**
 * Datos de una orden de trabajo que carga el personal. Lo del transformador (cliente, números y chapa)
 * va en el transformador.
 */
export interface DatosOrden {
  /**
   * N.º de la orden de trabajo del sistema de gestión de la empresa, con el que después se factura. Es
   * obligatorio; como a veces llega después del ingreso, se puede usar uno temporal (`TEMP-0001`) y
   * cambiarlo después. Varias órdenes facturadas juntas lo comparten.
   */
  numeroOrden: string;
  /** El N.º de O.T. es uno temporal: falta cargar el del sistema de gestión. */
  numeroOrdenTemporal?: boolean;
  /** Cómo llama el cliente al transformador o dónde estaba instalado, p. ej. "Subestación Barrio Norte". */
  referencia?: string;
  /** Lo que informa el cliente al mandarlo: la falla, una pérdida de aceite, un mantenimiento… */
  motivo?: string;
}

/**
 * Un equipo como lo ve el personal: una orden de trabajo, con el seguimiento, sus datos y lo de su
 * transformador (el cliente, los números, la descripción y la chapa), copiado al leerla (ver `conTransformador`).
 */
export interface EquipoTaller extends EquipoCliente {
  /** El transformador de esta orden: lo comparten todas sus órdenes (ver `ordenesDelTrafo`). */
  trafo: string;
  empresa: string;
  /** Las cargadas antes de que fuera obligatorio pueden no tenerlo. */
  numeroOrden?: string;
  numeroOrdenTemporal?: boolean;
  motivo?: string;
  /** El N.º T que tiene hoy el transformador. `serie` es su N.º de trafo, el de fábrica. */
  numeroT?: string;
  /**
   * El N.º T con el que ingresó: el que tenía el transformador al crear la O.T. No cambia si después se lo
   * cambian, así se puede seguir el número de un transformador a otro.
   */
  numeroTIngreso?: string;
  uso?: Uso;
  placa?: Placa;
  /** Fecha de baja: el cliente deja de verlo y su código deja de funcionar en la consulta pública. */
  baja?: Date;
}

/** La orden con lo de su transformador: el cliente, los números, la descripción y la chapa. */
export function conTransformador(orden: EquipoTaller, trafo: Transformador | undefined): EquipoTaller {
  if (!trafo) return orden;
  return {
    ...orden,
    empresa: trafo.empresa,
    equipo: trafo.equipo || orden.equipo,
    serie: trafo.numero,
    numeroT: trafo.numeroT,
    uso: trafo.uso,
    placa: trafo.placa,
  };
}

/** Todo lo que maneja el panel del taller. Las cuentas solo las lee quien puede administrarlas. */
export interface Taller {
  empresas: Empresa[];
  transformadores: Transformador[];
  equipos: EquipoTaller[];
  cuentas: CuentaCliente[];
  personal: CuentaPersonal[];
  /** Días que puede llevar un equipo antes de que el panel avise (ver `demorasDe`). */
  avisos: LimitesAvisos;
}

/** El taller con un registro dado de baja en `baja`, o reactivado si `baja` es `undefined`. */
export function conBaja<T extends Omit<Taller, "avisos">>(taller: T, registro: Registro, id: string, baja: Date | undefined): T {
  switch (registro) {
    case "equipo":
      return { ...taller, equipos: taller.equipos.map((e) => (e.codigo === id ? { ...e, baja } : e)) };
    case "transformador":
      return { ...taller, transformadores: taller.transformadores.map((t) => (t.id === id ? { ...t, baja } : t)) };
    case "empresa":
      return { ...taller, empresas: taller.empresas.map((e) => (e.id === id ? { ...e, baja } : e)) };
    case "cuenta":
      return { ...taller, cuentas: taller.cuentas.map((c) => (c.uid === id ? { ...c, baja } : c)) };
    case "personal":
      return { ...taller, personal: taller.personal.map((p) => (p.uid === id ? { ...p, baja } : p)) };
  }
}

export const activos = <T extends { baja?: Date }>(registros: T[]) => registros.filter((r) => !r.baja);

/** Consulta de un cliente potencial desde la página pública. */
export interface ConsultaNueva {
  empresa: string;
  nombre: string;
  email: string;
  telefono?: string;
  localidad?: string;
  equipo?: string;
  descripcion: string;
}

/** Usuario con la sesión iniciada. */
export interface Sesion {
  uid: string;
  email: string;
  rol: Rol;
}
