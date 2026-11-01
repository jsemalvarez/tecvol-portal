import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelEditarTransformador } from "@/components/panel/transformador/PaginaTransformador";

export const metadata: Metadata = {
  title: "Datos del transformador · Panel · Tecvol",
  robots: { index: false, follow: false },
};

/** El transformador llega en la dirección (`?id=`), que solo se conoce en el navegador. */
export default function PaginaEditarTransformador() {
  return (
    <Suspense>
      <PanelEditarTransformador />
    </Suspense>
  );
}
