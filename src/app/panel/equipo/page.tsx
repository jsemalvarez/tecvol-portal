import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelFicha } from "@/components/panel/ficha/PaginaFicha";

export const metadata: Metadata = {
  title: "Ficha del equipo · Panel · Tecvol",
  robots: { index: false, follow: false },
};

/** El código del equipo llega en la dirección (`?codigo=`), que solo se conoce en el navegador. */
export default function PaginaFicha() {
  return (
    <Suspense>
      <PanelFicha />
    </Suspense>
  );
}
