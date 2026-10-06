import type { ConsultaNueva, SeguimientoPublico } from "@/lib/dominio/tipos";
import type { ConsultasRepositorio, SeguimientoRepositorio } from "../repositorios";
import { esperar, leerDatos } from "./datos";

export { CODIGOS_DE_PRUEBA } from "./datos";

export class SeguimientoLocal implements SeguimientoRepositorio {
  async obtenerPorCodigo(codigo: string): Promise<SeguimientoPublico | null> {
    await esperar(450);
    const equipo = leerDatos().equipos.find((e) => e.codigo === codigo);
    if (!equipo) return null;
    // Solo los datos públicos, como en Firestore.
    return { codigo, estado: equipo.estado, equipo: equipo.equipo, etapas: equipo.etapas, actualizado: equipo.actualizado };
  }
}

export class ConsultasLocal implements ConsultasRepositorio {
  async crear(consulta: ConsultaNueva): Promise<void> {
    await esperar(600);
    console.info("[modo local] Consulta recibida (no se guarda):", consulta);
  }
}
