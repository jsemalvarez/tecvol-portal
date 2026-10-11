/**
 * Datos de la placa de características (la chapa) de un transformador, tal como los carga el taller
 * al recibirlo. Los campos siguen la chapa de ejemplo que mandó el taller y su planilla de entrada;
 * la planilla todavía va a cambiar, así que todo es opcional salvo las fases al registrar.
 */

export const FASES = ["monofasico", "bifasico", "trifasico"] as const;
export type Fases = (typeof FASES)[number];

export const NOMBRE_FASES: Record<Fases, string> = {
  monofasico: "Monofásico",
  bifasico: "Bifásico",
  trifasico: "Trifásico",
};

/** Uso del transformador según la planilla del taller ("Tipo de servicio"). */
export const USOS = ["rural", "distribucion"] as const;
export type Uso = (typeof USOS)[number];

export const NOMBRE_USOS: Record<Uso, string> = {
  rural: "Rural",
  distribucion: "Distribución",
};

/** Puntos del conmutador sin tensión que lleva la planilla. */
export const PUNTOS_CONMUTADOR = 5;

/** Pasos habituales de un conmutador de cinco puntos: ±2 × 2,5 % alrededor de la tensión nominal. */
const PASOS_CONMUTADOR = [1.05, 1.025, 1, 0.975, 0.95];

/** El N.º de fabricación no va acá: se guarda en `serie`, que ya usan la búsqueda y el portal. */
export interface Placa {
  fabricante?: string;
  tipo?: string;
  /** Año de fabricación. */
  anio?: number;
  norma?: string;
  fases?: Fases;
  /** Potencia nominal, en kVA. */
  potencia?: number;
  /** Frecuencia, en Hz. */
  frecuencia?: number;
  servicio?: string;
  enfriamiento?: string;
  /** Tensión de cortocircuito (Ucc), en %. */
  tensionCortocircuito?: number;
  grupoConexion?: string;
  /** Tensiones nominales, en V. */
  tensionPrimaria?: number;
  tensionSecundaria?: number;
  /** Tensión de cada punto del conmutador sin tensión, en V; `null` si ese punto no figura. */
  conmutador?: (number | null)[];
  /** Aceite aislante, en litros. */
  aceite?: number;
  /** Masa total, en kg. */
  masa?: number;
  materialBobinados?: string;
}

/**
 * Lee un número escrito a mano: acepta coma o punto decimal ("4,05", "4.05"). Con `puntoDeMiles`, un
 * punto seguido de tres cifras se toma como separador de miles, como se escribe en Argentina:
 * "13.200" V es 13200 y "1.000" kVA es 1000. Devuelve `undefined` si el campo está vacío y `null` si
 * no se entiende.
 */
export function leerNumero(texto: string, puntoDeMiles = false): number | null | undefined {
  let limpio = texto.trim().replace(/\s/g, "");
  if (!limpio) return undefined;
  if (limpio.includes(",") && limpio.includes(".")) limpio = limpio.replace(/\./g, "").replace(",", ".");
  else if (limpio.includes(",")) limpio = limpio.replace(",", ".");
  else if (puntoDeMiles && /^\d{1,3}(\.\d{3})+$/.test(limpio)) limpio = limpio.replace(/\./g, "");
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : null;
}

/** Un número como se escribe en el campo: con coma decimal y sin separador de miles ("4,05", "13200"). */
export function numeroParaCampo(numero: number | null | undefined): string {
  return numero == null ? "" : String(numero).replace(".", ",");
}

/** Un número para leer, con coma decimal: "27,55". */
export function formatearNumero(numero: number, decimales = 2): string {
  return numero.toLocaleString("es-AR", { maximumFractionDigits: decimales, useGrouping: false });
}

/** Una tensión en kV, como la escribe el taller: 13200 → "13,2". */
export function formatearKV(voltios: number): string {
  return formatearNumero(voltios / 1000, 3);
}

/**
 * Intensidad nominal, en A, para la potencia en kVA y la tensión en V. En un trifásico la potencia
 * se reparte en tres fases: I = S / (√3 · U).
 */
export function intensidadNominal(potencia: number, tension: number, fases?: Fases): number {
  const divisor = fases === "trifasico" ? Math.sqrt(3) * tension : tension;
  return (potencia * 1000) / divisor;
}

/** Tensiones de los cinco puntos del conmutador con pasos de 2,5 %, redondeadas al voltio. */
export function conmutadorSugerido(tensionPrimaria: number): number[] {
  return PASOS_CONMUTADOR.map((paso) => Math.round(tensionPrimaria * paso));
}

/**
 * La descripción que ve cualquiera con el código: "Transformador trifásico 630 kVA · 13,2/0,4 kV".
 * Se arma con lo que haya de las fases, la potencia y las tensiones. `null` si no hay nada de eso.
 */
export function describirEquipo(placa: Placa | undefined): string | null {
  if (!placa || (!placa.fases && !placa.potencia)) return null;
  let texto = "Transformador";
  if (placa.fases) texto += ` ${NOMBRE_FASES[placa.fases].toLowerCase()}`;
  if (placa.potencia) texto += ` ${formatearNumero(placa.potencia)} kVA`;
  if (placa.tensionPrimaria && placa.tensionSecundaria) {
    texto += ` · ${formatearKV(placa.tensionPrimaria)}/${formatearKV(placa.tensionSecundaria)} kV`;
  } else if (placa.tensionPrimaria) {
    texto += ` · ${formatearKV(placa.tensionPrimaria)} kV`;
  }
  return texto;
}

/** Quita lo vacío; `undefined` si no queda ningún dato. Firestore no acepta valores `undefined`. */
export function placaSinVacios(placa: Placa): Placa | undefined {
  const limpia: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(placa)) {
    if (valor === undefined || valor === "") continue;
    if (Array.isArray(valor) && valor.every((v) => v == null)) continue;
    limpia[campo] = valor;
  }
  return Object.keys(limpia).length ? (limpia as Placa) : undefined;
}

const TEXTOS = ["fabricante", "tipo", "norma", "servicio", "enfriamiento", "grupoConexion", "materialBobinados"] as const;
const NUMEROS = [
  "anio",
  "potencia",
  "frecuencia",
  "tensionCortocircuito",
  "tensionPrimaria",
  "tensionSecundaria",
  "aceite",
  "masa",
] as const;

const esNumero = (valor: unknown): valor is number => typeof valor === "number" && Number.isFinite(valor) && valor >= 0;

/** Lee una placa guardada, descartando lo que no tenga la forma esperada. */
export function leerPlaca(valor: unknown): Placa | undefined {
  if (!valor || typeof valor !== "object") return undefined;
  const datos = valor as Record<string, unknown>;
  const placa: Placa = {};
  for (const campo of TEXTOS) {
    const texto = datos[campo];
    if (typeof texto === "string" && texto.trim()) placa[campo] = texto.trim();
  }
  for (const campo of NUMEROS) {
    if (esNumero(datos[campo])) placa[campo] = datos[campo];
  }
  if (typeof datos.fases === "string" && (FASES as readonly string[]).includes(datos.fases)) placa.fases = datos.fases as Fases;
  if (Array.isArray(datos.conmutador)) {
    placa.conmutador = datos.conmutador.slice(0, PUNTOS_CONMUTADOR).map((v) => (esNumero(v) ? v : null));
  }
  return placaSinVacios(placa);
}

export function esUso(valor: unknown): valor is Uso {
  return typeof valor === "string" && (USOS as readonly string[]).includes(valor);
}
