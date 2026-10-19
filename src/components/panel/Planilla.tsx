"use client";

import Link from "next/link";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { nombreDe, TextoEstado } from "@/components/portal/piezas";
import { Senal } from "@/components/senal/Senal";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES } from "@/lib/dominio/estados";
import { activos, type EquipoTaller } from "@/lib/dominio/tipos";
import { BarraFiltros, useFiltros } from "./Filtros";
import { PaginaPanel, type ApiPanel } from "./PaginaPanel";

/** Equipos del panel: todos en una tabla, del último que cambió al primero, con búsqueda y filtros. */
export function PanelPlanilla() {
  return <PaginaPanel seccion="equipos">{(api) => <Planilla api={api} />}</PaginaPanel>;
}

const recientes = (a: EquipoTaller, b: EquipoTaller) => (b.actualizado?.getTime() ?? 0) - (a.actualizado?.getTime() ?? 0);

function Planilla({ api }: { api: ApiPanel }) {
  const filtros = useFiltros(api.taller.equipos, api.taller.empresas);
  const equipos = [...filtros.filtrados].sort(recientes);
  const total = activos(api.taller.equipos).length;
  const vistaBajas = filtros.estado === "baja";

  return (
    <div className="mt-10">
      <BarraFiltros filtros={filtros} empresas={activos(api.taller.empresas)} total={total} conBajas={api.puede("baja-equipos")} />
      <div className="marco mt-6">
        <TornillosMarco />
        <div className="marco-cabecera">
          <span className="rotulo text-base">{vistaBajas ? "Equipos dados de baja" : "Equipos"}</span>
          <span className="rotulo text-base">{equipos.length}</span>
        </div>
        {vistaBajas && equipos.length === 0 ? (
          <p className="marco-cuerpo">No hay equipos dados de baja{filtros.texto || filtros.empresa ? " que coincidan con la búsqueda" : ""}.</p>
        ) : total === 0 && !vistaBajas ? (
          <p className="marco-cuerpo">Todavía no hay equipos. Registre el primero con "Registrar equipo".</p>
        ) : equipos.length === 0 ? (
          <p className="marco-cuerpo">Ningún equipo coincide con la búsqueda.</p>
        ) : (
          <>
            <table className="hidden w-full text-left md:table">
              <caption className="sr-only">Equipos del taller</caption>
              <thead className="border-b-2 border-acero bg-esmalte">
                <tr>
                  <th scope="col" className="rotulo py-3 pl-[var(--marco-px)] pr-4 text-[0.8125rem]">
                    Estado
                  </th>
                  <th scope="col" className="rotulo px-4 py-3 text-[0.8125rem]">
                    Equipo
                  </th>
                  <th scope="col" className="rotulo px-4 py-3 text-[0.8125rem]">
                    Empresa
                  </th>
                  <th scope="col" className="rotulo px-4 py-3 text-[0.8125rem]">
                    Código
                  </th>
                  <th scope="col" className="py-3 pl-4 pr-[var(--marco-px)]">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {equipos.map((equipo) => {
                  const definicion = DEFINICIONES[equipo.estado];
                  return (
                    <tr key={equipo.codigo} className="border-t border-acero first:border-t-0">
                      <td className="py-3.5 pl-[var(--marco-px)] pr-4 align-middle">
                        <div className="flex items-center gap-3">
                          <Senal forma={definicion.forma} pictograma={equipo.estado} simple className="size-10 shrink-0" />
                          <span className="text-[0.9375rem] leading-snug">
                            <TextoEstado equipo={equipo} />
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span className="block font-semibold leading-snug">{nombreDe(equipo)}</span>
                        {equipo.referencia && <span className="block text-[0.9375rem] leading-snug">{equipo.equipo}</span>}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-[0.9375rem]">{api.empresaDe(equipo) || <span className="text-grafito">Sin empresa</span>}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 align-middle text-[0.9375rem]">
                        <span className="block tracking-[0.04em]">{formatearCodigo(equipo.codigo)}</span>
                        {equipo.numeroOrden && <span className="block text-grafito">Orden {equipo.numeroOrden}</span>}
                      </td>
                      <td className="py-3.5 pl-4 pr-[var(--marco-px)] align-middle">
                        <Acciones api={api} equipo={equipo} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ul className="md:hidden">
              {equipos.map((equipo) => {
                const definicion = DEFINICIONES[equipo.estado];
                return (
                  <li key={equipo.codigo} className="marco-fila px-[var(--marco-px)] py-4">
                    <div className="flex items-start gap-3">
                      <Senal forma={definicion.forma} pictograma={equipo.estado} simple className="size-10 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug">{nombreDe(equipo)}</p>
                        <p className="text-[0.9375rem] leading-snug">
                          <TextoEstado equipo={equipo} />
                        </p>
                        <p className="text-[0.9375rem] leading-snug">
                          {api.empresaDe(equipo) || "Sin empresa"} · <span className="tracking-[0.04em]">{formatearCodigo(equipo.codigo)}</span>
                          {equipo.numeroOrden && <> · Orden {equipo.numeroOrden}</>}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Acciones api={api} equipo={equipo} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Acciones({ api, equipo }: { api: ApiPanel; equipo: EquipoTaller }) {
  const nombre = nombreDe(equipo);
  // Un equipo dado de baja no se trabaja: solo se puede reactivar.
  if (equipo.baja) {
    return (
      <div className="flex md:justify-end">
        <button
          type="button"
          onClick={() => api.reactivar("equipo", equipo.codigo, nombre)}
          className="placa-secundaria w-full justify-center whitespace-nowrap md:w-auto"
          aria-label={`Reactivar ${nombre}`}
        >
          Reactivar
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 md:justify-end md:gap-x-4 2xl:flex-nowrap">
      <button type="button" onClick={() => api.abrirEstado(equipo)} className="placa-secundaria w-full justify-center whitespace-nowrap md:w-auto" aria-label={`Cambiar el estado de ${nombre}`}>
        Cambiar estado
      </button>
      {/* Los enlaces van juntos: en pantallas medianas pasan abajo del botón en vez de desbordar la fila. */}
      <span className="flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-end">
        <Link
          href={`/panel/editar?codigo=${equipo.codigo}`}
          className="text-[0.9375rem] font-semibold underline decoration-naranja decoration-2 underline-offset-4"
          aria-label={`Editar los datos de ${nombre}`}
        >
          Editar
        </Link>
        <Link
          href={`/panel/informe?codigo=${equipo.codigo}`}
          className="text-[0.9375rem] font-semibold underline decoration-naranja decoration-2 underline-offset-4"
          aria-label={`Informe de diagnóstico de ${nombre}`}
        >
          Informe
        </Link>
        <Link
          href={`/panel/bobinado?codigo=${equipo.codigo}`}
          className="text-[0.9375rem] font-semibold underline decoration-naranja decoration-2 underline-offset-4"
          aria-label={`Datos de bobinado de ${nombre}`}
        >
          Bobinado
        </Link>
        <button
          type="button"
          onClick={() => api.abrirEtiqueta(equipo)}
          className="cursor-pointer text-[0.9375rem] font-semibold underline decoration-naranja decoration-2 underline-offset-4"
          aria-label={`Etiqueta de ${nombre}`}
        >
          Etiqueta
        </button>
      </span>
    </div>
  );
}
