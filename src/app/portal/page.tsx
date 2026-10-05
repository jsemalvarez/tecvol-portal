import type { Metadata } from "next";
import { PortalRegistro } from "@/components/portal/Registro";

export const metadata: Metadata = {
  title: "Portal · Tecvol",
  robots: { index: false, follow: false },
};

export default function PaginaPortal() {
  return <PortalRegistro />;
}
