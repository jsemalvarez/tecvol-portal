import { enPruebas } from "@/lib/ambiente";

/** Franja de advertencia en todas las páginas de stage: se ve igual que el sitio real y no hay que confundirlos. */
export function CartelPruebas() {
  if (!enPruebas) return null;

  return (
    <p className="bg-amarillo px-4 py-2 text-center text-sm font-semibold text-tinta">
      Ambiente de pruebas: lo que se carga acá no es real y puede borrarse.
    </p>
  );
}
