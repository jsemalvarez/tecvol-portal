import { indiceEstado } from "./estados";
import { fechaDeCampo, fechaParaCampo } from "./fechas";
import type { EquipoTaller } from "./tipos";

/**
 * Avisos para llevar el orden de los trabajos: cuántos días lleva cada equipo en el taller desde que
 * ingresó, y cuántos desde que se aprobó el presupuesto (el inicio de "Reparación"). Pasado el límite,
 * el panel lo marca. Los límites los ajusta un administrador; los avisos se ven solo en el panel.
 */
export interface LimitesAvisos {
  /** Días en el taller, desde el ingreso, mientras se trabaja (hasta "Listo"). */
  ingreso: number;
  /** Días desde la aprobación del presupuesto, en "Reparación" o "Ensayos finales". */
  aprobacion: number;
}

export const LIMITES_POR_DEFECTO: LimitesAvisos = { ingreso: 30, aprobacion: 15 };

export const LIMITE_MAXIMO = 365;

export const esLimite = (valor: unknown): valor is number =>
  typeof valor === "number" && Number.isInteger(valor) && valor >= 1 && valor <= LIMITE_MAXIMO;

/** Lee los límites guardados; lo que falte o no sirva, por defecto. */
export function leerLimites(valor: unknown): LimitesAvisos {
  const datos = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  return {
    ingreso: esLimite(datos.ingreso) ? datos.ingreso : LIMITES_POR_DEFECTO.ingreso,
    aprobacion: esLimite(datos.aprobacion) ? datos.aprobacion : LIMITES_POR_DEFECTO.aprobacion,
  };
}

/** Días de calendario entre dos fechas, en la hora de Argentina: lo que ingresó ayer lleva 1 día. */
export function diasEntre(desde: Date, hasta: Date): number {
  const a = fechaDeCampo(fechaParaCampo(desde));
  const b = fechaDeCampo(fechaParaCampo(hasta));
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

export interface Demora {
  dias: number;
  limite: number;
  /** Pasó el límite: hay que mirarlo. */
  vencida: boolean;
}

export interface Demoras {
  ingreso?: Demora;
  aprobacion?: Demora;
}

const demora = (desde: Date, limite: number, hoy: Date): Demora => {
  const dias = diasEntre(desde, hoy);
  return { dias, limite, vencida: dias > limite };
};

/**
 * Cuánto lleva un equipo, para ordenar los trabajos. Un equipo listo, entregado o dado de baja ya no se
 * trabaja: no tiene demoras.
 */
export function demorasDe(equipo: EquipoTaller, limites: LimitesAvisos, hoy: Date): Demoras {
  if (equipo.baja || indiceEstado(equipo.estado) >= indiceEstado("listo")) return {};
  const demoras: Demoras = {};
  if (equipo.etapas.ingresado) demoras.ingreso = demora(equipo.etapas.ingresado, limites.ingreso, hoy);
  if ((equipo.estado === "reparacion" || equipo.estado === "ensayos") && equipo.etapas.reparacion) {
    demoras.aprobacion = demora(equipo.etapas.reparacion, limites.aprobacion, hoy);
  }
  return demoras;
}

export function conAviso(equipo: EquipoTaller, limites: LimitesAvisos, hoy: Date): boolean {
  const { ingreso, aprobacion } = demorasDe(equipo, limites, hoy);
  return !!ingreso?.vencida || !!aprobacion?.vencida;
}
