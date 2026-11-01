import type { Metadata } from "next";
import { PanelTransformadores } from "@/components/panel/transformador/ListaTransformadores";

export const metadata: Metadata = {
  title: "Transformadores · Panel · Tecvol",
  robots: { index: false, follow: false },
};

export default function PaginaTransformadores() {
  return <PanelTransformadores />;
}
