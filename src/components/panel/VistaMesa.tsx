"use client";

import { useState } from "react";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { nombreDe, TextoEstado } from "@/components/portal/piezas";
import { Senal } from "@/components/senal/Senal";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES } from "@/lib/dominio/estados";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { Dialogo } from "./Dialogo";
import { BarraFiltros, useFiltros } from "./Filtros";
import { FormularioEstado } from "./FormularioEstado";
import { PaginaPanel, type ApiPanel } from "./PaginaPanel";

/** Mesa: la lista a la izquierda y, a la derecha, el equipo elegido con su estado para cambiarlo ahí mismo. */
export function PanelMesa() {
  return <PaginaPanel seccion="equipos">{(api) => <Mesa api={api} />}</PaginaPanel>;
}

/** Desde 1024px el equipo va al lado de la lista; antes, se abre en una ventana. */
const CON_PANEL = "(min-width: 64rem)";

const recientes = (a: EquipoTaller, b: EquipoTaller) => (b.actualizado?.getTime() ?? 0) - (a.actualizado?.getTime() ?? 0);

function Mesa({ api }: { api: ApiPanel }) {
  const filtros = useFiltros(api.taller.equipos, api.taller.empresas);
  const equipos = [...filtros.filtrados].sort(recientes);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [enVentana, setEnVentana] = useState(false);
  const elegido = api.taller.equipos.find((e) => e.codigo === codigo) ?? equipos[0] ?? null;

  function elegir(equipo: EquipoTaller) {
    setCodigo(equipo.codigo);
    if (!window.matchMedia(CON_PANEL).matches) setEnVentana(true);
  }

  return (
    <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <BarraFiltros filtros={filtros} empresas={api.taller.empresas} total={api.taller.equipos.length} apilada />
        {equipos.length === 0 ? (
          <p className="mt-6">Ningún equipo coincide con la búsqueda.</p>
        ) : (
          <ul aria-label="Equipos" className="mt-4 space-y-1.5">
            {equipos.map((equipo) => {
              const definicion = DEFINICIONES[equipo.estado];
              const actual = equipo.codigo === elegido?.codigo;
              return (
                <li key={equipo.codigo}>
                  <button
                    type="button"
                    aria-current={actual ? "true" : undefined}
                    onClick={() => elegir(equipo)}
                    className={`flex w-full cursor-pointer items-center gap-4 rounded-[0.25rem] border-2 px-4 py-3 text-left transition-colors ${
                      actual ? "border-tinta bg-blanco shadow-placa" : "border-transparent hover:bg-blanco"
                    }`}
                  >
                    <Senal forma={definicion.forma} pictograma={equipo.estado} simple className="size-10 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug">{nombreDe(equipo)}</span>
                      <span className="block text-[0.9375rem] leading-snug">
                        <TextoEstado equipo={equipo} />
                      </span>
                      <span className="block text-[0.8125rem] leading-snug">
                        {api.empresaDe(equipo) || "Sin empresa"} · <span className="tracking-[0.04em]">{formatearCodigo(equipo.codigo)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="hidden lg:col-span-7 lg:block">
        {elegido && (
          <section aria-labelledby="mesa-titulo" className="marco lg:sticky lg:top-8">
            <TornillosMarco />
            <div className="marco-cabecera">
              <span className="rotulo text-base">Equipo · {formatearCodigo(elegido.codigo)}</span>
            </div>
            <div className="marco-cuerpo">
              <Detalle api={api} equipo={elegido} idTitulo="mesa-titulo" />
            </div>
          </section>
        )}
      </div>

      <Dialogo
        abierto={enVentana && !!elegido}
        titulo={elegido ? `Equipo · ${formatearCodigo(elegido.codigo)}` : "Equipo"}
        onCerrar={() => setEnVentana(false)}
        ancho="max-w-[44rem]"
      >
        {elegido && enVentana && <Detalle api={api} equipo={elegido} idTitulo="mesa-dialogo-titulo" onGuardado={() => setEnVentana(false)} />}
      </Dialogo>
    </div>
  );
}

function Detalle({ api, equipo, idTitulo, onGuardado }: { api: ApiPanel; equipo: EquipoTaller; idTitulo: string; onGuardado?: () => void }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 id={idTitulo} className="font-cartel text-[1.75rem] font-bold leading-[1.05]">
            {nombreDe(equipo)}
          </h2>
          {equipo.referencia && <p className="mt-1">{equipo.equipo}</p>}
          <p className="mt-1 text-[0.9375rem]">
            {[api.empresaDe(equipo) || "Sin empresa", equipo.serie && `Serie ${equipo.serie}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex gap-x-4">
          <button type="button" onClick={() => api.abrirEditar(equipo)} className="cursor-pointer font-semibold underline decoration-naranja decoration-2 underline-offset-4">
            Editar datos
          </button>
          <button type="button" onClick={() => api.abrirEtiqueta(equipo)} className="cursor-pointer font-semibold underline decoration-naranja decoration-2 underline-offset-4">
            Etiqueta
          </button>
        </div>
      </div>
      <div className="mt-7 border-t-2 border-acero pt-6">
        <FormularioEstado
          key={`${equipo.codigo}-${equipo.estado}`}
          equipo={equipo}
          acciones={api.acciones}
          enFila
          onGuardado={(anterior, nuevo) => {
            api.avisarCambio(anterior, equipo, nuevo);
            onGuardado?.();
          }}
        />
      </div>
    </div>
  );
}
