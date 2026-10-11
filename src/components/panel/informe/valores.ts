import {
  FASES_RELACION,
  ITEMS_INSPECCION,
  MEDICIONES_AISLAMIENTO,
  PUNTOS_RELACION,
  type AccionItem,
  type EstadoItem,
  type IdItem,
  type Informe,
} from "@/lib/dominio/informe";
import { leerNumero, numeroParaCampo } from "@/lib/dominio/placa";

/** Lo que hay escrito en el informe, tal cual. */
export interface ValoresInforme {
  inspeccion: Record<IdItem, { estado: EstadoItem | ""; accion: AccionItem | ""; comentario: string }>;
  aislamiento: Record<"mtBt" | "mtCuba" | "btCuba" | "indiceAbsorcion", string>;
  relacion: { u: string; v: string; w: string; comentario: string }[];
}

/** Errores por campo, con claves como `aislamiento.mtBt` o `relacion.2.v`. */
export type ErroresInforme = Record<string, string>;

export function valoresDeInforme(informe: Informe | null): ValoresInforme {
  return {
    inspeccion: Object.fromEntries(
      ITEMS_INSPECCION.map((item) => {
        const guardado = informe?.inspeccion[item.id];
        return [item.id, { estado: guardado?.estado ?? "", accion: guardado?.accion ?? "", comentario: guardado?.comentario ?? "" }];
      }),
    ) as ValoresInforme["inspeccion"],
    aislamiento: {
      mtBt: numeroParaCampo(informe?.aislamiento.mtBt),
      mtCuba: numeroParaCampo(informe?.aislamiento.mtCuba),
      btCuba: numeroParaCampo(informe?.aislamiento.btCuba),
      indiceAbsorcion: numeroParaCampo(informe?.aislamiento.indiceAbsorcion),
    },
    relacion: Array.from({ length: PUNTOS_RELACION }, (_, i) => {
      const punto = informe?.relacion[i];
      return {
        u: numeroParaCampo(punto?.u),
        v: numeroParaCampo(punto?.v),
        w: numeroParaCampo(punto?.w),
        comentario: punto?.comentario ?? "",
      };
    }),
  };
}

/** Los MΩ se escriben con punto de miles ("1.500"); la relación y el índice, con decimales. */
const MEGAOHM = { puntoDeMiles: true, ejemplo: "1500" };
const RELACION = { puntoDeMiles: false, ejemplo: "57,16" };

/** Revisa que cada número se entienda y arma el informe. Sin errores, `informe` está listo para guardar. */
export function leerValoresInforme(valores: ValoresInforme): { informe: Informe; errores: ErroresInforme } {
  const errores: ErroresInforme = {};
  const numero = (clave: string, texto: string, { puntoDeMiles, ejemplo }: { puntoDeMiles: boolean; ejemplo: string }) => {
    const leido = leerNumero(texto, puntoDeMiles);
    if (leido === null) errores[clave] = `Escriba solo el número, sin la unidad. Por ejemplo: ${ejemplo}.`;
    return leido ?? undefined;
  };

  const inspeccion: Informe["inspeccion"] = {};
  for (const item of ITEMS_INSPECCION) {
    const { estado, accion, comentario } = valores.inspeccion[item.id];
    if (!estado) continue;
    inspeccion[item.id] = { estado, accion: accion || undefined, comentario: comentario.trim() || undefined };
  }

  const aislamiento: Informe["aislamiento"] = {};
  for (const medicion of MEDICIONES_AISLAMIENTO) {
    aislamiento[medicion.id] = numero(`aislamiento.${medicion.id}`, valores.aislamiento[medicion.id], MEGAOHM);
  }
  aislamiento.indiceAbsorcion = numero("aislamiento.indiceAbsorcion", valores.aislamiento.indiceAbsorcion, { puntoDeMiles: false, ejemplo: "1,6" });

  const relacion = valores.relacion.map((punto, i) => {
    const medido: Record<string, number | undefined> = {};
    for (const fase of FASES_RELACION) medido[fase] = numero(`relacion.${i}.${fase}`, punto[fase], RELACION);
    return { ...medido, comentario: punto.comentario.trim() || undefined };
  });

  return { informe: { inspeccion, aislamiento, relacion }, errores };
}
