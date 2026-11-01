import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelRegistrar } from "@/components/panel/equipo/PaginasEquipo";

export const metadata: Metadata = {
  title: "Nueva O.T. · Panel · Tecvol",
  robots: { index: false, follow: false },
};

/** El transformador, si ya pasó por el taller, llega en la dirección (`?trafo=`), que solo se conoce en el navegador. */
export default function PaginaRegistrar() {
  return (
    <Suspense>
      <PanelRegistrar />
    </Suspense>
  );
}
