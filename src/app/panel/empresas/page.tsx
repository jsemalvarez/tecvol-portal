import type { Metadata } from "next";
import { PanelEmpresas } from "@/components/panel/VistaEmpresas";

export const metadata: Metadata = {
  title: "Empresas y cuentas · Panel · Tecvol",
  robots: { index: false, follow: false },
};

export default function PaginaEmpresas() {
  return <PanelEmpresas />;
}
