import { doc, getDoc, Timestamp, type DocumentData } from "firebase/firestore";
import { ESTADOS, esEstado, type EstadoReparacion } from "@/lib/dominio/estados";
import type { SeguimientoPublico } from "@/lib/dominio/tipos";
import type { SeguimientoRepositorio } from "../repositorios";
import { obtenerFirestore } from "./app";

/** Convierte los datos de `seguimiento/{codigo}`; `null` si el estado no es válido. */
export function leerSeguimiento(codigo: string, datos: DocumentData): SeguimientoPublico | null {
  if (!esEstado(datos.estado)) return null;

  const etapas: Partial<Record<EstadoReparacion, Date>> = {};
  for (const estado of ESTADOS) {
    const valor = datos.etapas?.[estado];
    if (valor instanceof Timestamp) etapas[estado] = valor.toDate();
  }

  return {
    codigo,
    estado: datos.estado,
    equipo: typeof datos.equipo === "string" ? datos.equipo : "",
    etapas,
    actualizado: datos.actualizado instanceof Timestamp ? datos.actualizado.toDate() : null,
  };
}

/**
 * Lee `seguimiento/{codigo}`. Las reglas permiten `get` sin sesión pero no `list`,
 * así que la colección no se puede recorrer: solo se lee un código conocido.
 */
export class SeguimientoFirestore implements SeguimientoRepositorio {
  async obtenerPorCodigo(codigo: string): Promise<SeguimientoPublico | null> {
    const snap = await getDoc(doc(obtenerFirestore(), "seguimiento", codigo));
    return snap.exists() ? leerSeguimiento(codigo, snap.data()) : null;
  }
}
