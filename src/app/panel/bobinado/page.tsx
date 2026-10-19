import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelBobinado } from "@/components/panel/bobinado/PaginaBobinado";

export const metadata: Metadata = {
  title: "Datos de bobinado · Panel · Tecvol",
  robots: { index: false, follow: false },
};

/** El código del equipo llega en la dirección (`?codigo=`), que solo se conoce en el navegador. */
export default function PaginaBobinado() {
  return (
    <Suspense>
      <PanelBobinado />
    </Suspense>
  );
}
