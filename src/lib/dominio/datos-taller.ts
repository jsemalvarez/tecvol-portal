/**
 * Datos del taller de una reparación: lo que anota el jefe de taller y no va en el informe. Hoy, el
 * bobinado (alambre, espiras y peso de cada bobina), el aislamiento de prespan, las derivaciones y los
 * materiales; si se suman otros datos del taller, van acá. Es solo para el personal: el cliente no lo ve.
 * Se guarda por reparación, así el historial del trafo muestra con qué se trabajó cada vez y un reingreso
 * puede partir de lo anterior.
 */

export const MATERIALES_CONDUCTOR = ["cobre", "aluminio"] as const;
export type MaterialConductor = (typeof MATERIALES_CONDUCTOR)[number];

export const NOMBRE_MATERIAL: Record<MaterialConductor, string> = { cobre: "Cobre", aluminio: "Aluminio" };

export const BOBINAS = [
  { id: "alta", nombre: "Bobina de alta" },
  { id: "baja", nombre: "Bobina de baja" },
] as const;

export type IdBobina = (typeof BOBINAS)[number]["id"];

export interface Bobina {
  material?: MaterialConductor;
  /** Medida del alambre o de la planchuela, como la escribe el taller: "1,25 mm", "3 × 8 mm". */
  medida?: string;
  espiras?: number;
  /** Peso del conductor de la bobina, en kg. */
  peso?: number;
}

export interface DatosTaller {
  alta: Bobina;
  baja: Bobina;
  /** Medidas del prespan del aislamiento, como las escribe el taller. */
  prespanMedidas?: string;
  /** Peso del prespan, en kg. */
  prespanPeso?: number;
  /** Cantidad de derivaciones. */
  derivaciones?: number;
  /** Materiales (aisladores, conmutador…) y lo que no tenga un campo propio. */
  notas?: string;
}

/** Quién guardó los datos por última vez y cuándo. Lo pone el sistema, no el formulario. */
export interface DatosTallerGuardados extends DatosTaller {
  actualizado: Date | null;
  por?: string;
}

const esNumero = (valor: unknown): valor is number => typeof valor === "number" && Number.isFinite(valor) && valor >= 0;
const texto = (valor: unknown) => (typeof valor === "string" && valor.trim() ? valor.trim() : undefined);

function sinVacios<T extends object>(objeto: T): T {
  return Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined && v !== "")) as T;
}

function leerBobina(valor: unknown): Bobina {
  const b = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  return sinVacios({
    material: (MATERIALES_CONDUCTOR as readonly unknown[]).includes(b.material) ? (b.material as MaterialConductor) : undefined,
    medida: texto(b.medida),
    espiras: esNumero(b.espiras) ? b.espiras : undefined,
    peso: esNumero(b.peso) ? b.peso : undefined,
  });
}

/** Los datos listos para guardar: sin campos vacíos, que Firestore no acepta. */
export function datosTallerParaGuardar(datos: DatosTaller): DatosTaller {
  return sinVacios({
    ...datos,
    alta: sinVacios(datos.alta),
    baja: sinVacios(datos.baja),
    prespanMedidas: datos.prespanMedidas?.trim() || undefined,
    notas: datos.notas?.trim() || undefined,
  });
}

/** Lee los datos guardados, descartando lo que no tenga la forma esperada. */
export function leerDatosTaller(valor: unknown): DatosTaller {
  const datos = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  return sinVacios({
    alta: leerBobina(datos.alta),
    baja: leerBobina(datos.baja),
    prespanMedidas: texto(datos.prespanMedidas),
    prespanPeso: esNumero(datos.prespanPeso) ? datos.prespanPeso : undefined,
    derivaciones: esNumero(datos.derivaciones) ? datos.derivaciones : undefined,
    notas: texto(datos.notas),
  });
}

/** Si no tiene ningún dato cargado. */
export function datosTallerVacios(datos: DatosTaller): boolean {
  const { alta, baja, ...resto } = datosTallerParaGuardar(datos);
  return !Object.keys(alta).length && !Object.keys(baja).length && !Object.keys(resto).length;
}
