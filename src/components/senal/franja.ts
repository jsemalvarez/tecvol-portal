import type { FormaSenal } from "@/lib/dominio/estados";

/** Franja de rótulo bajo la señal, en el color de su estado (ISO 3864-2). */
export const FRANJA: Record<FormaSenal, string> = {
  registro: "bg-tinta text-esmalte",
  advertencia: "bg-amarillo text-tinta",
  obligacion: "bg-azul text-esmalte",
  seguridad: "bg-verde text-esmalte",
};
