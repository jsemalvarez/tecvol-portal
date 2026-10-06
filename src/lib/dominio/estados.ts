/**
 * Estados de una reparación, en el orden fijo del taller.
 * Cada estado se comunica con la forma y el color de una señal de seguridad
 * (IRAM 10005 / ISO 7010): la forma dice qué pasa con el equipo y el color,
 * si el cliente tiene que hacer algo.
 */
export const ESTADOS = [
  "ingresado",
  "diagnostico",
  "presupuesto",
  "reparacion",
  "ensayos",
  "listo",
  "entregado",
] as const;

export type EstadoReparacion = (typeof ESTADOS)[number];

/** Familia de señal: registro (rectángulo blanco), advertencia (triángulo amarillo),
 *  obligación (círculo azul) y condición segura (cuadrado verde). */
export type FormaSenal = "registro" | "advertencia" | "obligacion" | "seguridad";

export interface DefinicionEstado {
  id: EstadoReparacion;
  /** Nombre corto del estado, en oración. */
  nombre: string;
  /** Texto de la franja del cartel, en mayúsculas. */
  rotulo: string;
  forma: FormaSenal;
  /** Qué significa para el cliente. */
  significado: string;
}

export const DEFINICIONES: Record<EstadoReparacion, DefinicionEstado> = {
  ingresado: {
    id: "ingresado",
    nombre: "Ingresado",
    rotulo: "Ingresado",
    forma: "registro",
    significado: "El equipo quedó registrado en el taller con sus datos de placa.",
  },
  diagnostico: {
    id: "diagnostico",
    nombre: "Diagnóstico",
    rotulo: "En diagnóstico",
    forma: "advertencia",
    significado: "El taller evalúa el equipo y prepara el presupuesto.",
  },
  presupuesto: {
    id: "presupuesto",
    nombre: "Presupuesto",
    rotulo: "Presupuesto para aprobar",
    forma: "obligacion",
    significado:
      "El presupuesto está listo y espera su aprobación.",
  },
  reparacion: {
    id: "reparacion",
    nombre: "Reparación",
    rotulo: "En reparación",
    forma: "advertencia",
    significado: "Con el presupuesto aprobado, el equipo está en reparación.",
  },
  ensayos: {
    id: "ensayos",
    nombre: "Ensayos finales",
    rotulo: "En ensayos finales",
    forma: "advertencia",
    significado: "El equipo reparado pasa los ensayos finales.",
  },
  listo: {
    id: "listo",
    nombre: "Listo",
    rotulo: "Listo para la entrega",
    forma: "seguridad",
    significado: "El equipo terminó los ensayos finales y está listo para la entrega.",
  },
  entregado: {
    id: "entregado",
    nombre: "Entregado",
    rotulo: "Entregado",
    forma: "registro",
    significado: "El equipo salió del taller. La orden queda cerrada en su historial.",
  },
};

export interface DefinicionForma {
  forma: FormaSenal;
  figura: string;
  indica: string;
}

/** Clave de lectura: una fila por familia de señal. */
export const FORMAS: DefinicionForma[] = [
  { forma: "registro", figura: "Rectángulo blanco", indica: "Registro de entrada o salida" },
  { forma: "advertencia", figura: "Triángulo amarillo", indica: "El taller está trabajando" },
  { forma: "obligacion", figura: "Círculo azul", indica: "Requiere su aprobación" },
  { forma: "seguridad", figura: "Cuadrado verde", indica: "Listo para la entrega" },
];

export function esEstado(valor: unknown): valor is EstadoReparacion {
  return typeof valor === "string" && (ESTADOS as readonly string[]).includes(valor);
}

export function indiceEstado(estado: EstadoReparacion): number {
  return ESTADOS.indexOf(estado);
}

/** La etapa que sigue en el orden del taller, o `null` después de "entregado". */
export function estadoSiguiente(estado: EstadoReparacion): EstadoReparacion | null {
  return ESTADOS[indiceEstado(estado) + 1] ?? null;
}

/**
 * Fechas de las etapas al pasar un equipo a `estado` el día `fecha`. El taller asigna el estado a mano,
 * así que puede saltear etapas (quedan sin fecha) o volver atrás para corregir: en ese caso se borran
 * las fechas de las etapas posteriores, que todavía no pasaron.
 */
export function etapasConEstado(
  etapas: Partial<Record<EstadoReparacion, Date>>,
  estado: EstadoReparacion,
  fecha: Date,
): Partial<Record<EstadoReparacion, Date>> {
  const limite = indiceEstado(estado);
  const nuevas: Partial<Record<EstadoReparacion, Date>> = {};
  for (const e of ESTADOS) {
    const fechaEtapa = etapas[e];
    if (indiceEstado(e) < limite && fechaEtapa) nuevas[e] = fechaEtapa;
  }
  nuevas[estado] = fecha;
  return nuevas;
}
