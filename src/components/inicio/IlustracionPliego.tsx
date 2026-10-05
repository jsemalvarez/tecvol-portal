/**
 * Ilustración de línea del héroe Pliego: la red rural de una cooperativa (molino, poste con
 * transformador) y la nave del taller con techo de diente de sierra, con un equipo entrando por el portón.
 * Decorativa: trazo naranja y rellenos durazno sobre esmalte, con sol naranja.
 */
const TRAZO = "var(--color-naranja)";
const RELLENO = "var(--color-durazno)";
const FONDO = "var(--color-esmalte)";
const SOL = "var(--color-naranja)";

function Arbol({ x, alto }: { x: number; alto: number }) {
  const y = 360 - alto;
  return (
    <g>
      <path d={`M${x} 360 V${y + alto * 0.45}`} />
      <path
        d={`M${x - alto * 0.32} ${y + alto * 0.5} C${x - alto * 0.5} ${y + alto * 0.2} ${x - alto * 0.2} ${y - alto * 0.05} ${x} ${y + alto * 0.08} C${x + alto * 0.2} ${y - alto * 0.08} ${x + alto * 0.5} ${y + alto * 0.18} ${x + alto * 0.34} ${y + alto * 0.5} C${x + alto * 0.2} ${y + alto * 0.62} ${x - alto * 0.18} ${y + alto * 0.62} ${x - alto * 0.32} ${y + alto * 0.5} Z`}
        fill={FONDO}
      />
    </g>
  );
}

function Molino() {
  const pierna = (y: number) => ((360 - y) * 17) / 190;
  const niveles = [330, 290, 250, 210, 176];
  return (
    <g>
      <path d="M75 360 L92 170 M115 360 L98 170" />
      {niveles.map((y) => (
        <path key={y} d={`M${75 + pierna(y)} ${y} H${115 - pierna(y)}`} />
      ))}
      {niveles.slice(0, -1).map((y, i) => {
        const y2 = niveles[i + 1];
        return <path key={y} d={`M${75 + pierna(y)} ${y} L${115 - pierna(y2)} ${y2} M${115 - pierna(y)} ${y} L${75 + pierna(y2)} ${y2}`} />;
      })}
      <path d="M95 150 H48" />
      <path d="M30 136 L52 142 V158 L30 164 Z" fill={RELLENO} />
      <circle cx="95" cy="150" r="32" fill={FONDO} />
      <circle cx="95" cy="150" r="9" />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i * Math.PI) / 8;
        return (
          <path
            key={i}
            d={`M${(95 + Math.cos(a) * 9).toFixed(1)} ${(150 + Math.sin(a) * 9).toFixed(1)} L${(95 + Math.cos(a) * 32).toFixed(1)} ${(150 + Math.sin(a) * 32).toFixed(1)}`}
          />
        );
      })}
    </g>
  );
}

function Poste() {
  return (
    <g>
      {/* Cables: hacia el campo y hacia el pueblo, por encima de la nave */}
      <path d="M176 99 Q 88 130 -4 116 M215 90 Q 108 120 -4 103" />
      <path d="M254 99 Q 440 162 644 134 M215 90 Q 430 152 644 120" />
      <path d="M211 360 V92 M219 360 V92 M211 92 H219" />
      <rect x="170" y="102" width="90" height="8" fill={FONDO} />
      {[176, 254].map((x) => (
        <path key={x} d={`M${x - 3} 102 V96 H${x + 3} V102 M${x - 5} 98 H${x + 5}`} />
      ))}
      {/* Transformador de poste */}
      <path d="M219 186 H226 M219 218 H226" />
      <path d="M236 168 L244 106 M252 168 L256 106" />
      <rect x="226" y="176" width="36" height="50" rx="3" fill={RELLENO} />
      {[233, 238.5, 244, 249.5, 255].map((x) => (
        <path key={x} d={`M${x} 184 V220`} />
      ))}
      <path d="M232 176 V166 H240 V176 M248 176 V166 H256 V176" fill={FONDO} />
    </g>
  );
}

function Nave() {
  const dientes = [330, 390, 450, 510, 570];
  return (
    <g>
      <path
        d={`M330 240 ${dientes.map((x) => `L${x + 60} 192 L${x + 60} 240`).join(" ")}`}
        fill={RELLENO}
      />
      <rect x="330" y="240" width="300" height="120" fill={FONDO} />
      <path d="M626 240 V360" />
      {/* Portón con sus listones y el cartel */}
      <rect x="350" y="266" width="120" height="94" fill={FONDO} />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M350 ${275 + i * 9.5} H470`} />
      ))}
      <rect x="372" y="246" width="76" height="13" rx="1.5" fill={RELLENO} />
      <text
        x="410"
        y="256"
        textAnchor="middle"
        fill="var(--color-tinta)"
        stroke="none"
        fontSize="9.5"
        fontWeight="700"
        letterSpacing="2.5"
        style={{ fontFamily: "var(--font-barlow-condensed)" }}
      >
        TALLER
      </text>
      {/* Ventanas */}
      <rect x="490" y="272" width="104" height="32" />
      <path d="M516 272 V304 M542 272 V304 M568 272 V304 M490 288 H594" />
    </g>
  );
}

/** Transformador que entra al taller, sobre su pallet, delante del portón. */
function EquipoEntrando() {
  return (
    <g>
      <rect x="388" y="276" width="46" height="12" rx="6" fill={FONDO} />
      <path d="M398 288 V302" />
      {[399, 411, 423].map((x) => (
        <path key={x} d={`M${x} 302 V291 M${x - 3} 296 H${x + 3}`} />
      ))}
      <rect x="380" y="302" width="60" height="50" rx="2" fill={FONDO} />
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} d={`M${388 + i * 7.3} 309 V345`} />
      ))}
      <rect x="372" y="352" width="76" height="8" fill={RELLENO} />
    </g>
  );
}

export function IlustracionPliego({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 420" className={className} aria-hidden="true" focusable="false">
      <circle cx="568" cy="74" r="28" fill={SOL} />
      <g fill="none" stroke={TRAZO} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <Arbol x={24} alto={74} />
        <Arbol x={156} alto={52} />
        <Molino />
        <Poste />
        <Nave />
        <EquipoEntrando />
        {/* Pájaros sobre el cable */}
        <path d="M462 136 l5 4 l5 -4 M482 139 l4 3 l4 -3" />
        {/* Suelo */}
        <path d="M-4 360 H644" />
        <path d="M30 372 H52 M108 379 H140 M258 374 H274 M330 384 H372 M452 376 H472 M556 380 H600" />
        <path d="M60 360 l3 -6 l3 6 M170 360 l2 -5 l3 5 M300 360 l3 -6 l3 6 M500 360 l2 -5 l3 5" />
      </g>
    </svg>
  );
}
