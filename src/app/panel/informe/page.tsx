import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelInforme } from "@/components/panel/informe/PaginaInforme";

export const metadata: Metadata = {
  title: "Informe de diagnóstico · Panel · Tecvol",
  robots: { index: false, follow: false },
};

/** El código del equipo llega en la dirección (`?codigo=`), que solo se conoce en el navegador. */
export default function PaginaInforme() {
  return (
    <Suspense>
      <PanelInforme />
    </Suspense>
  );
}
