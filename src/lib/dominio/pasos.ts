import { datosTallerVacios, type DatosTaller } from "./datos-taller";
import { ESTADOS, indiceEstado, type EstadoReparacion } from "./estados";
import { fechaDeCampo, fechaParaCampo, formatearFecha } from "./fechas";
import { ITEMS_INSPECCION, paraCotizar, type Informe } from "./informe";
import { protocoloCompleto, type Celdas } from "./protocolo";
import type { EquipoTaller } from "./tipos";
import { nombreOrden, resumenChapa, trafoDeOrden } from "./trafo";

/**
 * La hoja de una orden de trabajo: todo lo de un ingreso al taller en una sola página, en siete pasos que
 * siguen el orden de carga. Cada paso se guarda por su cuenta.
 */
export const PASOS = [1, 2, 3, 4, 5, 6, 7] as const;

export type NumeroPaso = (typeof PASOS)[number];

export const esPaso = (valor: number): valor is NumeroPaso => (PASOS as readonly number[]).includes(valor);

/**
 * `completo`: tiene todos sus datos. `salteado`: la O.T. ya pasó esa etapa sin que se completaran; no frena nada,
 * pero tampoco cuenta como hecho. `bloqueado`: falta un dato sin el que no se puede cargar (sin orden no hay de quién
 * buscar el transformador; sin transformador no hay informe). `despues`: por el orden del taller va más adelante,
 * pero se puede cargar igual.
 */
export type SituacionPaso = "completo" | "salteado" | "bloqueado" | "siguiente" | "despues";

/** Lo que dice cómo va una orden. Sin `equipo`, todavía no se guardó el paso 1. */
export interface DatosHoja {
  equipo?: EquipoTaller;
  informe: Informe | null;
  datosTaller: DatosTaller | null;
  /** Las celdas del protocolo de ensayo. */
  protocolo: Celdas | null;
  /** Lo de los pasos 3, 5 y 6 todavía no se leyó: no se sabe si tienen datos. */
  sinLeer?: boolean;
}

export const TITULOS: Record<NumeroPaso, string> = {
  1: "Orden de trabajo",
  2: "Transformador",
  3: "Diagnóstico",
  4: "Presupuesto",
  5: "Reparación · datos del taller",
  6: "Ensayos finales",
  7: "Entrega",
};

const DESCRIPCIONES: Record<NumeroPaso, string> = {
  1: "Empresa, N.º de O.T., fecha y motivo del ingreso.",
  2: "Se busca entre los de la empresa o se da de alta con su chapa.",
  3: "Inspección visual, aislamiento y relación de transformación.",
  4: "Cuándo se envió y cuándo lo aprobó la empresa.",
  5: "Bobinas, prespan, derivaciones y materiales.",
  6: "Fecha de los ensayos y protocolo de ensayo eléctrico.",
  7: "Listo para la entrega y entregado, con su fecha.",
};

const VA_DESPUES: Partial<Record<NumeroPaso, string>> = {
  4: "Va después del diagnóstico",
  5: "Con el presupuesto aprobado",
  6: "Después de la reparación",
  7: "Después de los ensayos",
};

/** Por qué un paso bloqueado no se puede cargar. */
export function faltaPara(n: NumeroPaso): string {
  if (n === 2) return "Para buscar el transformador, primero guarde la orden en el paso 1: se busca entre los de la empresa.";
  if (n === 3) return "Para hacer el diagnóstico, primero cargue el transformador en el paso 2: el informe va con sus datos.";
  return "Primero cargue el transformador en el paso 2: sin él, la O.T. no avanza.";
}

export const faltaCorta = (n: NumeroPaso) => (n === 2 ? "Falta el paso 1" : "Falta el transformador");

/** La etapa que deja atrás a cada paso: si la O.T. ya llegó a ella, el paso quedó atrás, tenga o no sus datos. */
const ETAPA_POSTERIOR: Partial<Record<NumeroPaso, EstadoReparacion>> = { 3: "presupuesto", 4: "reparacion", 5: "ensayos", 6: "listo", 7: "entregado" };

/** El paso tiene todos sus datos cargados: el presupuesto, también aprobado; el diagnóstico, los datos del taller y el protocolo, enteros. */
export function pasoCompleto(n: NumeroPaso, { equipo, informe, datosTaller, protocolo }: DatosHoja): boolean {
  if (!equipo) return false;
  if (n === 1) return true;
  if (equipo.faltaTrafo) return false;
  switch (n) {
    case 2:
      return true;
    case 3:
      return !!informe && ITEMS_INSPECCION.every((item) => informe.inspeccion[item.id]);
    case 4:
      return !!equipo.etapas.reparacion;
    case 5:
      return !!datosTaller && datosCargados(datosTaller) === CAMPOS_TALLER;
    case 6:
      return !!equipo.etapas.ensayos && !!protocolo && protocoloCompleto(protocolo);
    case 7:
      return equipo.estado === "entregado";
  }
}

/** La O.T. ya pasó la etapa de este paso sin que se completaran sus datos. */
export function pasoSalteado(n: NumeroPaso, datos: DatosHoja): boolean {
  const { equipo, sinLeer } = datos;
  const posterior = ETAPA_POSTERIOR[n];
  if (!equipo || equipo.faltaTrafo || !posterior || pasoCompleto(n, datos)) return false;
  if (sinLeer && (n === 3 || n === 5 || n === 6)) return false;
  return indiceEstado(equipo.estado) >= indiceEstado(posterior);
}

/** Cómo se nombra un paso que quedó atrás sin completar, según tenga algo cargado o nada. */
export function rotuloSalteado(n: NumeroPaso, { equipo, informe, datosTaller, protocolo }: DatosHoja) {
  const algo =
    (n === 3 && paraCotizar(informe?.inspeccion ?? {}).revisados > 0) ||
    (n === 4 && !!equipo?.etapas.presupuesto) ||
    (n === 5 && !!datosTaller && !datosTallerVacios(datosTaller)) ||
    (n === 6 && (!!equipo?.etapas.ensayos || !!protocolo));
  return algo ? "A medias" : "Sin cargar";
}

export function situacionPaso(n: NumeroPaso, datos: DatosHoja): SituacionPaso {
  if (pasoCompleto(n, datos)) return "completo";
  if (pasoSalteado(n, datos)) return "salteado";
  if (n === 2 && !datos.equipo) return "bloqueado";
  if (n >= 3 && (!datos.equipo || datos.equipo.faltaTrafo)) return "bloqueado";
  const anterior = (n - 1) as NumeroPaso;
  if (n === 1 || pasoCompleto(anterior, datos) || pasoSalteado(anterior, datos)) return "siguiente";
  return "despues";
}

/** El primer paso que queda por hacer después de `desde`, o `null` si no queda ninguno. Los salteados ya quedaron atrás. */
export function proximoPaso(datos: DatosHoja, desde = 0): NumeroPaso | null {
  return PASOS.find((n) => n > desde && !pasoCompleto(n, datos) && !pasoSalteado(n, datos)) ?? null;
}

const CAMPOS_TALLER = 11;

function datosCargados(d: DatosTaller) {
  const valores = [d.alta, d.baja].flatMap((b) => [b.material, b.medida, b.espiras, b.peso]);
  return [...valores, d.prespanMedidas, d.prespanPeso, d.derivaciones].filter((v) => v !== undefined && v !== "").length;
}

/** Lo que tiene cargado un paso, para verlo sin abrirlo. `null` si no tiene nada. */
function resumenPaso(n: NumeroPaso, { equipo, informe, datosTaller, protocolo }: DatosHoja, empresa: string): string | null {
  if (!equipo) return null;
  const { etapas } = equipo;
  const desde = (fecha: Date | undefined) => (fecha ? formatearFecha(fecha) : "");
  switch (n) {
    case 1:
      return [
        empresa || "Sin empresa",
        `${nombreOrden(equipo)}${equipo.numeroOrdenTemporal ? " (temporal)" : ""}`,
        etapas.ingresado ? `ingresó el ${desde(etapas.ingresado)}` : "",
        equipo.compromiso ? `compromiso ${desde(equipo.compromiso)}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
    case 2:
      return equipo.faltaTrafo ? null : `${trafoDeOrden(equipo)} · ${resumenChapa(equipo)}`;
    case 3: {
      const { revisados, sinRevisar, grupos } = paraCotizar(informe?.inspeccion ?? {});
      if (!revisados && !etapas.diagnostico) return null;
      const partes = grupos.map((g) => `${g.titulo}: ${g.items.join(", ")}`);
      if (!partes.length) partes.push(revisados ? "Todo lo revisado está OK" : "Sin ítems revisados");
      if (revisados && sinRevisar) partes.push(sinRevisar === 1 ? "1 sin revisar" : `${sinRevisar} sin revisar`);
      if (etapas.diagnostico) partes.push(`desde el ${desde(etapas.diagnostico)}`);
      return partes.join(" · ");
    }
    case 4:
      if (etapas.presupuesto && etapas.reparacion) return `Enviado el ${desde(etapas.presupuesto)} · aprobado el ${desde(etapas.reparacion)}`;
      if (etapas.presupuesto) return `Enviado el ${desde(etapas.presupuesto)} · falta la aprobación`;
      if (etapas.reparacion) return `Aprobado el ${desde(etapas.reparacion)}`;
      return null;
    case 5: {
      const cargados = datosTaller ? datosCargados(datosTaller) : 0;
      if (cargados === CAMPOS_TALLER) return "Bobinas, prespan y derivaciones cargados";
      if (cargados) return `Cargado a medias: ${cargados} de ${CAMPOS_TALLER} datos`;
      if (datosTaller && !datosTallerVacios(datosTaller)) return "Con notas cargadas";
      return null;
    }
    case 6: {
      const partes = etapas.ensayos ? [`En ensayos desde el ${desde(etapas.ensayos)}`] : [];
      if (protocolo) partes.push(protocoloCompleto(protocolo) ? "Protocolo cargado" : "Protocolo a medias");
      return partes.join(" · ") || null;
    }
    case 7:
      if (etapas.entregado) return `Entregado el ${desde(etapas.entregado)} · O.T. cerrada`;
      return etapas.listo ? `Listo para la entrega desde el ${desde(etapas.listo)}` : null;
  }
}

/** Debajo del título de cada paso: lo que tiene cargado o, si no tiene nada, de qué se trata. */
export function textoPaso(n: NumeroPaso, datos: DatosHoja, empresa: string): { texto: string; cargado: boolean } {
  const situacion = situacionPaso(n, datos);
  if (situacion === "bloqueado") return { texto: n === 2 ? "Necesita la orden del paso 1" : "Necesita el transformador del paso 2", cargado: false };
  const resumen = resumenPaso(n, datos, empresa);
  if (resumen) return { texto: resumen, cargado: true };
  return { texto: (situacion === "despues" && VA_DESPUES[n]) || DESCRIPCIONES[n], cargado: false };
}

/** Cómo se nombra cada fecha en los mensajes: "fecha de la aprobación". */
const FECHA_DE: Record<EstadoReparacion, string> = {
  ingresado: "de la recepción",
  diagnostico: "del diagnóstico",
  presupuesto: "del envío del presupuesto",
  reparacion: "de la aprobación",
  ensayos: "de los ensayos",
  listo: "de listo para la entrega",
  entregado: "de la entrega",
};

/** Lo escrito en las fechas de un paso, tal cual. */
export type ValoresFechas = Partial<Record<EstadoReparacion, string>>;

export type ErroresFechas = Partial<Record<EstadoReparacion, string>>;

const diaLegible = (dia: string) => formatearFecha(fechaDeCampo(dia)!);

/**
 * Revisa las fechas de un paso contra las de los demás: ninguna posterior a hoy y todas en el orden del
 * taller. Se comparan días, no horas: dos etapas pueden empezar el mismo día.
 */
export function erroresDeFechas(valores: ValoresFechas, guardadas: Partial<Record<EstadoReparacion, Date>>, hoy: string): ErroresFechas {
  const dias = ESTADOS.map((etapa) => {
    if (etapa in valores) return valores[etapa] ?? "";
    const guardada = guardadas[etapa];
    return guardada ? fechaParaCampo(guardada) : "";
  });
  const errores: ErroresFechas = {};
  ESTADOS.forEach((etapa, i) => {
    const dia = dias[i];
    if (!(etapa in valores) || !dia) return;
    if (dia > hoy) {
      errores[etapa] = "No puede ser posterior a hoy.";
      return;
    }
    const antes = dias.slice(0, i).findLastIndex(Boolean);
    if (antes >= 0 && dia < dias[antes]) {
      errores[etapa] = `No puede ser anterior al ${diaLegible(dias[antes])}, fecha ${FECHA_DE[ESTADOS[antes]]}.`;
      return;
    }
    const despues = dias.findIndex((d, j) => j > i && d);
    if (despues >= 0 && dia > dias[despues]) {
      errores[etapa] = `No puede ser posterior al ${diaLegible(dias[despues])}, fecha ${FECHA_DE[ESTADOS[despues]]}.`;
    }
  });
  return errores;
}

/**
 * Las etapas con las fechas de un paso: una sin tocar se guarda tal cual, con su hora; una nueva, al mediodía
 * de ese día; una que se vació, se borra.
 */
export function etapasConFechas(guardadas: Partial<Record<EstadoReparacion, Date>>, valores: ValoresFechas): Partial<Record<EstadoReparacion, Date>> {
  const nuevas = { ...guardadas };
  for (const etapa of ESTADOS) {
    if (!(etapa in valores)) continue;
    const dia = valores[etapa] ?? "";
    const guardada = guardadas[etapa];
    const fecha = fechaDeCampo(dia);
    if (!fecha) delete nuevas[etapa];
    else if (!guardada || fechaParaCampo(guardada) !== dia) nuevas[etapa] = fecha;
  }
  return nuevas;
}
