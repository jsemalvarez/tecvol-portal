import type { EstadoReparacion } from "@/lib/dominio/estados";
import type { ConsultaNueva, SeguimientoPublico } from "@/lib/dominio/tipos";
import type { ConsultasRepositorio, SeguimientoRepositorio } from "../repositorios";

/**
 * Datos de prueba para desarrollar sin Firebase. Nunca se usan en producción
 * (ver `modoDatos`). Los equipos son ficticios.
 */
function fechas(valores: Partial<Record<EstadoReparacion, string>>) {
  return Object.fromEntries(
    Object.entries(valores).map(([estado, iso]) => [estado, new Date(`${iso}T12:00:00-03:00`)]),
  ) as Partial<Record<EstadoReparacion, Date>>;
}

export const SEGUIMIENTOS_DE_PRUEBA: SeguimientoPublico[] = [
  {
    codigo: "K7RM4XPA",
    estado: "reparacion",
    equipo: "Transformador trifásico 315 kVA · 13,2/0,4 kV",
    etapas: fechas({
      ingresado: "2026-09-01",
      diagnostico: "2026-09-02",
      presupuesto: "2026-09-04",
      reparacion: "2026-09-08",
    }),
    actualizado: new Date("2026-09-15T12:00:00-03:00"),
  },
  {
    codigo: "B3NQ8HTW",
    estado: "presupuesto",
    equipo: "Transformador trifásico 500 kVA · 13,2/0,4 kV",
    etapas: fechas({ ingresado: "2026-09-22", diagnostico: "2026-09-23", presupuesto: "2026-09-29" }),
    actualizado: new Date("2026-09-29T12:00:00-03:00"),
  },
  {
    codigo: "Z9FD2KCY",
    estado: "listo",
    equipo: "Transformador monofásico 25 kVA · 7,62/0,231 kV",
    etapas: fechas({
      ingresado: "2026-08-18",
      diagnostico: "2026-08-19",
      presupuesto: "2026-08-21",
      reparacion: "2026-08-25",
      ensayos: "2026-09-10",
      listo: "2026-09-12",
    }),
    actualizado: new Date("2026-09-12T12:00:00-03:00"),
  },
  {
    codigo: "H4GE6VRA",
    estado: "entregado",
    equipo: "Transformador trifásico 160 kVA · 13,2/0,4 kV",
    etapas: fechas({
      ingresado: "2026-07-06",
      diagnostico: "2026-07-07",
      presupuesto: "2026-07-09",
      reparacion: "2026-07-14",
      ensayos: "2026-07-28",
      listo: "2026-07-30",
      entregado: "2026-08-03",
    }),
    actualizado: new Date("2026-08-03T12:00:00-03:00"),
  },
  {
    codigo: "M5TC7WQE",
    estado: "ingresado",
    equipo: "Transformador trifásico 200 kVA · 13,2/0,4 kV",
    etapas: fechas({ ingresado: "2026-10-02" }),
    actualizado: new Date("2026-10-02T12:00:00-03:00"),
  },
  {
    codigo: "R8VJ3NDS",
    estado: "diagnostico",
    equipo: "Transformador trifásico 100 kVA · 13,2/0,4 kV",
    etapas: fechas({ ingresado: "2026-09-29", diagnostico: "2026-09-30" }),
    actualizado: new Date("2026-09-30T12:00:00-03:00"),
  },
  {
    codigo: "P6XH9EBK",
    estado: "ensayos",
    equipo: "Transformador trifásico 250 kVA · 13,2/0,4 kV",
    etapas: fechas({
      ingresado: "2026-08-25",
      diagnostico: "2026-08-26",
      presupuesto: "2026-08-28",
      reparacion: "2026-09-02",
      ensayos: "2026-09-28",
    }),
    actualizado: new Date("2026-09-28T12:00:00-03:00"),
  },
  {
    codigo: "W2SG5MZU",
    estado: "entregado",
    equipo: "Transformador monofásico 10 kVA · 7,62/0,231 kV",
    etapas: fechas({
      ingresado: "2026-04-13",
      diagnostico: "2026-04-14",
      presupuesto: "2026-04-16",
      reparacion: "2026-04-21",
      ensayos: "2026-05-04",
      listo: "2026-05-05",
      entregado: "2026-05-08",
    }),
    actualizado: new Date("2026-05-08T12:00:00-03:00"),
  },
];

export const CODIGOS_DE_PRUEBA = SEGUIMIENTOS_DE_PRUEBA.map((s) => s.codigo);

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

export class SeguimientoLocal implements SeguimientoRepositorio {
  async obtenerPorCodigo(codigo: string): Promise<SeguimientoPublico | null> {
    await esperar(450);
    return SEGUIMIENTOS_DE_PRUEBA.find((s) => s.codigo === codigo) ?? null;
  }
}

export class ConsultasLocal implements ConsultasRepositorio {
  async crear(consulta: ConsultaNueva): Promise<void> {
    await esperar(600);
    console.info("[modo local] Consulta recibida (no se guarda):", consulta);
  }
}
