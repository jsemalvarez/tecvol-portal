"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { FRANJA } from "@/components/senal/franja";
import { Senal, type VarianteSenal } from "@/components/senal/Senal";
import { DEFINICIONES, ESTADOS } from "@/lib/dominio/estados";

const N = ESTADOS.length;
/** Fracción de cada tramo de scroll que ocupa la maniobra; el resto es la parada en la estación. */
const TRASLADO = 0.42;
/** Alto de scroll por estación, en svh. */
const SCROLL_POR_ESTACION = 70;

/**
 * Dónde se apoya el equipo en cada estación, en pasos de cámara. El equipo empieza afuera,
 * entra por el portón de ingreso y la última estación (entregado) queda afuera, pasando el
 * portón de salida. Todas son enteras para que las columnas cercanas nunca tapen al equipo quieto.
 */
const POSICIONES = [0, 1, 2, 3, 4, 5, 7] as const;
const INICIO = -2;
const PORTON_INGRESO = -1.5;
const PORTON_SALIDA = 6.5;

const limitar = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const suave = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2);

/** Levantar, trasladar y apoyar, para un avance m ∈ [0, 1] de la maniobra. */
function maniobra(m: number) {
  const elev = m < 0.2 ? m / 0.2 : m < 0.65 ? 1 : m < 0.85 ? (0.85 - m) / 0.2 : 0;
  return { elev: suave(limitar(elev)), tramo: suave(limitar((m - 0.2) / 0.45)), apoyado: m >= 0.85 };
}

/**
 * Coreografía del puente grúa para un instante t ∈ [0, N]:
 * en cada tramo levanta la carga, la traslada a la estación siguiente y la apoya.
 */
function coreografia(t: number) {
  const i = Math.min(N - 1, Math.max(0, Math.floor(t)));
  const desde = i === 0 ? INICIO : POSICIONES[i - 1];
  const { elev, tramo, apoyado } = maniobra(limitar((t - i) / TRASLADO));
  return { i, x: desde + (POSICIONES[i] - desde) * tramo, elev, apoyado };
}

/** Qué estación describe la escena: la señal y el panel cambian cuando el equipo se apoya. */
interface Vista {
  estacion: number;
  /** El equipo está apoyado en la estación: la señal y el rótulo llevan su color. */
  encendida: boolean;
  /** El equipo ya pasó por la estación (si no, todavía no llegó). */
  alcanzada: boolean;
}

function vista(i: number, elev: number, apoyado: boolean): Vista {
  if (apoyado) return { estacion: i, encendida: true, alcanzada: true };
  if (i === 0) return { estacion: 0, encendida: false, alcanzada: false };
  // Hasta que la carga se despega del piso, el equipo sigue en la estación anterior.
  return { estacion: i - 1, encendida: elev < 0.02, alcanzada: true };
}

function variante(k: number, v: Vista): VarianteSenal {
  if (k < v.estacion) return "pasada";
  if (k > v.estacion) return "futura";
  return v.encendida ? "activa" : v.alcanzada ? "pasada" : "futura";
}

/**
 * "Recorrido del taller": un travelling lateral por la nave atado al scroll.
 * El puente grúa lleva el transformador de estación en estación; al apoyarlo,
 * la señal de esa estación se enciende con su color y destella.
 */
export function EscenaRecorrido() {
  const seccion = useRef<HTMLDivElement>(null);
  const visor = useRef<HTMLDivElement>(null);
  const [v, setVista] = useState<Vista>({ estacion: 0, encendida: false, alcanzada: false });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let objetivo = 0;
    let actual = 0;
    let xPrevia = INICIO;
    let angulo = 0;
    let velocidadAngular = 0;
    let ultimo = performance.now();
    let cuadroPendiente = 0;
    let clavePrevia = "";

    const cuadro = (ahora: number) => {
      cuadroPendiente = 0;
      const dt = Math.min(0.05, Math.max(0.001, (ahora - ultimo) / 1000));
      ultimo = ahora;

      // La cámara sigue al scroll con inercia, independiente de la frecuencia de cuadros.
      actual += (objetivo - actual) * (1 - Math.pow(0.002, dt));
      if (Math.abs(objetivo - actual) < 0.0004) actual = objetivo;

      const { i, x, elev, apoyado } = coreografia(actual);

      // Balanceo de la carga: un péndulo amortiguado que responde a la velocidad del traslado.
      const velocidad = (x - xPrevia) / dt;
      xPrevia = x;
      const anguloObjetivo = limitar(-velocidad * 2.4, -6, 6) * elev;
      const aceleracion = (anguloObjetivo - angulo) * 60 - velocidadAngular * 6;
      velocidadAngular += aceleracion * dt;
      angulo += velocidadAngular * dt;

      const el = visor.current;
      if (el) {
        el.style.setProperty("--x", x.toFixed(4));
        el.style.setProperty("--elev", elev.toFixed(4));
        // Apoyada en el piso, la carga no se inclina: el balanceo existe solo mientras cuelga.
        el.style.setProperty("--balanceo", `${(angulo * limitar(elev * 2.5)).toFixed(3)}deg`);
      }

      const nueva = vista(i, elev, apoyado);
      const clave = `${nueva.estacion}:${nueva.encendida}:${nueva.alcanzada}`;
      if (clave !== clavePrevia) {
        clavePrevia = clave;
        setVista(nueva);
      }

      const enMovimiento =
        actual !== objetivo || Math.abs(angulo) > 0.02 || Math.abs(velocidadAngular) > 0.02;
      if (enMovimiento) cuadroPendiente = requestAnimationFrame(cuadro);
    };

    const leerScroll = () => {
      const s = seccion.current;
      if (!s) return;
      const caja = s.getBoundingClientRect();
      const recorrido = Math.max(1, caja.height - window.innerHeight);
      objetivo = limitar(-caja.top / recorrido) * N;
      if (!cuadroPendiente) {
        ultimo = performance.now();
        cuadroPendiente = requestAnimationFrame(cuadro);
      }
    };

    // Solo escucha el scroll mientras la escena está cerca de la pantalla.
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          window.addEventListener("scroll", leerScroll, { passive: true });
          window.addEventListener("resize", leerScroll);
          leerScroll();
        } else {
          window.removeEventListener("scroll", leerScroll);
          window.removeEventListener("resize", leerScroll);
        }
      },
      { rootMargin: "200px 0px" },
    );
    if (seccion.current) observador.observe(seccion.current);

    return () => {
      observador.disconnect();
      window.removeEventListener("scroll", leerScroll);
      window.removeEventListener("resize", leerScroll);
      cancelAnimationFrame(cuadroPendiente);
    };
  }, []);

  const definicion = DEFINICIONES[ESTADOS[v.estacion]];

  return (
    <div
      ref={seccion}
      className="escena-recorrido relative mt-10 lg:mt-14"
      style={{ height: `calc(100svh + ${N * SCROLL_POR_ESTACION}svh)` }}
    >
      <div
        ref={visor}
        className="escena-visor sticky top-0 flex h-svh flex-col overflow-hidden border-y-[6px] border-acero bg-esmalte"
        style={{ "--x": INICIO, "--elev": 0, "--balanceo": "0deg" } as CSSProperties}
      >
        {/* Texto de la estación donde está el equipo */}
        <div className="flex items-start gap-5 px-5 pb-4 pt-6 sm:px-8 lg:gap-10 lg:px-12 lg:pb-6 lg:pt-9" aria-hidden="true">
          <p className="font-cartel text-[4.5rem] font-bold leading-[0.8] text-acero lg:text-[6rem]">{v.estacion + 1}</p>
          <div className="min-w-0 flex-1">
            <p
              className={`rotulo inline-block rounded-[0.375rem] px-3 py-2 text-xl font-extrabold leading-tight lg:text-[1.75rem] ${
                v.encendida
                  ? FRANJA[definicion.forma]
                  : "bg-transparent text-tinta outline-[3px] -outline-offset-[3px] outline-acero outline-dashed"
              }`}
            >
              {definicion.rotulo}
            </p>
            <p className="mt-3 max-w-[46ch] text-base text-grafito lg:text-lg">{definicion.significado}</p>
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
            <p className="rotulo text-[0.8125rem] text-grafito">
              Etapa {v.estacion + 1} de {N}
            </p>
            <div className="flex gap-1.5">
              {ESTADOS.map((e, k) => (
                <span
                  key={e}
                  className={`size-3 rounded-[2px] border-2 ${
                    k === v.estacion ? "border-tinta bg-naranja" : k < v.estacion ? "border-acero bg-acero" : "border-acero"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* La nave del taller */}
        <div className="relative flex-1" aria-hidden="true">
          <div className="escena-pared" />
          <div className="escena-pista">
            <div className="escena-afuera escena-afuera--ingreso" style={{ "--g": PORTON_INGRESO } as CSSProperties} />
            <div className="escena-afuera escena-afuera--salida" style={{ "--g": PORTON_SALIDA } as CSSProperties} />
            {[PORTON_INGRESO, PORTON_SALIDA].map((g, k) => (
              <div key={g} className="escena-porton" style={{ "--g": g } as CSSProperties}>
                <span className="rotulo absolute -top-[2px] left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-t-[0.125rem] bg-tinta px-2 py-0.5 text-[0.8125rem] text-esmalte">
                  {k === 0 ? "Ingreso" : "Salida"}
                </span>
              </div>
            ))}
            {ESTADOS.map((estado, k) => {
              const d = DEFINICIONES[estado];
              const var_ = variante(k, v);
              return (
                <div key={estado} className="escena-estacion" style={{ "--pos": POSICIONES[k] } as CSSProperties}>
                  <div className={`escena-cartel ${k === N - 1 ? "escena-cartel--derecha" : ""}`}>
                    <Senal
                      key={var_}
                      forma={d.forma}
                      pictograma={estado}
                      variante={var_}
                      destello={var_ === "activa"}
                      idDestello={`escena-${estado}`}
                      className={`block w-full ${var_ === "activa" ? "senal-entra" : ""}`}
                    />
                  </div>
                  <div className={`escena-bahia ${k === v.estacion ? "text-tinta" : "text-grafito"}`}>
                    <span className="font-cartel text-[1.75rem] font-extrabold leading-none lg:text-[2.5rem]">{k + 1}</span>
                    <span className="rotulo text-[0.8125rem] lg:text-[0.9375rem]">{d.nombre}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="escena-piso" />
          <div className="escena-viga" />
          <div className="escena-carro">
            <svg viewBox="0 0 140 44" className="block w-full" focusable="false">
              <circle cx="30" cy="8" r="7" fill="var(--color-tinta)" />
              <circle cx="110" cy="8" r="7" fill="var(--color-tinta)" />
              <rect x="8" y="12" width="124" height="28" rx="4" fill="var(--color-grafito)" stroke="var(--color-tinta)" strokeWidth="4" />
              <g className="escena-tambor">
                <circle cx="70" cy="26" r="10" fill="var(--color-esmalte)" stroke="var(--color-tinta)" strokeWidth="3" />
                <path d="M70 16 V36 M60 26 H80" stroke="var(--color-tinta)" strokeWidth="2.5" />
              </g>
            </svg>
          </div>
          <div className="escena-sombra" />
          <div className="escena-pendulo">
            <div className="escena-cable" />
            <div className="escena-carga">
              <TransformadorColgado />
            </div>
          </div>
          <div className="escena-frente" />
        </div>

        {/* Para lectores de pantalla: todas las etapas, en orden. */}
        <ol className="sr-only" aria-label="Recorrido de un equipo por el taller">
          {ESTADOS.map((e, k) => (
            <li key={e}>
              {k + 1}. {DEFINICIONES[e].rotulo}: {DEFINICIONES[e].significado}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Transformador de distribución colgado del gancho: cuba gris, radiadores, aisladores y placa. */
function TransformadorColgado() {
  return (
    <svg viewBox="0 0 160 224" className="block w-full" focusable="false">
      {/* Gancho y eslingas */}
      <rect x="70" y="0" width="20" height="20" rx="3" fill="var(--color-tinta)" />
      <path d="M80 20 v10 a9 9 0 1 0 9 9" fill="none" stroke="var(--color-tinta)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="80" cy="48" r="6" fill="none" stroke="var(--color-tinta)" strokeWidth="4" />
      <path d="M78 53 L35 96 M82 53 L125 96" stroke="var(--color-tinta)" strokeWidth="3" />
      <rect x="30" y="92" width="9" height="10" fill="var(--color-tinta)" />
      <rect x="121" y="92" width="9" height="10" fill="var(--color-tinta)" />
      {/* Aisladores */}
      {[56, 80, 104].map((x) => (
        <g key={x} fill="var(--color-tinta)">
          <rect x={x - 4} y="64" width="8" height="38" rx="2" />
          <rect x={x - 9} y="68" width="18" height="4" rx="2" />
          <rect x={x - 9} y="76" width="18" height="4" rx="2" />
          <rect x={x - 9} y="84" width="18" height="4" rx="2" />
        </g>
      ))}
      {/* Tapa, cuba y placa de características */}
      <rect x="28" y="100" width="104" height="9" rx="2" fill="var(--color-tinta)" />
      <rect x="32" y="108" width="96" height="96" fill="var(--color-acero)" />
      <rect x="62" y="138" width="36" height="24" rx="2" fill="var(--color-esmalte)" />
      <rect x="67" y="144" width="26" height="2.5" fill="var(--color-tinta)" />
      <rect x="67" y="150" width="26" height="2.5" fill="var(--color-tinta)" />
      <rect x="67" y="156" width="16" height="2.5" fill="var(--color-tinta)" />
      {/* Radiadores */}
      {[8, 132].map((x) => (
        <g key={x}>
          <rect x={x} y="118" width="20" height="76" rx="2" fill="var(--color-grafito)" />
          {[4, 9, 14].map((d) => (
            <rect key={d} x={x + d} y="123" width="2.5" height="66" fill="var(--color-esmalte)" opacity="0.55" />
          ))}
        </g>
      ))}
      <rect x="28" y="124" width="4" height="7" fill="var(--color-tinta)" />
      <rect x="28" y="182" width="4" height="7" fill="var(--color-tinta)" />
      <rect x="128" y="124" width="4" height="7" fill="var(--color-tinta)" />
      <rect x="128" y="182" width="4" height="7" fill="var(--color-tinta)" />
      {/* Base */}
      <rect x="24" y="204" width="112" height="10" rx="2" fill="var(--color-tinta)" />
      <rect x="30" y="214" width="16" height="10" fill="var(--color-tinta)" />
      <rect x="114" y="214" width="16" height="10" fill="var(--color-tinta)" />
    </svg>
  );
}
