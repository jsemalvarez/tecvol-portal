import type { Metadata } from "next";
import { Suspense } from "react";
import { ElegirClave } from "@/components/ingreso/ElegirClave";

export const metadata: Metadata = {
  title: "Elegir contraseña · Tecvol",
  robots: { index: false, follow: false },
};

/** El código del enlace llega en la dirección (`?oobCode=`), que solo se conoce en el navegador. */
export default function PaginaElegirClave() {
  return (
    <Suspense>
      <ElegirClave />
    </Suspense>
  );
}
