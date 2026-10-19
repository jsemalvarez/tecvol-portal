import { activos, type EquipoTaller } from "./tipos";

/**
 * Un número escrito a mano, para comparar: "ot 1234", "OT-1234" y "OT1234" son el mismo. Sin
 * mayúsculas, espacios ni signos.
 */
export const normalizarNumero = (numero: string) => numero.toUpperCase().replace(/[^0-9A-Z]/g, "");

const ingresoDe = (equipo: EquipoTaller) => equipo.etapas.ingresado?.getTime() ?? 0;

/**
 * Historial de un transformador: las reparaciones con ese N.º de trafo, de la más nueva a la más vieja,
 * sin `excepto` (la que se está editando) ni las dadas de baja. Cada reparación es un equipo del panel,
 * con su propio código de seguimiento y su propia chapa.
 */
export function reparacionesDelTrafo(equipos: EquipoTaller[], numeroTrafo: string, excepto?: string): EquipoTaller[] {
  const buscado = normalizarNumero(numeroTrafo);
  if (!buscado) return [];
  return activos(equipos)
    .filter((e) => e.codigo !== excepto && e.numeroTrafo && normalizarNumero(e.numeroTrafo) === buscado)
    .sort((a, b) => ingresoDe(b) - ingresoDe(a));
}
