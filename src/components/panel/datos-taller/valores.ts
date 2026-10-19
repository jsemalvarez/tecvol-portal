import { BOBINAS, type Bobina, type DatosTaller, type IdBobina, type MaterialConductor } from "@/lib/dominio/datos-taller";
import { leerNumero, numeroParaCampo } from "@/lib/dominio/placa";

/** Lo que hay escrito en cada campo de una bobina, tal cual. */
export interface ValoresBobina {
  material: MaterialConductor | "";
  medida: string;
  espiras: string;
  peso: string;
}

/** Lo que hay escrito en el formulario de los datos del taller, tal cual. */
export interface ValoresDatosTaller {
  alta: ValoresBobina;
  baja: ValoresBobina;
  prespanMedidas: string;
  prespanPeso: string;
  derivaciones: string;
  notas: string;
}

/** Errores por campo, con claves como `alta.espiras` o `prespanPeso`. */
export type ErroresDatosTaller = Record<string, string>;

function valoresDeBobina(bobina: Bobina | undefined): ValoresBobina {
  return {
    material: bobina?.material ?? "",
    medida: bobina?.medida ?? "",
    espiras: numeroParaCampo(bobina?.espiras),
    peso: numeroParaCampo(bobina?.peso),
  };
}

export function valoresDeDatosTaller(datos: DatosTaller | null): ValoresDatosTaller {
  return {
    alta: valoresDeBobina(datos?.alta),
    baja: valoresDeBobina(datos?.baja),
    prespanMedidas: datos?.prespanMedidas ?? "",
    prespanPeso: numeroParaCampo(datos?.prespanPeso),
    derivaciones: numeroParaCampo(datos?.derivaciones),
    notas: datos?.notas ?? "",
  };
}

/**
 * Revisa que cada número se entienda y arma los datos. Las espiras y las derivaciones son enteras; los
 * pesos pueden tener decimales. Sin errores, `datos` está listo para guardar.
 */
export function leerValoresDatosTaller(valores: ValoresDatosTaller): { datos: DatosTaller; errores: ErroresDatosTaller } {
  const errores: ErroresDatosTaller = {};
  const peso = (clave: string, texto: string) => {
    const leido = leerNumero(texto, true);
    if (leido === null) errores[clave] = "Escriba solo el número, en kg. Por ejemplo: 62,5.";
    return leido ?? undefined;
  };
  const entero = (clave: string, texto: string, ejemplo: string) => {
    const leido = leerNumero(texto, true);
    if (leido === null || (leido !== undefined && !Number.isInteger(leido))) {
      errores[clave] = `Escriba un número entero. Por ejemplo: ${ejemplo}.`;
      return undefined;
    }
    return leido;
  };
  const bobina = (id: IdBobina): Bobina => {
    const v = valores[id];
    return {
      material: v.material || undefined,
      medida: v.medida.trim() || undefined,
      espiras: entero(`${id}.espiras`, v.espiras, id === "alta" ? "1650" : "29"),
      peso: peso(`${id}.peso`, v.peso),
    };
  };
  const [alta, baja] = BOBINAS.map((b) => bobina(b.id));
  return {
    datos: {
      alta,
      baja,
      prespanMedidas: valores.prespanMedidas.trim() || undefined,
      prespanPeso: peso("prespanPeso", valores.prespanPeso),
      derivaciones: entero("derivaciones", valores.derivaciones, "5"),
      notas: valores.notas.trim() || undefined,
    },
    errores,
  };
}
