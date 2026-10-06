"use client";

import { useState } from "react";
import { nombreDe } from "@/components/portal/piezas";
import { Senal } from "@/components/senal/Senal";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES, ESTADOS, estadoSiguiente } from "@/lib/dominio/estados";
import { formatearFecha } from "@/lib/dominio/fechas";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { BarraFiltros, useFiltros } from "./Filtros";
import { PaginaPanel, type ApiPanel } from "./PaginaPanel";

/** Etapas: una columna por etapa del taller, con un botón para pasar cada equipo a la siguiente. */
export function PanelEtapas() {
  return <PaginaPanel seccion="equipos">{(api) => <Etapas api={api} />}</PaginaPanel>;
}

const EN_TALLER = ESTADOS.filter((e) => e !== "entregado");
const DIA = 24 * 60 * 60 * 1000;

const desde = (e: EquipoTaller) => e.etapas[e.estado] ?? e.actualizado ?? null;

function Etapas({ api }: { api: ApiPanel }) {
  const filtros = useFiltros(api.taller.equipos, api.taller.empresas, "todos");
  const entregados = filtros.filtrados
    .filter((e) => e.estado === "entregado")
    .sort((a, b) => (desde(b)?.getTime() ?? 0) - (desde(a)?.getTime() ?? 0));

  return (
    <div className="mt-10">
      <BarraFiltros filtros={filtros} empresas={api.taller.empresas} total={api.taller.equipos.length} conEstado={false} />
      <div className="mt-8 grid gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-6">
        {EN_TALLER.map((estado, i) => {
          const definicion = DEFINICIONES[estado];
          // Los que llevan más tiempo en la etapa, primero.
          const aqui = filtros.filtrados
            .filter((e) => e.estado === estado)
            .sort((a, b) => (desde(a)?.getTime() ?? 0) - (desde(b)?.getTime() ?? 0));
          return (
            <section key={estado} aria-labelledby={`etapa-${estado}`}>
              <div className="flex items-center gap-3 border-b-[3px] border-acero pb-2">
                <Senal forma={definicion.forma} pictograma={estado} simple className="size-9 shrink-0" />
                <h2 id={`etapa-${estado}`} className="rotulo text-[0.9375rem] leading-tight">
                  <span className="text-grafito">{i + 1}.</span> {definicion.nombre}
                </h2>
                <span className="rotulo ml-auto text-[0.9375rem]">{aqui.length}</span>
              </div>
              {aqui.length === 0 ? (
                <p className="mt-3 text-[0.9375rem] text-grafito">Sin equipos</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {aqui.map((equipo) => (
                    <li key={equipo.codigo}>
                      <Tarjeta api={api} equipo={equipo} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {entregados.length > 0 && <Entregados api={api} equipos={entregados} />}
    </div>
  );
}

function Tarjeta({ api, equipo }: { api: ApiPanel; equipo: EquipoTaller }) {
  const [pasando, setPasando] = useState(false);
  const siguiente = estadoSiguiente(equipo.estado);
  const fecha = desde(equipo);
  const dias = fecha ? Math.max(0, Math.floor((Date.now() - fecha.getTime()) / DIA)) : null;
  const nombre = nombreDe(equipo);

  return (
    <div className="rounded-[0.25rem] border-2 border-acero bg-blanco p-3">
      <p className="font-semibold leading-snug">{nombre}</p>
      <p className="mt-0.5 text-[0.8125rem] leading-snug">{api.empresaDe(equipo) || "Sin empresa"}</p>
      <p className="mt-0.5 text-[0.8125rem] leading-snug">
        <span className="tracking-[0.04em]">{formatearCodigo(equipo.codigo)}</span>
        {fecha && (
          <>
            {" · "}
            <span title={`Desde el ${formatearFecha(fecha)}`}>{dias === 0 ? "desde hoy" : dias === 1 ? "1 día" : `${dias} días`}</span>
          </>
        )}
      </p>
      {siguiente && (
        <button
          type="button"
          disabled={pasando}
          onClick={async () => {
            setPasando(true);
            await api.pasarA(equipo, siguiente);
            setPasando(false);
          }}
          className="placa-secundaria mt-3 w-full justify-center whitespace-normal text-center leading-tight"
        >
          {pasando ? "Guardando…" : `Pasar a ${DEFINICIONES[siguiente].nombre}`}
        </button>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.8125rem]">
        <button type="button" onClick={() => api.abrirEstado(equipo)} className="cursor-pointer font-semibold underline decoration-naranja decoration-2 underline-offset-4" aria-label={`Elegir otro estado para ${nombre}`}>
          Otro estado
        </button>
        <button type="button" onClick={() => api.abrirEditar(equipo)} className="cursor-pointer font-semibold underline decoration-naranja decoration-2 underline-offset-4" aria-label={`Editar los datos de ${nombre}`}>
          Editar
        </button>
        <button type="button" onClick={() => api.abrirEtiqueta(equipo)} className="cursor-pointer font-semibold underline decoration-naranja decoration-2 underline-offset-4" aria-label={`Etiqueta de ${nombre}`}>
          Etiqueta
        </button>
      </div>
    </div>
  );
}

function Entregados({ api, equipos }: { api: ApiPanel; equipos: EquipoTaller[] }) {
  const [todos, setTodos] = useState(false);
  const visibles = todos ? equipos : equipos.slice(0, 5);
  return (
    <section aria-labelledby="titulo-entregados" className="mt-14">
      <div className="flex items-center gap-3 border-b-[3px] border-acero pb-2">
        <Senal forma="registro" pictograma="entregado" simple className="size-9 shrink-0" />
        <h2 id="titulo-entregados" className="rotulo text-[0.9375rem]">
          <span className="text-grafito">7.</span> Entregados
        </h2>
        <span className="rotulo ml-auto text-[0.9375rem]">{equipos.length}</span>
      </div>
      <ul>
        {visibles.map((equipo) => {
          const fecha = desde(equipo);
          return (
            <li key={equipo.codigo} className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-acero py-3">
              <span className="min-w-0 flex-1 basis-56">
                <span className="font-semibold">{nombreDe(equipo)}</span>
                <span className="text-[0.9375rem]"> · {api.empresaDe(equipo) || "Sin empresa"}</span>
              </span>
              <span className="text-[0.9375rem]">{fecha && `Entregado el ${formatearFecha(fecha)}`}</span>
              <span className="text-[0.9375rem] tracking-[0.04em]">{formatearCodigo(equipo.codigo)}</span>
              <button type="button" onClick={() => api.abrirEstado(equipo)} className="cursor-pointer text-[0.9375rem] font-semibold underline decoration-naranja decoration-2 underline-offset-4">
                Cambiar estado
              </button>
            </li>
          );
        })}
      </ul>
      {equipos.length > 5 && (
        <button type="button" onClick={() => setTodos((v) => !v)} className="mt-3 cursor-pointer font-semibold underline decoration-naranja decoration-2 underline-offset-4">
          {todos ? "Ver solo los últimos 5" : `Ver los ${equipos.length} entregados`}
        </button>
      )}
    </section>
  );
}
