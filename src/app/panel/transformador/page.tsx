import type { Metadata } from "next";
import { Suspense } from "react";
import { PanelTransformador } from "@/components/panel/transformador/PaginaTransformador";

export const metadata: Metadata = {
  title: "Transformador · Panel · Tecvol",
  robots: { index: false, follow: false },
};

/** El transformador llega en la dirección (`?id=`), que solo se conoce en el navegador. */
export default function PaginaTransformador() {
  return (
    <Suspense>
      <PanelTransformador />
    </Suspense>
  );
}
