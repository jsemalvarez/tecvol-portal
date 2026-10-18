import type { EstadoReparacion } from "./estados";
import type { Placa, Uso } from "./placa";
import type { Rol, RolPersonal } from "./roles";

export type { Rol, RolPersonal } from "./roles";

/** Lo que se puede dar de baja en el panel. La baja es lógica: queda guardado con la fecha y se puede reactivar. */
export type Registro = "equipo" | "empresa" | "cuenta" | "personal";

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
  /** Fecha de baja: ya no aparece para registrar equipos. Antes hay que dar de baja sus cuentas. */
  baja?: Date;
}

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
 * Datos de un equipo que carga el personal: de qué empresa es, cómo se identifica y su chapa.
 * `equipo` es la descripción pública, que se arma con la chapa (ver `describirEquipo`).
 */
export interface DatosEquipo {
  empresa: string;
  equipo: string;
  referencia?: string;
  serie?: string;
  /** N.º de la orden de trabajo de Punto Técnico, con la que empieza el trabajo. Una orden puede tener varios equipos. */
  numeroOrden?: string;
  uso?: Uso;
  placa?: Placa;
}

/**
 * Los datos de un equipo con todos sus campos opcionales presentes, aunque estén vacíos: al mezclarlos
 * con los anteriores, lo que se vació en el formulario borra lo que había.
 */
export function conTodosLosCampos(datos: DatosEquipo): DatosEquipo {
  return {
    empresa: datos.empresa,
    equipo: datos.equipo,
    referencia: datos.referencia,
    serie: datos.serie,
    numeroOrden: datos.numeroOrden,
    uso: datos.uso,
    placa: datos.placa,
  };
}

/** Un equipo como lo ve el personal: el seguimiento, los datos privados, la empresa dueña y la chapa. */
export interface EquipoTaller extends EquipoCliente {
  empresa: string;
  numeroOrden?: string;
  uso?: Uso;
  placa?: Placa;
  /** Fecha de baja: el cliente deja de verlo y su código deja de funcionar en la consulta pública. */
  baja?: Date;
}

/** Todo lo que maneja el panel del taller. Las cuentas solo las lee quien puede administrarlas. */
export interface Taller {
  empresas: Empresa[];
  equipos: EquipoTaller[];
  cuentas: CuentaCliente[];
  personal: CuentaPersonal[];
}

/** El taller con un registro dado de baja en `baja`, o reactivado si `baja` es `undefined`. */
export function conBaja<T extends Taller>(taller: T, registro: Registro, id: string, baja: Date | undefined): T {
  switch (registro) {
    case "equipo":
      return { ...taller, equipos: taller.equipos.map((e) => (e.codigo === id ? { ...e, baja } : e)) };
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
