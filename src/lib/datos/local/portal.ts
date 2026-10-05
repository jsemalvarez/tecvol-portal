import type { EquipoCliente, PortalCliente } from "@/lib/dominio/tipos";
import type { PortalRepositorio } from "../repositorios";
import { SEGUIMIENTOS_DE_PRUEBA } from "./index";

/**
 * Portal de prueba para desarrollar sin Firebase. Nunca se usa en producción (ver `modoDatos`).
 * La empresa y sus equipos son ficticios; el estado sale de los mismos seguimientos de prueba.
 */
const EMPRESA_DE_PRUEBA = "Cooperativa Eléctrica de Prueba";

/** Datos privados de cada orden de prueba: la referencia del cliente y la serie de la placa. */
const ORDENES: Record<string, { referencia?: string; serie?: string }> = {
  K7RM4XPA: { referencia: "Subestación Barrio Norte", serie: "PRUEBA-3150-21" },
  B3NQ8HTW: { referencia: "Planta de bombeo 2", serie: "PRUEBA-5000-17" },
  Z9FD2KCY: { referencia: "Línea rural, km 12" },
  H4GE6VRA: { referencia: "Plaza central", serie: "PRUEBA-1600-09" },
  M5TC7WQE: { referencia: "Escuela técnica" },
  R8VJ3NDS: { referencia: "Barrio Las Rosas", serie: "PRUEBA-1000-12" },
  P6XH9EBK: { referencia: "Parque industrial, lote 4", serie: "PRUEBA-2500-19" },
  W2SG5MZU: { referencia: "Línea rural, km 31" },
};

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

export class PortalLocal implements PortalRepositorio {
  async obtenerPortal(uid: string): Promise<PortalCliente | null> {
    await esperar(600);
    // La cuenta de prueba del cliente; cualquier otra no está asociada a una empresa.
    if (uid !== "local-cliente") return null;
    const equipos: EquipoCliente[] = SEGUIMIENTOS_DE_PRUEBA.map((s) => ({ ...s, ...ORDENES[s.codigo] }));
    return { empresa: EMPRESA_DE_PRUEBA, equipos };
  }
}
