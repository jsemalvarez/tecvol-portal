import type { EstadoReparacion } from "./estados";

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
  /** Número de serie de la placa de características. */
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

/** Datos de un equipo que carga el personal: de qué empresa es y cómo se identifica. */
export interface DatosEquipo {
  empresa: string;
  equipo: string;
  referencia?: string;
  serie?: string;
}

/** Un equipo como lo ve el personal: el seguimiento, los datos privados y la empresa dueña. */
export interface EquipoTaller extends EquipoCliente {
  empresa: string;
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
