import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelEditar } from "@/components/panel/equipo/PaginasEquipo";

export const metadata: Metadata = {
  title: "Datos de la O.T. · Panel · Tecvol",
  robots: { index: false, follow: false },
};

/** El código del equipo llega en la dirección (`?codigo=`), que solo se conoce en el navegador. */
export default function PaginaEditar() {
  return (
    <Suspense>
      <PanelEditar />
    </Suspense>
  );
}
