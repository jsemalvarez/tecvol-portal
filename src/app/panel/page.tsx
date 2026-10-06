import type { Metadata } from "next";
import { PanelPlanilla } from "@/components/panel/Planilla";

export const metadata: Metadata = {
  title: "Panel · Tecvol",
  robots: { index: false, follow: false },
};

export default function PaginaPanelTaller() {
  return <PanelPlanilla />;
}
