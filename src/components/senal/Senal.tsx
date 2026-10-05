import type { CSSProperties, SVGProps } from "react";
import type { FormaSenal } from "@/lib/dominio/estados";
import { PICTOGRAMAS, PICTOGRAMAS_SIMPLES, type IdPictograma } from "./pictogramas";

/**
 * Señal de seguridad en grilla de 120 × 120.
 * - activa: forma y color normados (el único lugar donde aparece color).
 * - pasada: la misma forma en contorno negro, con pictograma.
 * Los pictogramas son siluetas rellenas; sus calados toman el color de la señal (`--fondo`).
 * - futura: contorno punteado, sin pictograma.
 */
export type VarianteSenal = "activa" | "pasada" | "futura";

interface Props {
  forma: FormaSenal;
  pictograma: IdPictograma;
  variante?: VarianteSenal;
  /** Texto accesible. Sin título la señal es decorativa. */
  titulo?: string;
  /** Reproduce el destello reflectivo (solo en la señal grande del cartel). */
  destello?: boolean;
  /** Pictograma de una sola figura, para tamaños chicos. */
  simple?: boolean;
  /** Prefijo único de los ids del destello cuando hay varias señales con destello en la página. */
  idDestello?: string;
  className?: string;
}

const RELLENO: Record<FormaSenal, string> = {
  registro: "var(--color-esmalte)",
  advertencia: "var(--color-amarillo)",
  obligacion: "var(--color-azul)",
  seguridad: "var(--color-verde)",
};

const TINTA_PICTOGRAMA: Record<FormaSenal, string> = {
  registro: "var(--color-tinta)",
  advertencia: "var(--color-tinta)",
  obligacion: "var(--color-esmalte)",
  seguridad: "var(--color-esmalte)",
};

/** Posición y escala del pictograma dentro de cada forma. */
const AREA: Record<FormaSenal, { x: number; y: number; escala: number }> = {
  registro: { x: 25, y: 25, escala: 0.7 },
  advertencia: { x: 31, y: 42, escala: 0.58 },
  obligacion: { x: 24, y: 24, escala: 0.72 },
  seguridad: { x: 24, y: 24, escala: 0.72 },
};

function Contorno({ forma, ...props }: { forma: FormaSenal } & SVGProps<SVGPathElement>) {
  switch (forma) {
    case "advertencia":
      return <path d="M60 10 L113 103 L7 103 Z" strokeLinejoin="round" {...props} />;
    case "obligacion":
      return <path d="M60 4 a56 56 0 1 1 0 112 a56 56 0 1 1 0 -112 Z" {...props} />;
    default:
      return <path d="M14 4 H106 a10 10 0 0 1 10 10 V106 a10 10 0 0 1 -10 10 H14 a10 10 0 0 1 -10 -10 V14 a10 10 0 0 1 10 -10 Z" {...props} />;
  }
}

export function Senal({ forma, pictograma, variante = "activa", titulo, destello, simple, idDestello = "senal-destello", className }: Props) {
  const area = AREA[forma];
  const activa = variante === "activa";
  const tinta = activa ? TINTA_PICTOGRAMA[forma] : "var(--color-tinta)";
  const fondo = activa ? RELLENO[forma] : "var(--color-esmalte)";

  let contorno: SVGProps<SVGPathElement>;
  if (variante === "futura") {
    contorno = { fill: "none", stroke: "var(--color-acero)", strokeWidth: 4, strokeDasharray: "7 7" };
  } else if (variante === "pasada") {
    contorno = { fill: "var(--color-esmalte)", stroke: "var(--color-tinta)", strokeWidth: 6 };
  } else if (forma === "advertencia") {
    contorno = { fill: RELLENO[forma], stroke: "var(--color-tinta)", strokeWidth: 9 };
  } else if (forma === "registro") {
    contorno = { fill: RELLENO[forma], stroke: "var(--color-tinta)", strokeWidth: 7 };
  } else {
    contorno = { fill: RELLENO[forma] };
  }

  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
    >
      {destello && (
        <defs>
          <clipPath id={`${idDestello}-recorte`}>
            <Contorno forma={forma} />
          </clipPath>
          <linearGradient id={`${idDestello}-luz`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.7" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      <Contorno forma={forma} {...contorno} />
      {variante !== "futura" && (
        <g
          transform={`translate(${area.x} ${area.y}) scale(${area.escala})`}
          fill={tinta}
          color={tinta}
          style={{ "--fondo": fondo } as CSSProperties}
        >
          {(simple && PICTOGRAMAS_SIMPLES[pictograma]) || PICTOGRAMAS[pictograma]}
        </g>
      )}
      {destello && (
        <g clipPath={`url(#${idDestello}-recorte)`}>
          <rect className="senal-destello" x="-60" y="-20" width="60" height="160" fill={`url(#${idDestello}-luz)`} />
        </g>
      )}
    </svg>
  );
}
