import type { Metadata } from "next";
import { PanelNuevoTransformador } from "@/components/panel/transformador/PaginaTransformador";

export const metadata: Metadata = {
  title: "Nuevo transformador · Panel · Tecvol",
  robots: { index: false, follow: false },
};

export default function PaginaNuevoTransformador() {
  return <PanelNuevoTransformador />;
}
