"use client";

import Link from "next/link";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { TextoEstado } from "@/components/portal/piezas";
import { Senal } from "@/components/senal/Senal";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES } from "@/lib/dominio/estados";
import { formatearFecha } from "@/lib/dominio/fechas";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { nombreOrden, normalizarNumero } from "@/lib/dominio/trafo";
import { MarcaTemporal } from "./campos";

const enlace = "text-[0.9375rem] font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/**
 * Las órdenes de trabajo de un transformador, cada una con su estado, su fecha de ingreso, su motivo y
 * enlaces a su ficha, su informe y sus datos del taller. Si ingresó con otro N.º T que el de hoy, se dice.
 */
export function ListaOrdenes({ ordenes }: { ordenes: EquipoTaller[] }) {
  return (
    <ul>
      {ordenes.map((r) => {
        const definicion = DEFINICIONES[r.estado];
        const nombre = nombreOrden(r);
        return (
          <li key={r.codigo} className="marco-fila flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-[var(--marco-px)] py-4">
            <div className="flex min-w-0 items-start gap-3">
              <Senal forma={definicion.forma} pictograma={r.estado} simple className="size-10 shrink-0" />
              <div className="min-w-0">
                <p className="leading-snug">
                  <Link href={`/panel/equipo?codigo=${r.codigo}`} className={`font-semibold underline decoration-acero decoration-1 underline-offset-4 hover:decoration-naranja hover:decoration-2 ${r.numeroOrden ? "" : "text-grafito"}`}>
                    {nombre}
                  </Link>
                  {r.numeroOrdenTemporal && <MarcaTemporal />}
                  <span className="text-[0.9375rem] tracking-[0.04em]"> · {formatearCodigo(r.codigo)}</span>
                </p>
                {normalizarNumero(r.numeroTIngreso ?? "") !== normalizarNumero(r.numeroT ?? "") && (
                  <p className="text-[0.9375rem] font-medium leading-snug">
                    {r.numeroTIngreso ? `Ingresó con el N.º T ${r.numeroTIngreso}` : "Ingresó sin N.º T"}
                    {r.numeroT ? `; hoy tiene el ${r.numeroT}.` : "; hoy no tiene N.º T."}
                  </p>
                )}
                <p className="text-[0.9375rem] leading-snug">
                  {r.baja ? (
                    <span className="font-semibold">Dada de baja el {formatearFecha(r.baja)}</span>
                  ) : r.estado === "ingresado" ? (
                    <TextoEstado equipo={r} />
                  ) : (
                    <>
                      {r.etapas.ingresado ? `Ingresó el ${formatearFecha(r.etapas.ingresado)}` : "Sin fecha de ingreso"} · <TextoEstado equipo={r} />
                    </>
                  )}
                </p>
                {(r.motivo || r.referencia) && (
                  <p className="text-[0.9375rem] leading-snug text-grafito">{[r.referencia, r.motivo].filter(Boolean).join(" · ")}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href={`/panel/informe?codigo=${r.codigo}`} className={enlace}>
                Informe<span className="sr-only"> de la {nombre}</span>
              </Link>
              <Link href={`/panel/datos-taller?codigo=${r.codigo}`} className={enlace}>
                Datos del taller<span className="sr-only"> de la {nombre}</span>
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Junto a una orden: las demás órdenes del mismo transformador, con un enlace a su ficha. */
export function HistorialTrafo({ trafo, ordenes }: { trafo: string; ordenes: EquipoTaller[] }) {
  return (
    <section aria-labelledby={`historial-${trafo}`} className="marco">
      <TornillosMarco />
      <div className="marco-cabecera">
        <h2 id={`historial-${trafo}`} className="rotulo text-base">
          Otras O.T. del transformador
        </h2>
        <span className="rotulo text-base">{ordenes.length}</span>
      </div>
      <p className="marco-cuerpo pb-2 text-[0.9375rem]">
        De la más nueva a la más vieja.{" "}
        <Link href={`/panel/transformador?id=${trafo}`} className={enlace}>
          Ver el transformador
        </Link>
      </p>
      <ListaOrdenes ordenes={ordenes} />
    </section>
  );
}
