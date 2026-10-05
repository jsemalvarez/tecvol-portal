import type { ReactNode } from "react";
import type { EstadoReparacion, FormaSenal } from "@/lib/dominio/estados";

/**
 * Pictogramas de las señales, en el idioma de ISO 7010: siluetas rellenas sobre
 * una grilla de 100 × 100. La figura usa `currentColor`; los calados usan
 * `var(--fondo)`, el color de la señal sobre la que se dibujan.
 */
export type IdPictograma = EstadoReparacion | "transformador" | "pregunta" | "enviado";

/** Un pictograma por familia de señal, para las claves de lectura. */
export const PICTOGRAMA_DE_FORMA: Record<FormaSenal, IdPictograma> = {
  registro: "ingresado",
  advertencia: "reparacion",
  obligacion: "presupuesto",
  seguridad: "listo",
};

const FONDO = "var(--fondo)";

/** Transformador de distribución: cuba con aletas de refrigeración y tres aisladores.
 *  Ocupa x 24–76, y 22–88 en su propia grilla. */
function Transformador({ x = 0, y = 0, escala = 1 }: { x?: number; y?: number; escala?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      <rect x="31" y="22" width="8" height="20" rx="2" />
      <rect x="46" y="22" width="8" height="20" rx="2" />
      <rect x="61" y="22" width="8" height="20" rx="2" />
      <rect x="24" y="38" width="52" height="50" rx="4" />
      <rect x="32" y="48" width="4" height="32" rx="1" fill={FONDO} />
      <rect x="42" y="48" width="4" height="32" rx="1" fill={FONDO} />
      <rect x="52" y="48" width="4" height="32" rx="1" fill={FONDO} />
      <rect x="62" y="48" width="4" height="32" rx="1" fill={FONDO} />
    </g>
  );
}

/** Persona en el idioma ISO: cabeza, torso y piernas. */
function Persona() {
  return (
    <>
      <circle cx="22" cy="24" r="9" />
      <path d="M12 40 a6 6 0 0 1 6 -6 h8 a6 6 0 0 1 6 6 v24 h-4 v26 h-6 v-22 h-2 v22 h-6 v-26 h-2 Z" />
      <path d="M30 37 L52 47 L49 53 L28 45 Z" />
    </>
  );
}

const check = <path d="M14 52 L28 38 L42 52 L74 20 L88 34 L42 80 Z" />;

export const PICTOGRAMAS: Record<IdPictograma, ReactNode> = {
  // El equipo entra a la nave del taller.
  ingresado: (
    <>
      <path d="M4 36 L50 6 L96 36 L96 48 L50 18 L4 48 Z" />
      <rect x="8" y="42" width="9" height="52" />
      <rect x="83" y="42" width="9" height="52" />
      <Transformador x={20} y={30} escala={0.6} />
    </>
  ),
  // Un técnico inspecciona el equipo.
  diagnostico: (
    <g transform="translate(5 4)">
      <Persona />
      <Transformador x={34} y={34} escala={0.64} />
    </g>
  ),
  // Presupuesto para firmar.
  presupuesto: (
    <>
      <path d="M18 10 H56 L72 26 V90 H18 Z" />
      <path d="M56 10 L72 26 H56 Z" fill={FONDO} />
      <rect x="27" y="36" width="34" height="5" rx="1" fill={FONDO} />
      <rect x="27" y="48" width="34" height="5" rx="1" fill={FONDO} />
      <rect x="27" y="60" width="22" height="5" rx="1" fill={FONDO} />
      <polygon points="85,29 95,36 68,75 54,84 57,68" fill={FONDO} stroke={FONDO} strokeWidth="7" strokeLinejoin="round" />
      <polygon points="85,29 95,36 68,75 54,84 57,68" />
    </>
  ),
  // Equipo en reparación: transformador y llave.
  reparacion: (
    <>
      <Transformador x={-6} y={34} escala={0.64} />
      <g transform="translate(57 90) rotate(-58)">
        <rect x="0" y="-5" width="40" height="10" rx="5" />
        <circle cx="46" cy="0" r="12" />
        <rect x="46" y="-5" width="16" height="10" fill={FONDO} />
      </g>
    </>
  ),
  // Ensayos: instrumento de medición con sus puntas de prueba.
  ensayos: (
    <g transform="translate(10 12) scale(0.8)">
      <rect x="20" y="10" width="60" height="60" rx="7" />
      <path d="M30 46 A20 20 0 0 1 70 46 Z" fill={FONDO} />
      <polygon points="48,46 52,46 64,29" />
      <circle cx="50" cy="46" r="4" />
      <circle cx="37" cy="59" r="4.5" fill={FONDO} />
      <circle cx="63" cy="59" r="4.5" fill={FONDO} />
      <rect x="33" y="74" width="8" height="12" rx="2" />
      <polygon points="33,88 41,88 37,97" />
      <rect x="59" y="74" width="8" height="12" rx="2" />
      <polygon points="59,88 67,88 63,97" />
    </g>
  ),
  listo: check,
  // El equipo sale del taller en camión.
  entregado: (
    <>
      <rect x="4" y="62" width="64" height="9" />
      <path d="M66 42 H83 L95 58 V76 H66 Z" />
      <path d="M72 48 H81 L88 58 H72 Z" fill={FONDO} />
      <circle cx="20" cy="80" r="11" fill={FONDO} />
      <circle cx="54" cy="80" r="11" fill={FONDO} />
      <circle cx="82" cy="80" r="11" fill={FONDO} />
      <circle cx="20" cy="80" r="8" />
      <circle cx="54" cy="80" r="8" />
      <circle cx="82" cy="80" r="8" />
      <Transformador x={10} y={14} escala={0.55} />
    </>
  ),
  transformador: <Transformador x={-6} y={-6} escala={1.12} />,
  pregunta: (
    <>
      <path
        d="M33 36 a17 17 0 1 1 25 15 c-5 3 -8 6 -8 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <circle cx="50" cy="86" r="8" />
    </>
  ),
  enviado: check,
};

/**
 * Versiones de una sola figura para tamaños chicos (recorrido, clave, filas):
 * a 20 px una composición de dos figuras se vuelve una mancha.
 */
export const PICTOGRAMAS_SIMPLES: Partial<Record<IdPictograma, ReactNode>> = {
  ingresado: (
    <>
      <path d="M2 40 L50 6 L98 40 L98 54 L50 20 L2 54 Z" />
      <rect x="30" y="50" width="40" height="42" rx="3" />
    </>
  ),
  diagnostico: (
    <g transform="translate(16 2) scale(1.1)">
      <Persona />
    </g>
  ),
  presupuesto: (
    <>
      <path d="M20 6 H60 L80 26 V94 H20 Z" />
      <path d="M60 6 L80 26 H60 Z" fill={FONDO} />
      <rect x="31" y="38" width="38" height="8" rx="1" fill={FONDO} />
      <rect x="31" y="54" width="38" height="8" rx="1" fill={FONDO} />
      <rect x="31" y="70" width="24" height="8" rx="1" fill={FONDO} />
    </>
  ),
  reparacion: (
    <g transform="translate(18 90) rotate(-45)">
      <rect x="0" y="-8" width="56" height="16" rx="8" />
      <circle cx="66" cy="0" r="17" />
      <rect x="66" y="-7" width="24" height="14" fill={FONDO} />
    </g>
  ),
  entregado: (
    <>
      <rect x="2" y="30" width="58" height="40" rx="3" />
      <path d="M58 40 H80 L96 60 V78 H58 Z" />
      <path d="M66 47 H78 L88 60 H66 Z" fill={FONDO} />
      <circle cx="22" cy="80" r="15" fill={FONDO} />
      <circle cx="78" cy="80" r="15" fill={FONDO} />
      <circle cx="22" cy="80" r="11" />
      <circle cx="78" cy="80" r="11" />
    </>
  ),
};
