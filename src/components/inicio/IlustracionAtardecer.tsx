/**
 * La línea rural del pliego que sigue hasta el horizonte, con el sol poniéndose: la página empieza de día y
 * termina al atardecer. Decorativa: trazo naranja y rellenos durazno sobre esmalte.
 */
const TRAZO = "var(--color-naranja)";
const RELLENO = "var(--color-durazno)";
const FONDO = "var(--color-esmalte)";

const POSTES = [90, 330, 570, 810, 1050, 1300];
const SUELO = 178;
const CRUCETA = 66;

/** Un vano de cable entre dos puntos, con su flecha (comba) hacia abajo. */
function vano(x1: number, x2: number, y: number, comba = 22) {
  return `M${x1} ${y} Q${(x1 + x2) / 2} ${y + comba} ${x2} ${y}`;
}

export function IlustracionAtardecer({ className = "" }: { className?: string }) {
  const extremos = [-60, ...POSTES, 1500];
  return (
    <svg viewBox="0 0 1440 180" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true" focusable="false">
      <circle cx="980" cy={SUELO} r="64" fill={TRAZO} />
      <g fill="none" stroke={TRAZO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Nave del taller, lejos */}
        <path d="M190 158 L210 142 V158 L230 142 V158 L250 142 V158 L270 142 V158 Z" fill={RELLENO} />
        <rect x="190" y="158" width="80" height="20" fill={FONDO} />
        <path d="M214 178 V166 H236 V178" />

        {/* Cables entre postes */}
        {extremos.slice(0, -1).map((x, i) => {
          const siguiente = extremos[i + 1];
          return (
            <g key={x}>
              <path d={vano(x - 28, siguiente - 28, CRUCETA - 2)} />
              <path d={vano(x + 28, siguiente + 28, CRUCETA - 2)} />
            </g>
          );
        })}

        {/* Postes con cruceta y aisladores */}
        {POSTES.map((x) => (
          <g key={x}>
            <path d={`M${x - 3} ${SUELO} V${CRUCETA - 10} M${x + 3} ${SUELO} V${CRUCETA - 10} M${x - 3} ${CRUCETA - 10} H${x + 3}`} />
            <rect x={x - 34} y={CRUCETA} width="68" height="6" fill={FONDO} />
            <path d={`M${x - 28} ${CRUCETA} V${CRUCETA - 6} M${x + 28} ${CRUCETA} V${CRUCETA - 6}`} />
          </g>
        ))}

        {/* Transformador de poste */}
        <path d="M573 106 H580 M573 136 H580" />
        <rect x="580" y="98" width="30" height="42" rx="2" fill={RELLENO} />
        {[586, 591, 596, 601, 606].map((x) => (
          <path key={x} d={`M${x} 105 V134`} />
        ))}
        <path d={`M590 98 L594 ${CRUCETA - 6} M600 98 L598 ${CRUCETA}`} />

        {/* Pájaros sobre el cable */}
        <path d="M892 66 l4 3 l4 -3 M908 68 l3 2.5 l3 -2.5" />

        {/* Suelo y pasto */}
        <path d={`M-10 ${SUELO} H1450`} />
        <path d="M40 178 l3 -6 l3 6 M150 178 l2 -5 l3 5 M420 178 l3 -6 l3 6 M700 178 l2 -5 l3 5 M1160 178 l3 -6 l3 6 M1380 178 l2 -5 l3 5" />
      </g>
    </svg>
  );
}
