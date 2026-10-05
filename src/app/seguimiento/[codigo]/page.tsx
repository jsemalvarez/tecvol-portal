import type { Metadata } from "next";
import { Inicio } from "@/components/inicio/Inicio";
import { formatearCodigo } from "@/lib/dominio/codigo";

interface Props {
  params: Promise<{ codigo: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  return {
    title: `Seguimiento ${formatearCodigo(decodeURIComponent(codigo))} · Tecvol`,
    robots: { index: false, follow: false },
  };
}

/** Destino del QR de la orden de ingreso: el mismo cartel, con el estado ya consultado. */
export default async function PaginaSeguimiento({ params }: Props) {
  const { codigo } = await params;
  return <Inicio codigoInicial={decodeURIComponent(codigo)} />;
}
