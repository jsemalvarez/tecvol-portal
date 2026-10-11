/**
 * Informe de diagnóstico de un equipo: lo que el taller anota después de desarmarlo, según la
 * "Plantilla de entrada y registro de taller" (inspección visual, resistencia de aislamiento y
 * relación de transformación). Es solo para el taller: lo usa quien cotiza. La planilla es un
 * ejemplo y va a cambiar, así que los ítems se definen acá, en un solo lugar.
 */

export const ESTADOS_ITEM = ["ok", "regular", "mal"] as const;
export type EstadoItem = (typeof ESTADOS_ITEM)[number];

export const NOMBRE_ESTADO_ITEM: Record<EstadoItem, string> = { ok: "OK", regular: "Regular", mal: "Mal" };

export const ACCIONES_ITEM = ["reparar", "cambiar"] as const;
export type AccionItem = (typeof ACCIONES_ITEM)[number];

export const NOMBRE_ACCION_ITEM: Record<AccionItem, string> = { reparar: "Reparar", cambiar: "Cambiar" };

/** Ítems de la inspección visual, en el orden de la planilla. En la planilla, el conmutador no lleva acción. */
export const ITEMS_INSPECCION = [
  { id: "cuba", nombre: "Cuba", conAccion: true },
  { id: "tapa", nombre: "Tapa y pernos", conAccion: true },
  { id: "radiadores", nombre: "Radiadores", conAccion: true },
  { id: "conmutador", nombre: "Conmutador", conAccion: false },
  { id: "aisladoresMT", nombre: "Aisladores MT", conAccion: true },
  { id: "aisladoresBT", nombre: "Aisladores BT", conAccion: true },
  { id: "buchholz", nombre: "Relé Buchholz", conAccion: true },
  { id: "termometros", nombre: "Termómetros", conAccion: true },
  { id: "puestaTierra", nombre: "Puesta a tierra", conAccion: true },
  { id: "cancamos", nombre: "Cáncamos", conAccion: true },
  { id: "ruedas", nombre: "Ruedas", conAccion: true },
] as const;

export type IdItem = (typeof ITEMS_INSPECCION)[number]["id"];

export interface ItemInspeccion {
  estado: EstadoItem;
  /** Solo si el estado es Regular o Mal. */
  accion?: AccionItem;
  comentario?: string;
}

/** Resistencia de aislamiento, en MΩ, y el índice de absorción (sin unidad). */
export const MEDICIONES_AISLAMIENTO = [
  { id: "mtBt", nombre: "MT-BT" },
  { id: "mtCuba", nombre: "MT-Cuba" },
  { id: "btCuba", nombre: "BT-Cuba" },
] as const;

export type IdAislamiento = (typeof MEDICIONES_AISLAMIENTO)[number]["id"];

export interface Aislamiento {
  mtBt?: number;
  mtCuba?: number;
  btCuba?: number;
  indiceAbsorcion?: number;
}

export const FASES_RELACION = ["u", "v", "w"] as const;
export type FaseRelacion = (typeof FASES_RELACION)[number];

/** Relación de transformación medida en un punto del conmutador, por fase, con su comentario. */
export interface PuntoRelacion {
  u?: number;
  v?: number;
  w?: number;
  comentario?: string;
}

/** Puntos de la relación de transformación que lleva la planilla. */
export const PUNTOS_RELACION = 5;

export interface Informe {
  inspeccion: Partial<Record<IdItem, ItemInspeccion>>;
  aislamiento: Aislamiento;
  /** Un elemento por punto, del 1 al 5; `null` si ese punto no se midió. */
  relacion: (PuntoRelacion | null)[];
}

/** Quién guardó el informe por última vez y cuándo. Lo pone el sistema, no el formulario. */
export interface InformeGuardado extends Informe {
  actualizado: Date | null;
  por?: string;
}

const esNumero = (valor: unknown): valor is number => typeof valor === "number" && Number.isFinite(valor) && valor >= 0;
const texto = (valor: unknown) => (typeof valor === "string" && valor.trim() ? valor.trim() : undefined);

function sinVacios<T extends object>(objeto: T): T {
  return Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined && v !== "")) as T;
}

/**
 * El informe listo para guardar: sin campos vacíos (Firestore no acepta `undefined`) y sin acción en
 * los ítems que están bien.
 */
export function informeParaGuardar(informe: Informe): Informe {
  const inspeccion: Informe["inspeccion"] = {};
  for (const item of ITEMS_INSPECCION) {
    const valor = informe.inspeccion[item.id];
    if (!valor) continue;
    inspeccion[item.id] = sinVacios({
      estado: valor.estado,
      accion: valor.estado !== "ok" && item.conAccion ? valor.accion : undefined,
      comentario: valor.comentario?.trim() || undefined,
    });
  }
  const relacion = informe.relacion.map((punto) => {
    if (!punto) return null;
    const limpio = sinVacios({ ...punto, comentario: punto.comentario?.trim() || undefined });
    return Object.keys(limpio).length ? limpio : null;
  });
  return { inspeccion, aislamiento: sinVacios(informe.aislamiento), relacion };
}

/** Lee un informe guardado, descartando lo que no tenga la forma esperada. */
export function leerInforme(valor: unknown): Informe {
  const datos = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  const inspeccion: Informe["inspeccion"] = {};
  const guardada = (datos.inspeccion && typeof datos.inspeccion === "object" ? datos.inspeccion : {}) as Record<string, unknown>;
  for (const item of ITEMS_INSPECCION) {
    const v = guardada[item.id] as Record<string, unknown> | undefined;
    if (!v || !(ESTADOS_ITEM as readonly unknown[]).includes(v.estado)) continue;
    inspeccion[item.id] = sinVacios({
      estado: v.estado as EstadoItem,
      accion: (ACCIONES_ITEM as readonly unknown[]).includes(v.accion) ? (v.accion as AccionItem) : undefined,
      comentario: texto(v.comentario),
    });
  }
  const a = (datos.aislamiento && typeof datos.aislamiento === "object" ? datos.aislamiento : {}) as Record<string, unknown>;
  const aislamiento = sinVacios({
    mtBt: esNumero(a.mtBt) ? a.mtBt : undefined,
    mtCuba: esNumero(a.mtCuba) ? a.mtCuba : undefined,
    btCuba: esNumero(a.btCuba) ? a.btCuba : undefined,
    indiceAbsorcion: esNumero(a.indiceAbsorcion) ? a.indiceAbsorcion : undefined,
  });
  const puntos = Array.isArray(datos.relacion) ? datos.relacion : [];
  const relacion = Array.from({ length: PUNTOS_RELACION }, (_, i) => {
    const p = puntos[i] as Record<string, unknown> | null | undefined;
    if (!p || typeof p !== "object") return null;
    const punto = sinVacios({
      u: esNumero(p.u) ? p.u : undefined,
      v: esNumero(p.v) ? p.v : undefined,
      w: esNumero(p.w) ? p.w : undefined,
      comentario: texto(p.comentario),
    });
    return Object.keys(punto).length ? punto : null;
  });
  return { inspeccion, aislamiento, relacion };
}
