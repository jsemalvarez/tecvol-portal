import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Comparador } from "@/components/comparar/Comparador";
import { ESTILOS_PANEL } from "./estilos";

export const metadata: Metadata = {
  title: "Panel · Tecvol",
  robots: { index: false, follow: false },
};

/** Comparación temporal de los diseños del panel. */
export default function LayoutComparacionPanel({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Comparador versiones={ESTILOS_PANEL.map((e) => ({ href: `/panel/v/${e.id}`, nombre: e.nombre }))} />
    </>
  );
}
