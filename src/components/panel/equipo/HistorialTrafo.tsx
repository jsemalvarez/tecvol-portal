"use client";

import Link from "next/link";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { nombreDe, TextoEstado } from "@/components/portal/piezas";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { formatearFecha } from "@/lib/dominio/fechas";
import type { EquipoTaller } from "@/lib/dominio/tipos";

const enlace = "text-[0.9375rem] font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/**
 * Las reparaciones anteriores de un trafo, cuando el N.º de trafo ya pasó por el taller: es un reingreso.
 * Al registrar, "Usar estos datos" copia la chapa, el cliente y el uso de una de ellas, para no volver
 * a copiar la chapa. Los enlaces se abren en otra pestaña, así no se pierde lo que se está cargando.
 */
export function HistorialTrafo({
  reparaciones,
  empresaDe,
  nuevo,
  copiadoDe,
  onUsar,
}: {
  reparaciones: EquipoTaller[];
  empresaDe: (id: string) => string;
  /** Si se está registrando un equipo: solo entonces se ofrece copiar los datos. */
  nuevo: boolean;
  /** Código de la reparación de la que se copiaron los datos. */
  copiadoDe: string | null;
  onUsar: (reparacion: EquipoTaller) => void;
}) {
  const abiertas = reparaciones.filter((r) => r.estado !== "entregado");
  const copiada = reparaciones.find((r) => r.codigo === copiadoDe);

  return (
    <section aria-labelledby="historial-trafo" className="marco">
      <TornillosMarco />
      <div className="marco-cabecera">
        <h2 id="historial-trafo" className="rotulo text-base">
          Historial del trafo
        </h2>
        <span className="rotulo text-base">{reparaciones.length}</span>
      </div>
      <div className="marco-cuerpo flex flex-col gap-3 pb-0">
        <p className="max-w-[64ch]">
          {nuevo ? (
            <>
              <strong className="font-semibold">Es un reingreso:</strong> este trafo ya pasó por el taller. Para no copiar la chapa de
              nuevo, use los datos de una reparación anterior y revíselos con el equipo a la vista.
            </>
          ) : (
            "Otras reparaciones de este mismo trafo."
          )}
        </p>
        {nuevo && abiertas.length > 0 && (
          <p className="max-w-[64ch] font-medium">
            {abiertas.length === 1 ? "Una de estas reparaciones todavía no se entregó" : "Algunas de estas reparaciones todavía no se entregaron"}:
            revise que no esté registrando el mismo ingreso dos veces.
          </p>
        )}
        {copiada && (
          <p role="status" className="max-w-[64ch] text-[0.9375rem]">
            Se copiaron los datos de la reparación que ingresó el{" "}
            {copiada.etapas.ingresado ? formatearFecha(copiada.etapas.ingresado) : "(sin fecha)"}. Revíselos con la chapa del equipo.
          </p>
        )}
      </div>
      <ul className="mt-3">
        {reparaciones.map((r) => (
          <li key={r.codigo} className="marco-fila flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-[var(--marco-px)] py-4">
            <div className="min-w-0">
              <p className="font-semibold leading-snug">
                {r.etapas.ingresado ? `Ingresó el ${formatearFecha(r.etapas.ingresado)}` : "Sin fecha de ingreso"}
                {r.numeroOrden && <span className="font-normal"> · Orden {r.numeroOrden}</span>}
              </p>
              <p className="text-[0.9375rem] leading-snug">
                <TextoEstado equipo={r} />
              </p>
              <p className="text-[0.9375rem] leading-snug text-grafito">
                {[nombreDe(r), empresaDe(r.empresa), formatearCodigo(r.codigo)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href={`/panel/editar?codigo=${r.codigo}`} target="_blank" className={enlace}>
                Datos<span className="sr-only"> de la reparación que ingresó el {r.etapas.ingresado ? formatearFecha(r.etapas.ingresado) : "(sin fecha)"}, en otra pestaña</span>
              </Link>
              <Link href={`/panel/informe?codigo=${r.codigo}`} target="_blank" className={enlace}>
                Informe<span className="sr-only"> de la reparación que ingresó el {r.etapas.ingresado ? formatearFecha(r.etapas.ingresado) : "(sin fecha)"}, en otra pestaña</span>
              </Link>
              <Link href={`/panel/datos-taller?codigo=${r.codigo}`} target="_blank" className={enlace}>
                Datos del taller<span className="sr-only"> de la reparación que ingresó el {r.etapas.ingresado ? formatearFecha(r.etapas.ingresado) : "(sin fecha)"}, en otra pestaña</span>
              </Link>
              {nuevo && (
                <button type="button" onClick={() => onUsar(r)} className="placa-secundaria">
                  {copiadoDe === r.codigo ? "Volver a copiar" : "Usar estos datos"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
