import type { Metadata } from "next";
import { PaginaSesion } from "@/components/ingreso/PaginaSesion";

export const metadata: Metadata = {
  title: "Panel · Tecvol",
  robots: { index: false, follow: false },
};

export default function PaginaPanel() {
  return (
    <PaginaSesion
      rol="personal"
      titulo="Panel del taller"
      texto="Acá va a estar el ingreso de equipos, el tablero por estados, los informes y los presupuestos. El panel se construye en la próxima etapa de esta demo."
    />
  );
}
