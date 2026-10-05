import type { Metadata } from "next";
import { PaginaSesion } from "@/components/ingreso/PaginaSesion";

export const metadata: Metadata = {
  title: "Portal · Tecvol",
  robots: { index: false, follow: false },
};

export default function PaginaPortal() {
  return (
    <PaginaSesion
      rol="cliente"
      titulo="Portal de clientes"
      texto="Acá va a ver sus equipos, sus presupuestos y el historial. El portal se construye en la próxima etapa de esta demo."
    />
  );
}
