import {
  leerNumero,
  numeroParaCampo,
  placaSinVacios,
  PUNTOS_CONMUTADOR,
  type Fases,
  type Placa,
  type Uso,
} from "@/lib/dominio/placa";
import type { EquipoTaller } from "@/lib/dominio/tipos";

/** Lo que hay escrito en cada campo del formulario, tal cual. */
export interface Valores {
  empresa: string;
  nombreEmpresa: string;
  ingreso: string;
  numeroOrden: string;
  numeroTrafo: string;
  referencia: string;
  uso: Uso | "";
  fabricante: string;
  tipo: string;
  serie: string;
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

export type Campo = Exclude<keyof Valores, "conmutador">;

/** Errores por campo; los puntos del conmutador van como `conmutador0` a `conmutador4`. */
export type Errores = Partial<Record<Campo | `conmutador${number}`, string>>;

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

/** Los valores iniciales: vacíos para un equipo nuevo (con 50 Hz, la frecuencia de la red) o los guardados. */
export function valoresDe(equipo: EquipoTaller | undefined, hoy: string, empresaInicial: string): Valores {
  const placa = equipo?.placa ?? {};
  return {
    empresa: equipo?.empresa ?? empresaInicial,
    nombreEmpresa: "",
    ingreso: hoy,
    numeroOrden: equipo?.numeroOrden ?? "",
    numeroTrafo: equipo?.numeroTrafo ?? "",
    referencia: equipo?.referencia ?? "",
    uso: equipo?.uso ?? "",
    fabricante: placa.fabricante ?? "",
    tipo: placa.tipo ?? "",
    serie: equipo?.serie ?? "",
    anio: numeroParaCampo(placa.anio),
    norma: placa.norma ?? "",
    fases: placa.fases ?? "",
    potencia: numeroParaCampo(placa.potencia),
    frecuencia: equipo ? numeroParaCampo(placa.frecuencia) : "50",
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

/**
 * Revisa los valores antes de guardar: lo obligatorio (el cliente siempre; al registrar, también la
 * fecha y las fases; el N.º de orden, con `ordenObligatoria`) y que cada número se entienda.
 */
export function revisar(
  valores: Valores,
  { nuevo, hoy, ordenObligatoria }: { nuevo: boolean; hoy: string; ordenObligatoria: boolean },
): Errores {
  const errores: Errores = {};
  if (ordenObligatoria && !valores.numeroOrden.trim()) errores.numeroOrden = "Escriba el N.º de orden de Punto Técnico.";
  if (!valores.empresa) errores.empresa = "Elija el cliente dueño del equipo.";
  if (valores.empresa === NUEVA_EMPRESA && !valores.nombreEmpresa.trim()) errores.nombreEmpresa = "Escriba el nombre del cliente nuevo.";
  if (nuevo && (!/^\d{4}-\d{2}-\d{2}$/.test(valores.ingreso) || valores.ingreso > hoy)) {
    errores.ingreso = "Elija una fecha de recepción de hoy o anterior.";
  }
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
