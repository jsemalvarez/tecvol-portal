"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { formatearFecha } from "@/lib/dominio/fechas";
import { activos } from "@/lib/dominio/tipos";
import { nombreOrden, nombreTrafo, normalizarNumero, numerosTAnteriores, ordenesDelTrafo } from "@/lib/dominio/trafo";
import { MarcaTemporal } from "../equipo/campos";
import { resumenChapa } from "../equipo/FormularioOT";
import { PaginaPanel, type ApiPanel } from "../PaginaPanel";

const vinculo = "font-semibold leading-snug underline decoration-acero decoration-1 underline-offset-4 hover:decoration-naranja hover:decoration-2";

/**
 * Los transformadores de todos los clientes, con su última O.T. Se buscan por N.º de trafo, N.º T (también
 * uno que tuvieron antes), N.º de alguna de sus O.T., cliente o chapa.
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

  const total = activos(api.taller.transformadores).length;

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
            placeholder="N.º de trafo, N.º T, N.º de O.T., cliente o fabricante"
            className="renglon mt-1"
          />
        </div>
        <div className="min-w-[14rem] flex-[1_1_14rem]">
          <label htmlFor={`${id}-empresa`} className="rotulo block text-[0.8125rem]">
            Cliente
          </label>
          <select id={`${id}-empresa`} value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="renglon mt-1">
            <option value="">Todos</option>
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
        {filas.length === total && !conBajas ? `${total} ${total === 1 ? "transformador" : "transformadores"}` : `${filas.length} de ${total} transformadores`}
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left">
              <caption className="sr-only">Transformadores del taller</caption>
              <thead className="border-b-2 border-acero bg-esmalte">
                <tr>
                  <th scope="col" className="rotulo py-3 pl-[var(--marco-px)] pr-4 text-[0.8125rem]">
                    Transformador
                  </th>
                  <th scope="col" className="rotulo px-4 py-3 text-[0.8125rem]">
                    Cliente
                  </th>
                  <th scope="col" className="rotulo px-4 py-3 text-[0.8125rem]">
                    O.T.
                  </th>
                  <th scope="col" className="rotulo py-3 pl-4 pr-[var(--marco-px)] text-[0.8125rem]">
                    Última O.T.
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
                      <td className="px-4 py-3.5 align-middle text-[0.9375rem]">{nombres.get(trafo.empresa) ?? "Sin cliente"}</td>
                      <td className="px-4 py-3.5 align-middle text-[0.9375rem]">{ordenes.length}</td>
                      <td className="py-3.5 pl-4 pr-[var(--marco-px)] align-middle text-[0.9375rem]">
                        {ultima ? (
                          <>
                            <Link href={`/panel/equipo?codigo=${ultima.codigo}`} className={vinculo}>
                              {nombreOrden(ultima)}
                            </Link>
                            {ultima.numeroOrdenTemporal && <MarcaTemporal />}
                            <span className="block leading-snug">
                              {ultima.etapas.ingresado ? `Ingresó el ${formatearFecha(ultima.etapas.ingresado)}` : "Sin fecha de ingreso"}
                            </span>
                          </>
                        ) : (
                          <span className="text-grafito">Sin O.T.</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
