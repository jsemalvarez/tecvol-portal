import type { EstadoReparacion } from "./estados";
import type { Placa, Uso } from "./placa";

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
}

/** Cuenta de cliente asociada a una empresa (`clientes/{uid}`). */
export interface CuentaCliente {
  uid: string;
  email: string;
  empresa: string;
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
  /** N.º de la orden de trabajo en papel, escrito a mano por el taller. */
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
}

/** Todo lo que maneja el panel del taller. */
export interface Taller {
  empresas: Empresa[];
  equipos: EquipoTaller[];
  cuentas: CuentaCliente[];
}

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

/** Quién ingresa: el cliente va al portal; el personal del taller, al panel. */
export type Rol = "cliente" | "personal";

/** Usuario con la sesión iniciada. */
export interface Sesion {
  uid: string;
  email: string;
  rol: Rol;
}
