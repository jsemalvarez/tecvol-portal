import { notFound } from "next/navigation";
import { PanelEtapas } from "@/components/panel/VistaEtapas";
import { PanelMesa } from "@/components/panel/VistaMesa";
import { PanelPlanilla } from "@/components/panel/VistaPlanilla";
import { ESTILOS_PANEL, type EstiloPanel } from "../estilos";

const VISTAS: Record<EstiloPanel, () => React.JSX.Element> = {
  planilla: PanelPlanilla,
  etapas: PanelEtapas,
  mesa: PanelMesa,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return ESTILOS_PANEL.map((e) => ({ estilo: e.id }));
}

export default async function PaginaEstiloPanel({ params }: { params: Promise<{ estilo: string }> }) {
  const { estilo } = await params;
  const Vista = VISTAS[estilo as EstiloPanel];
  if (!Vista) notFound();
  return <Vista />;
}
