import type { Metadata } from "next";
import { PanelRegistrar } from "@/components/panel/equipo/PaginasEquipo";

export const metadata: Metadata = {
  title: "Registrar equipo · Panel · Tecvol",
  robots: { index: false, follow: false },
};

export default function PaginaRegistrar() {
  return <PanelRegistrar />;
}
