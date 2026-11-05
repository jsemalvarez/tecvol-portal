"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Flecha } from "@/components/iconos";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { formatearFecha } from "@/lib/dominio/fechas";
import { activos, type EquipoTaller } from "@/lib/dominio/tipos";
import { nombreOrden, nombreTrafo, normalizarNumero, numerosTAnteriores, ordenesDelTrafo, resumenChapa } from "@/lib/dominio/trafo";
import { MarcaTemporal } from "../equipo/campos";
import { PaginaPanel, type ApiPanel } from "../PaginaPanel";

const vinculo = "font-semibold leading-snug underline decoration-acero decoration-1 underline-offset-4 hover:decoration-naranja hover:decoration-2";

/** La última O.T. de un transformador: la misma en la tabla y en la tarjeta. */
function UltimaOrden({ orden, className = "" }: { orden: EquipoTaller; className?: string }) {
  return (
    <>
      <Link href={`/panel/equipo?codigo=${orden.codigo}`} className={`${vinculo} ${className}`}>
        {nombreOrden(orden)}
      </Link>
      {orden.numeroOrdenTemporal && <MarcaTemporal />}
      <span className="block leading-snug">{orden.etapas.ingresado ? `Ingresó el ${formatearFecha(orden.etapas.ingresado)}` : "Sin fecha de ingreso"}</span>
    </>
  );
}

/**
 * Los transformadores de todos los clientes, con su última O.T. Se buscan por N.º de trafo, N.º T (también
 * uno que tuvieron antes), N.º de alguna de sus O.T., cliente o chapa. Desde 1024 px, una tabla con "Ver trafo"
 * en cada fila, como las órdenes; más angosto, tarjetas que se tocan enteras.
 */
export function PanelTransformadores() {
  return <PaginaPanel seccion="transformadores">{(api) => <Lista api={api} />}</PaginaPanel>;
}

function Lista({ api }: { api: ApiPanel }) {
  const id = useId();
  const [texto, setTexto] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [conBajas, setConBajas] = useState(false);
  const nombres = useMemo(() => new Map(api.taller.empresas.map((e) => [e.id, e.nombre])), [api.taller.empresas]);

  const filas = useMemo(() => {
    const buscado = normalizarNumero(texto);
    const palabras = texto.toLowerCase().split(/\s+/).filter(Boolean);
    const contiene = (numero: string | undefined) => buscado.length >= 2 && !!numero && normalizarNumero(numero).includes(buscado);
    return api.taller.transformadores
      .filter((t) => conBajas || !t.baja)
      .filter((t) => !empresa || t.empresa === empresa)
      .map((t) => {
        const ordenes = ordenesDelTrafo(api.taller.equipos, t.id);
        // Lo que coincidió y no se ve en la fila: un N.º T que tuvo antes o el N.º de una de sus O.T.
        let coincidencia: string | undefined;
        if (texto.trim() && !contiene(t.numero) && !contiene(t.numeroT)) {
          const anterior = numerosTAnteriores(api.taller.equipos, t).find(contiene);
          const orden = ordenes.find((o) => contiene(o.numeroOrden));
          if (anterior) coincidencia = `Antes ingresó con el N.º T ${anterior}`;
          else if (orden) coincidencia = `Tuvo la ${nombreOrden(orden)}`;
        }
        return { trafo: t, ordenes, coincidencia };
      })
      .filter(({ trafo: t, coincidencia }) => {
        if (!texto.trim() || coincidencia || contiene(t.numero) || contiene(t.numeroT)) return true;
        const resto = [t.equipo, t.placa?.fabricante, nombres.get(t.empresa)].filter(Boolean).join(" ").toLowerCase();
        return palabras.every((p) => resto.includes(p));
      })
      .sort((a, b) => (b.ordenes[0]?.etapas.ingresado?.getTime() ?? 0) - (a.ordenes[0]?.etapas.ingresado?.getTime() ?? 0));
  }, [api.taller.transformadores, api.taller.equipos, texto, empresa, conBajas, nombres]);

  // Contra lo que se está mirando: con los dados de baja a la vista, ellos también cuentan.
  const total = conBajas ? api.taller.transformadores.length : activos(api.taller.transformadores).length;

  return (
    <div className="mt-10">
      <div role="search" aria-label="Buscar transformadores" className="flex flex-wrap items-end gap-x-8 gap-y-5">
        <div className="min-w-[16rem] flex-[2_1_20rem]">
          <label htmlFor={`${id}-texto`} className="rotulo block text-[0.8125rem]">
            Buscar
          </label>
          <input
            id={`${id}-texto`}
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="N.º de trafo, N.º T, N.º de O.T., empresa o fabricante"
            className="renglon mt-1"
          />
        </div>
        <div className="min-w-[14rem] flex-[1_1_14rem]">
          <label htmlFor={`${id}-empresa`} className="rotulo block text-[0.8125rem]">
            Empresa
          </label>
          <select id={`${id}-empresa`} value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="renglon mt-1">
            <option value="">Todas</option>
            {activos(api.taller.empresas).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-2 text-[0.9375rem]">
          <input type="checkbox" checked={conBajas} onChange={(e) => setConBajas(e.target.checked)} className="size-4 accent-tinta" />
          Mostrar los dados de baja
        </label>
      </div>
      <p className="mt-3 text-[0.9375rem] text-grafito" aria-live="polite">
        {filas.length === total ? `${total} ${total === 1 ? "transformador" : "transformadores"}` : `${filas.length} de ${total} transformadores`}
      </p>

      <div className="marco mt-6">
        <TornillosMarco />
        <div className="marco-cabecera">
          <span className="rotulo text-base">Transformadores</span>
          <span className="rotulo text-base">{filas.length}</span>
        </div>
        {filas.length === 0 ? (
          <p className="marco-cuerpo">{total === 0 ? "Todavía no hay transformadores: se dan de alta con «Nuevo transformador» o al crear su primera O.T." : "Ninguno coincide con la búsqueda."}</p>
        ) : (
          <>
            <table className="hidden w-full text-left lg:table">
              <caption className="sr-only">Transformadores del taller</caption>
              <thead className="border-b-2 border-acero bg-esmalte">
                <tr>
                  <th scope="col" className="rotulo py-3 pl-[var(--marco-px)] pr-4 text-[0.8125rem]">
                    Transformador
                  </th>
                  <th scope="col" className="rotulo px-4 py-3 text-[0.8125rem]">
                    Empresa
                  </th>
                  <th scope="col" className="rotulo px-4 py-3 text-[0.8125rem]">
                    O.T.
                  </th>
                  <th scope="col" className="rotulo px-4 py-3 text-[0.8125rem]">
                    Última O.T.
                  </th>
                  <th scope="col" className="py-3 pl-4 pr-[var(--marco-px)]">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map(({ trafo, ordenes, coincidencia }) => {
                  const ultima = ordenes[0];
                  return (
                    <tr key={trafo.id} className={`border-t border-acero first:border-t-0 ${trafo.baja ? "text-grafito" : ""}`}>
                      <td className="py-3.5 pl-[var(--marco-px)] pr-4 align-middle">
                        <Link href={`/panel/transformador?id=${trafo.id}`} className={vinculo}>
                          {nombreTrafo(trafo)}
                        </Link>
                        {trafo.provisorio && <MarcaTemporal />}
                        <span className="block text-[0.9375rem] leading-snug">
                          {resumenChapa(trafo)}
                          {trafo.baja && <> · Dado de baja el {formatearFecha(trafo.baja)}</>}
                        </span>
                        {coincidencia && <span className="block text-[0.9375rem] font-medium leading-snug">{coincidencia}</span>}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-[0.9375rem]">{nombres.get(trafo.empresa) ?? "Sin empresa"}</td>
                      <td className="px-4 py-3.5 align-middle text-[0.9375rem]">{ordenes.length}</td>
                      <td className="px-4 py-3.5 align-middle text-[0.9375rem]">
                        {ultima ? <UltimaOrden orden={ultima} /> : <span className="text-grafito">Sin O.T.</span>}
                      </td>
                      <td className="py-3.5 pl-4 pr-[var(--marco-px)] align-middle">
                        <div className="flex justify-end">
                          <Link
                            href={`/panel/transformador?id=${trafo.id}`}
                            className="placa-secundaria justify-center whitespace-nowrap"
                            aria-label={`Ver trafo ${nombreTrafo(trafo)}`}
                          >
                            Ver trafo
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ul className="lg:hidden">
              {filas.map(({ trafo, ordenes, coincidencia }) => {
                const ultima = ordenes[0];
                return (
                  <li key={trafo.id} className={`marco-fila relative px-[var(--marco-px)] py-3.5 transition-colors hover:bg-esmalte ${trafo.baja ? "text-grafito" : ""}`}>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="grid min-w-0 flex-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                        <div className="min-w-0">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {/* Toda la tarjeta lleva a la ficha: el enlace se estira sobre ella. */}
                            <Link
                              href={`/panel/transformador?id=${trafo.id}`}
                              aria-label={`Ver el transformador ${nombreTrafo(trafo)}`}
                              className={`${vinculo} after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:-outline-offset-3 focus-visible:after:outline-tinta`}
                            >
                              {nombreTrafo(trafo)}
                            </Link>
                            {trafo.provisorio && <MarcaTemporal className="" />}
                          </span>
                          <p className="text-[0.9375rem] leading-snug">
                            {resumenChapa(trafo)}
                            {trafo.baja && <> · Dado de baja el {formatearFecha(trafo.baja)}</>}
                          </p>
                          {coincidencia && <p className="text-[0.9375rem] font-medium leading-snug">{coincidencia}</p>}
                          <p className="text-[0.9375rem] leading-snug text-grafito">{nombres.get(trafo.empresa) ?? "Sin empresa"}</p>
                        </div>
                        <div className="text-[0.9375rem] leading-snug">
                          {ultima ? (
                            <>
                              {/* Por encima del enlace de la tarjeta, para que lleve a la O.T. */}
                              <UltimaOrden orden={ultima} className="relative z-[1]" />
                              <span className="block text-grafito">{ordenes.length} O.T. en total</span>
                            </>
                          ) : (
                            <span className="text-grafito">Sin O.T.</span>
                          )}
                        </div>
                      </div>
                      <Flecha className="size-5 shrink-0 text-grafito" />
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
