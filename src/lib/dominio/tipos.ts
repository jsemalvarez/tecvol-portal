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
