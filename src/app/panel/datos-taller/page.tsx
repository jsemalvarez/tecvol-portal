import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelDatosTaller } from "@/components/panel/datos-taller/PaginaDatosTaller";

export const metadata: Metadata = {
  title: "Datos del taller · Panel · Tecvol",
  robots: { index: false, follow: false },
};

/** El código del equipo llega en la dirección (`?codigo=`), que solo se conoce en el navegador. */
export default function PaginaDatosTaller() {
  return (
    <Suspense>
      <PanelDatosTaller />
    </Suspense>
  );
}
