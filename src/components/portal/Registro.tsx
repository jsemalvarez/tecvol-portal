"use client";

import { useState } from "react";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { Dialogo } from "@/components/panel/Dialogo";
import { Senal } from "@/components/senal/Senal";
import { PICTOGRAMA_DE_FORMA } from "@/components/senal/pictogramas";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES, FORMAS } from "@/lib/dominio/estados";
import type { EquipoCliente, PortalCliente } from "@/lib/dominio/tipos";
import { Compartir } from "./Compartir";
import { PaginaPortal } from "./PaginaPortal";
import { agrupar, LineaEtapas, nombreDe, TextoEstado } from "./piezas";

/** Portal de clientes: la misma placa del ejemplo del inicio, con una fila por equipo que se abre para ver sus etapas. */
export function PortalRegistro() {
  return <PaginaPortal>{(portal) => <Registro portal={portal} />}</PaginaPortal>;
}

function Registro({ portal }: { portal: PortalCliente }) {
  const { enTaller, entregados } = agrupar(portal.equipos);
  return (
    <div className="mt-10 grid gap-x-12 gap-y-12 lg:grid-cols-12">
      <div className="flex flex-col gap-10 lg:col-span-8">
        {enTaller.length > 0 && <Tabla id="en-taller" titulo="En el taller" equipos={enTaller} empresa={portal.empresa} />}
        {entregados.length > 0 && <Tabla id="entregados" titulo="Entregados" equipos={entregados} empresa={portal.empresa} />}
      </div>
      <aside aria-labelledby="titulo-claves" className="lg:col-span-4">
        <div className="lg:sticky lg:top-8">
          <h2 id="titulo-claves" className="rotulo border-b-[3px] border-acero pb-2 text-[0.9375rem]">
            Cómo leer las señales
          </h2>
          <ul>
            {FORMAS.map((f) => (
              <li key={f.forma} className="flex items-center gap-4 border-b border-acero py-3">
                <Senal forma={f.forma} pictograma={PICTOGRAMA_DE_FORMA[f.forma]} simple className="size-10 shrink-0" />
                <p>
                  <span className="block font-semibold">{f.figura}</span>
                  <span className="text-[0.9375rem] text-grafito">{f.indica}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function Tabla({ id, titulo, equipos, empresa }: { id: string; titulo: string; equipos: EquipoCliente[]; empresa: string }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [compartido, setCompartido] = useState<EquipoCliente | null>(null);
  return (
    <section aria-labelledby={`titulo-${id}`} className="marco">
      <TornillosMarco />
      <div className="marco-cabecera">
        <h2 id={`titulo-${id}`} className="rotulo text-base">
          {titulo}
        </h2>
        <span className="rotulo text-base">{equipos.length}</span>
      </div>
      <ul>
        {equipos.map((equipo) => {
          const definicion = DEFINICIONES[equipo.estado];
          const estaAbierto = abierto === equipo.codigo;
          const panel = `etapas-${equipo.codigo}`;
          return (
            <li key={equipo.codigo} className="marco-fila">
              <button
                type="button"
                aria-expanded={estaAbierto}
                aria-controls={panel}
                onClick={() => setAbierto(estaAbierto ? null : equipo.codigo)}
                className="grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 px-[var(--marco-px)] py-4 text-left transition-colors hover:bg-esmalte focus-visible:outline-offset-[-3px] sm:grid-cols-[auto_minmax(0,0.85fr)_minmax(0,1.35fr)_auto] sm:gap-x-6"
              >
                <Senal forma={definicion.forma} pictograma={equipo.estado} simple className="size-12 sm:size-14" />
                <span className="min-w-0">
                  <span className="rotulo block text-lg font-extrabold">{definicion.rotulo}</span>
                  <span className="block text-[0.9375rem]">
                    <TextoEstado equipo={equipo} />
                  </span>
                </span>
                <span className="col-span-2 col-start-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-auto sm:row-start-auto">
                  <span className="block font-semibold">{nombreDe(equipo)}</span>
                  {equipo.referencia && equipo.equipo && <span className="block text-[0.9375rem]">{equipo.equipo}</span>}
                  <span className="block text-[0.9375rem] tracking-[0.04em]">{formatearCodigo(equipo.codigo)}</span>
                </span>
                <Chevron abierto={estaAbierto} />
              </button>
              <div id={panel} hidden={!estaAbierto} className="border-t border-dashed border-acero bg-esmalte/60 px-[var(--marco-px)] pb-6 pt-5">
                <p className="max-w-[60ch]">{definicion.significado}</p>
                <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-[0.9375rem]">
                  {equipo.serie && (
                    <div className="flex gap-2">
                      <dt className="rotulo pt-0.5 text-[0.8125rem]">Serie</dt>
                      <dd>{equipo.serie}</dd>
                    </div>
                  )}
                  {equipo.estado !== "listo" && equipo.estado !== "entregado" && (
                    <div className="flex gap-2">
                      <dt className="rotulo pt-0.5 text-[0.8125rem]">Entrega estimada</dt>
                      <dd>A confirmar por el taller</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-5">
                  <LineaEtapas equipo={equipo} />
                </div>
                <button type="button" onClick={() => setCompartido(equipo)} className="placa-secundaria mt-6">
                  Compartir seguimiento
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <Dialogo abierto={!!compartido} titulo="Compartir seguimiento" onCerrar={() => setCompartido(null)} ancho="max-w-[34rem]">
        {compartido && <Compartir equipo={compartido} empresa={empresa} />}
      </Dialogo>
    </section>
  );
}

function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="rotulo hidden text-[0.8125rem] md:inline">{abierto ? "Cerrar" : "Etapas"}</span>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`size-5 shrink-0 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}
