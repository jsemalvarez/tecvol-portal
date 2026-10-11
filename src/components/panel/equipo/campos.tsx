"use client";

import { useId, type ReactNode } from "react";
import { MensajeCampo } from "../Dialogo";

/** Lugar a la derecha del renglón para la unidad, según su largo, así el número no queda debajo. */
const RESERVA_UNIDAD: Record<number, string> = { 1: "pr-6", 2: "pr-9" };

/** Barlow no tiene letras griegas: la Ω de MΩ se dibuja con Arial, que sí la tiene, en vez de un reemplazo deformado. */
const conSimbolos = (unidad: string) => /[^\u0000-\u024f]/.test(unidad);

function Obligatorio() {
  return <span className="font-semibold normal-case tracking-normal text-grafito"> (obligatorio)</span>;
}

/**
 * Un renglón para completar, con su rótulo, la unidad al final de la línea (kVA, V, %) si la tiene,
 * una ayuda debajo y el error en rojo. Los números se escriben con coma o con punto.
 */
export function CampoTexto({
  id,
  etiqueta,
  contexto,
  valor,
  onCambio,
  error,
  ayuda,
  obligatorio,
  unidad,
  numerico,
  lista,
  maxLength = 120,
  className = "",
  ancho = "",
}: {
  id: string;
  etiqueta: string;
  /** Lo que el rótulo deja implícito y ya dice el título de arriba ("del primario"), para lectores de pantalla. */
  contexto?: string;
  valor: string;
  onCambio: (valor: string) => void;
  error?: string;
  ayuda?: ReactNode;
  obligatorio?: boolean;
  unidad?: string;
  numerico?: boolean;
  /** Id de un `<datalist>` con sugerencias. */
  lista?: string;
  maxLength?: number;
  className?: string;
  /** Ancho máximo de la línea; los números no necesitan todo el renglón. */
  ancho?: string;
}) {
  const describe = [ayuda ? `${id}-ayuda` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <div className={className}>
      <label htmlFor={id} className="rotulo block text-[0.9375rem]">
        {etiqueta}
        {contexto && <span className="sr-only"> {contexto}</span>}
        {unidad && <span className="sr-only">, en {unidad}</span>}
        {obligatorio && <Obligatorio />}
      </label>
      <div className={`relative mt-1 ${ancho}`}>
        <input
          id={id}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          maxLength={maxLength}
          inputMode={numerico ? "decimal" : undefined}
          autoComplete="off"
          spellCheck={numerico ? false : undefined}
          list={lista}
          aria-invalid={error ? true : undefined}
          aria-describedby={describe || undefined}
          className={`renglon ${unidad ? (RESERVA_UNIDAD[unidad.length] ?? "pr-12") : ""}`}
        />
        {unidad && (
          <span aria-hidden="true" className={`pointer-events-none absolute bottom-2.5 right-0 text-base font-bold text-grafito ${conSimbolos(unidad) ? "[font-family:Arial,sans-serif] text-[0.9375rem]" : "font-cartel"}`}>
            {unidad}
          </span>
        )}
      </div>
      {ayuda && (
        <p id={`${id}-ayuda`} className="mt-2 text-[0.9375rem] leading-snug text-grafito">
          {ayuda}
        </p>
      )}
      <MensajeCampo id={`${id}-error`} texto={error} />
    </div>
  );
}

/** Opciones a la vista, como casillas de la planilla: se elige una tocando la placa entera. */
export function Opciones<T extends string>({
  id,
  leyenda,
  opciones,
  valor,
  onCambio,
  error,
  obligatorio,
  className = "",
}: {
  id: string;
  leyenda: string;
  opciones: { valor: T; etiqueta: string }[];
  valor: T;
  onCambio: (valor: T) => void;
  error?: string;
  obligatorio?: boolean;
  className?: string;
}) {
  return (
    <fieldset className={className} aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="rotulo text-[0.9375rem]">
        {leyenda}
        {obligatorio && <Obligatorio />}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {opciones.map((opcion) => {
          const elegida = opcion.valor === valor;
          return (
            <label
              key={opcion.valor}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[0.25rem] border-2 px-4 py-2 transition-colors ${
                elegida ? "border-tinta bg-blanco" : "border-transparent bg-esmalte hover:border-acero"
              }`}
            >
              <input
                type="radio"
                name={id}
                value={opcion.valor}
                checked={elegida}
                onChange={() => onCambio(opcion.valor)}
                aria-invalid={error ? true : undefined}
                className="size-4 shrink-0 accent-[var(--color-tinta)]"
              />
              <span className={elegida ? "font-semibold" : ""}>{opcion.etiqueta}</span>
            </label>
          );
        })}
      </div>
      <MensajeCampo id={`${id}-error`} texto={error} />
    </fieldset>
  );
}

/**
 * Opciones compactas para una fila de la planilla (OK / Regular / Mal): sin leyenda propia, porque la
 * fila ya dice de qué se trata; `etiqueta` la nombra para lectores de pantalla.
 */
export function Pastillas<T extends string>({
  nombre,
  etiqueta,
  opciones,
  valor,
  onCambio,
}: {
  nombre: string;
  etiqueta: string;
  opciones: { valor: T; etiqueta: string }[];
  valor: T | "";
  onCambio: (valor: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap gap-1">
      {opciones.map((opcion) => {
        const elegida = opcion.valor === valor;
        return (
          <label
            key={opcion.valor}
            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-[0.25rem] border-2 px-2.5 py-1 text-[0.9375rem] transition-colors ${
              elegida ? "border-tinta bg-blanco font-semibold" : "border-transparent bg-esmalte hover:border-acero"
            }`}
          >
            <input
              type="radio"
              name={nombre}
              value={opcion.valor}
              checked={elegida}
              onChange={() => onCambio(opcion.valor)}
              className="size-3.5 shrink-0 accent-[var(--color-tinta)]"
            />
            {opcion.etiqueta}
          </label>
        );
      })}
    </div>
  );
}

/** Sugerencias para un renglón: aparecen al escribir, pero se puede escribir cualquier otra cosa. */
export function Sugerencias({ id, valores }: { id: string; valores: string[] }) {
  return (
    <datalist id={id}>
      {valores.map((v) => (
        <option key={v} value={v} />
      ))}
    </datalist>
  );
}

/**
 * Un grupo de datos dentro de la placa, como los recuadros de la chapa: una banda esmaltada con el
 * nombre del grupo y, debajo, sus renglones.
 */
export function Grupo({ titulo, ayuda, primero, children }: { titulo: string; ayuda?: ReactNode; primero?: boolean; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={primero ? "" : "border-t-2 border-acero"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-acero bg-esmalte px-[var(--marco-px)] py-2.5">
        <h3 id={id} className="rotulo text-[0.9375rem]">
          {titulo}
        </h3>
        {ayuda && <p className="text-[0.9375rem] leading-snug text-grafito">{ayuda}</p>}
      </div>
      <div className="px-[var(--marco-px)] pb-7 pt-6">{children}</div>
    </section>
  );
}
