import type { Metadata } from "next";
import { PanelPersonal } from "@/components/panel/Personal";

export const metadata: Metadata = {
  title: "Personal · Panel · Tecvol",
  robots: { index: false, follow: false },
};

export default function PaginaPersonal() {
  return <PanelPersonal />;
}
