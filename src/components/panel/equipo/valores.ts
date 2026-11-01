import {
  leerNumero,
  numeroParaCampo,
  placaSinVacios,
  PUNTOS_CONMUTADOR,
  type Fases,
  type Placa,
  type Uso,
} from "@/lib/dominio/placa";
import type { EquipoTaller, Transformador } from "@/lib/dominio/tipos";

/** Lo que hay escrito en cada campo de la orden de trabajo, tal cual. */
export interface ValoresOrden {
  empresa: string;
  nombreEmpresa: string;
  ingreso: string;
  numeroOrden: string;
  /** El N.º de O.T. es uno temporal (`TEMP-0001`): todavía no llegó el del sistema de gestión. */
  numeroOrdenTemporal: boolean;
  referencia: string;
  motivo: string;
}

/** Lo que hay escrito en cada campo del transformador y su chapa, tal cual. */
export interface Valores {
  numero: string;
  /** El N.º de trafo es uno temporal (`NT-0001`), porque no se ve en la chapa o no lo tiene. */
  provisorio: boolean;
  numeroT: string;
  uso: Uso | "";
  fabricante: string;
  tipo: string;
  anio: string;
  norma: string;
  fases: Fases | "";
  potencia: string;
  frecuencia: string;
  tensionCortocircuito: string;
  grupoConexion: string;
  servicio: string;
  enfriamiento: string;
  tensionPrimaria: string;
  tensionSecundaria: string;
  conmutador: string[];
  aceite: string;
  masa: string;
  materialBobinados: string;
}

export type Campo = Exclude<keyof Valores, "conmutador" | "provisorio">;

/** Errores por campo; los puntos del conmutador van como `conmutador0` a `conmutador4`. */
export type Errores = Partial<Record<Campo | `conmutador${number}`, string>>;

export type ErroresOrden = Partial<Record<keyof ValoresOrden, string>>;

type CampoNumerico = "anio" | "potencia" | "frecuencia" | "tensionCortocircuito" | "tensionPrimaria" | "tensionSecundaria" | "aceite" | "masa";

/** Cómo se lee cada número y qué ejemplo se muestra si no se entiende. */
const NUMEROS: Record<CampoNumerico, { puntoDeMiles: boolean; ejemplo: string }> = {
  anio: { puntoDeMiles: false, ejemplo: "2013" },
  potencia: { puntoDeMiles: true, ejemplo: "630" },
  frecuencia: { puntoDeMiles: true, ejemplo: "50" },
  tensionCortocircuito: { puntoDeMiles: false, ejemplo: "4,05" },
  tensionPrimaria: { puntoDeMiles: true, ejemplo: "13200" },
  tensionSecundaria: { puntoDeMiles: true, ejemplo: "400" },
  aceite: { puntoDeMiles: true, ejemplo: "485" },
  masa: { puntoDeMiles: true, ejemplo: "1960" },
};

const TEXTOS = ["fabricante", "tipo", "norma", "servicio", "enfriamiento", "grupoConexion", "materialBobinados"] as const;

export const NUEVA_EMPRESA = "__nueva";

/** Los valores iniciales de la orden: vacíos para una nueva o los guardados. */
export function valoresOrdenDe(equipo: EquipoTaller | undefined, hoy: string, empresaInicial: string): ValoresOrden {
  return {
    empresa: equipo?.empresa ?? empresaInicial,
    nombreEmpresa: "",
    ingreso: hoy,
    numeroOrden: equipo?.numeroOrden ?? "",
    numeroOrdenTemporal: !!equipo?.numeroOrdenTemporal,
    referencia: equipo?.referencia ?? "",
    motivo: equipo?.motivo ?? "",
  };
}

/** Los valores iniciales del transformador: vacíos para uno nuevo (con 50 Hz, la frecuencia de la red) o los guardados. */
export function valoresDe(trafo: Transformador | undefined): Valores {
  const placa = trafo?.placa ?? {};
  return {
    numero: trafo?.numero ?? "",
    provisorio: !!trafo?.provisorio,
    numeroT: trafo?.numeroT ?? "",
    uso: trafo?.uso ?? "",
    fabricante: placa.fabricante ?? "",
    tipo: placa.tipo ?? "",
    anio: numeroParaCampo(placa.anio),
    norma: placa.norma ?? "",
    fases: placa.fases ?? "",
    potencia: numeroParaCampo(placa.potencia),
    frecuencia: trafo ? numeroParaCampo(placa.frecuencia) : "50",
    tensionCortocircuito: numeroParaCampo(placa.tensionCortocircuito),
    grupoConexion: placa.grupoConexion ?? "",
    servicio: placa.servicio ?? "",
    enfriamiento: placa.enfriamiento ?? "",
    tensionPrimaria: numeroParaCampo(placa.tensionPrimaria),
    tensionSecundaria: numeroParaCampo(placa.tensionSecundaria),
    conmutador: Array.from({ length: PUNTOS_CONMUTADOR }, (_, i) => numeroParaCampo(placa.conmutador?.[i])),
    aceite: numeroParaCampo(placa.aceite),
    masa: numeroParaCampo(placa.masa),
    materialBobinados: placa.materialBobinados ?? "",
  };
}

/** La placa con lo que se entiende de cada campo, aunque haya errores: alimenta la vista previa. */
export function placaDe(valores: Valores): Placa {
  const placa: Placa = {};
  for (const campo of TEXTOS) {
    const texto = valores[campo].trim();
    if (texto) placa[campo] = texto;
  }
  for (const [campo, { puntoDeMiles }] of Object.entries(NUMEROS) as [CampoNumerico, (typeof NUMEROS)[CampoNumerico]][]) {
    const numero = leerNumero(valores[campo], puntoDeMiles);
    if (numero != null && numero > 0) placa[campo] = numero;
  }
  if (valores.fases) placa.fases = valores.fases;
  const conmutador = valores.conmutador.map((v) => {
    const numero = leerNumero(v, true);
    return numero != null && numero > 0 ? numero : null;
  });
  if (conmutador.some((v) => v != null)) placa.conmutador = conmutador;
  return placaSinVacios(placa) ?? {};
}

export const FALTA_NUMERO_ORDEN = "Escriba el N.º de O.T. Si todavía no lo tiene, use uno temporal.";

/**
 * Revisa la orden antes de guardar: el cliente, el N.º de O.T. (o uno temporal) y, al registrar, una fecha
 * de recepción de hoy o anterior.
 */
export function revisarOrden(valores: ValoresOrden, { nuevo, hoy }: { nuevo: boolean; hoy: string }): ErroresOrden {
  const errores: ErroresOrden = {};
  if (!valores.empresa) errores.empresa = "Elija el cliente dueño del transformador.";
  if (valores.empresa === NUEVA_EMPRESA && !valores.nombreEmpresa.trim()) errores.nombreEmpresa = "Escriba el nombre del cliente nuevo.";
  if (!valores.numeroOrden.trim()) errores.numeroOrden = FALTA_NUMERO_ORDEN;
  if (nuevo && (!/^\d{4}-\d{2}-\d{2}$/.test(valores.ingreso) || valores.ingreso > hoy)) {
    errores.ingreso = "Elija una fecha de recepción de hoy o anterior.";
  }
  return errores;
}

/**
 * Revisa el transformador antes de guardar: el N.º de trafo siempre; al darlo de alta, también las fases;
 * y que cada número de la chapa se entienda.
 */
export function revisar(valores: Valores, { nuevo, hoy }: { nuevo: boolean; hoy: string }): Errores {
  const errores: Errores = {};
  if (!valores.numero.trim()) errores.numero = "Escriba el N.º de trafo de la chapa. Si no se ve o no lo tiene, use uno temporal.";
  if (nuevo && !valores.fases) errores.fases = "Elija las fases que figuran en la chapa.";

  for (const [campo, { puntoDeMiles, ejemplo }] of Object.entries(NUMEROS) as [CampoNumerico, (typeof NUMEROS)[CampoNumerico]][]) {
    const numero = leerNumero(valores[campo], puntoDeMiles);
    if (numero === null || numero === 0) errores[campo] = `Escriba solo el número, sin la unidad. Por ejemplo: ${ejemplo}.`;
  }
  const anio = leerNumero(valores.anio);
  const esteAnio = Number(hoy.slice(0, 4));
  if (anio != null && (!Number.isInteger(anio) || anio < 1900 || anio > esteAnio)) {
    errores.anio = "Escriba el año de fabricación con cuatro cifras. Por ejemplo: 2013.";
  }
  valores.conmutador.forEach((v, i) => {
    const numero = leerNumero(v, true);
    if (numero === null || numero === 0) errores[`conmutador${i}`] = "Escriba solo el número. Por ejemplo: 13860.";
  });
  return errores;
}
