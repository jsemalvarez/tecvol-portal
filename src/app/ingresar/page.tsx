import type { Metadata } from "next";
import { Ingreso } from "@/components/ingreso/Ingreso";

export const metadata: Metadata = {
  title: "Ingresar · Tecvol",
  robots: { index: false, follow: false },
};

export default function PaginaIngresar() {
  return <Ingreso />;
}
