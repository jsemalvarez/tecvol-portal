"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Alerta, Flecha } from "@/components/iconos";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { nombreDe, TextoEstado } from "@/components/portal/piezas";
import { Senal } from "@/components/senal/Senal";
import { conAviso, demorasDe, type Demora } from "@/lib/dominio/avisos";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES, esperaALaEmpresa } from "@/lib/dominio/estados";
import { activos, type EquipoTaller } from "@/lib/dominio/tipos";
import { nombreOrden, trafoDeOrden } from "@/lib/dominio/trafo";
import { MarcaTemporal } from "./equipo/campos";
import { BarraFiltros, useFiltros, type Filtros, type FiltroEstado } from "./Filtros";
import { PaginaPanel, type ApiPanel } from "./PaginaPanel";

/**
 * Órdenes de trabajo del panel: todas en una tabla, con búsqueda, filtros y orden. Cada fila es un ingreso
 * al taller, con su transformador. De entrada, la que lleva más tiempo en el taller va primero, con los
 * días de cada una y un aviso si pasó el límite.
 */
export function PanelPlanilla() {
  return <PaginaPanel seccion="equipos">{(api) => <Planilla api={api} />}</PaginaPanel>;
}

const enlace = "cursor-pointer font-semibold underline decoration-naranja decoration-2 underline-offset-4";

const vinculo = "block font-semibold leading-snug underline decoration-acero decoration-1 underline-offset-4 hover:decoration-naranja hover:decoration-2";

export const dias = (n: number) => (n === 1 ? "1 día" : `${n} días`);

/** La O.T. guardada que todavía no tiene transformador: la empresa no la ve hasta que se cargue. */
function FaltaTrafo() {
  return <span className="block font-semibold">Falta el transformador</span>;
}

/** Cuánto lleva el equipo en el taller y desde la aprobación; en rojo y con el ícono, si pasó el límite. */
export function TextoDemoras({ equipo, api }: { equipo: EquipoTaller; api: ApiPanel }) {
  const { ingreso, aprobacion } = demorasDe(equipo, api.taller.avisos, new Date());
  const lineas = [
    ingreso && { demora: ingreso, texto: ingreso.dias === 0 ? "Ingresó hoy" : `${dias(ingreso.dias)} en el taller` },
    aprobacion && { demora: aprobacion, texto: aprobacion.dias === 0 ? "Aprobado hoy" : `${dias(aprobacion.dias)} desde la aprobación` },
  ].filter((l): l is { demora: Demora; texto: string } => !!l);
  if (!lineas.length) return null;
  return (
    <>
      {lineas.map(({ demora, texto }) =>
        demora.vencida ? (
          <span key={texto} className="mt-0.5 flex items-center gap-1.5 font-semibold text-rojo">
            <Alerta className="size-4 shrink-0" />
            {texto}
            <span className="sr-only">: pasó el límite de {dias(demora.limite)}</span>
          </span>
        ) : (
          <span key={texto} className="block text-grafito">
            {texto}
          </span>
        ),
      )}
    </>
  );
}

/** Cuántas hay en cada situación. Tocar una filtra la lista; tocarla de nuevo vuelve a las que están en el taller. */
function Resumen({ api, filtros }: { api: ApiPanel; filtros: Filtros }) {
  // Lo dado de baja no cuenta: sigue guardado, pero ya no es parte del trabajo del taller.
  const equipos = activos(api.taller.equipos);
  const enTaller = equipos.filter((e) => e.estado !== "entregado");
  const esperan = enTaller.filter((e) => esperaALaEmpresa(e.estado)).length;
  const hoy = new Date();
  const demorados = enTaller.filter((e) => conAviso(e, api.taller.avisos, hoy)).length;
  const entregados = equipos.length - enTaller.length;

  const opcion = (valor: FiltroEstado, contenido: ReactNode, clase = "") => {
    const elegida = filtros.estado === valor;
    return (
      <button
        type="button"
        aria-pressed={elegida}
        onClick={() => filtros.setEstado(elegida ? "en-taller" : valor)}
        className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 underline underline-offset-4 ${elegida ? "decoration-naranja decoration-[3px]" : "decoration-acero decoration-1 hover:decoration-2"} ${clase}`}
      >
        {contenido}
      </button>
    );
  };
  const punto = (
    <span aria-hidden="true" className="text-grafito max-sm:hidden">
      ·
    </span>
  );

  return (
    <div role="group" aria-label="Filtrar la lista por situación" className="flex flex-wrap items-center gap-x-4 text-lg sm:gap-x-2">
      {opcion("en-taller", `${enTaller.length} en el taller`)}
      {esperan > 0 && (
        <>
          {punto}
          {opcion("esperan", `${esperan} ${esperan === 1 ? "espera" : "esperan"} a la empresa`, "font-semibold")}
        </>
      )}
      {demorados > 0 && (
        <>
          {punto}
          {opcion(
            "con-aviso",
            <>
              <Alerta className="size-[1.0625rem] shrink-0" />
              {demorados} con aviso de demora
            </>,
            "font-semibold text-rojo",
          )}
        </>
      )}
      {punto}
      {opcion("entregado", `${entregados} ${entregados === 1 ? "entregado" : "entregados"}`)}
    </div>
  );
}

function Planilla({ api }: { api: ApiPanel }) {
  const filtros = useFiltros(api.taller.equipos, api.taller.empresas, api.taller.avisos);
  const equipos = filtros.filtrados;
  const total = activos(api.taller.equipos).length;
  const vistaBajas = filtros.estado === "baja";
  const { ingreso, aprobacion } = api.taller.avisos;

  return (
    <div className="mt-3">
      <Resumen api={api} filtros={filtros} />
      <div className="mt-5">
        <BarraFiltros filtros={filtros} empresas={activos(api.taller.empresas)} total={total} conBajas={api.puede("baja-equipos")} />
      </div>
      <div className="marco mt-5">
        <TornillosMarco />
        <div className="marco-cabecera">
          <span className="rotulo text-base">{vistaBajas ? "Órdenes de trabajo dadas de baja" : "Órdenes de trabajo"}</span>
          <span className="rotulo text-base">{equipos.length}</span>
        </div>
        {vistaBajas && equipos.length === 0 ? (
          <p className="marco-cuerpo">No hay órdenes de trabajo dadas de baja{filtros.texto || filtros.empresa ? " que coincidan con la búsqueda" : ""}.</p>
        ) : total === 0 && !vistaBajas ? (
          <p className="marco-cuerpo">Todavía no hay órdenes de trabajo. Cree la primera con "+ Nueva O.T.".</p>
        ) : equipos.length === 0 ? (
          <p className="marco-cuerpo">Ninguna orden de trabajo coincide con la búsqueda.</p>
        ) : (
          <>
            <table className="hidden w-full text-left lg:table">
              <caption className="sr-only">Órdenes de trabajo del taller</caption>
              <thead className="border-b-2 border-acero bg-esmalte">
                <tr>
                  <th scope="col" className="rotulo py-3 pl-[var(--marco-px)] pr-4 text-[0.8125rem]">
                    Estado
                  </th>
                  <th scope="col" className="rotulo px-4 py-3 text-[0.8125rem]">
                    O.T.
                  </th>
                  <th scope="col" className="rotulo px-4 py-3 text-[0.8125rem]">
                    Transformador
                  </th>
                  <th scope="col" className="rotulo px-4 py-3 text-[0.8125rem]">
                    Empresa
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
                          <Senal forma={definicion.forma} pictograma={equipo.estado} variante={equipo.faltaTrafo ? "futura" : "activa"} simple className="size-10 shrink-0" />
                          <div className="text-[0.9375rem] leading-snug">
                            {equipo.faltaTrafo ? <FaltaTrafo /> : <TextoEstado equipo={equipo} />}
                            <TextoDemoras equipo={equipo} api={api} />
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                        <span className="flex items-center gap-2">
                          <Link href={`/panel/equipo?codigo=${equipo.codigo}`} className={`${vinculo} ${equipo.numeroOrden ? "" : "text-grafito"}`}>
                            {nombreOrden(equipo)}
                          </Link>
                          {equipo.numeroOrdenTemporal && <MarcaTemporal className="" />}
                        </span>
                        <span className="block text-[0.9375rem] leading-snug tracking-[0.04em]">{formatearCodigo(equipo.codigo)}</span>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        {equipo.faltaTrafo ? (
                          <span className="block text-[0.9375rem] leading-snug text-grafito">La empresa todavía no la ve</span>
                        ) : (
                          <>
                            <Link href={`/panel/transformador?id=${equipo.trafo}`} className={vinculo}>
                              {trafoDeOrden(equipo)}
                            </Link>
                            <span className="block text-[0.9375rem] leading-snug">{nombreDe(equipo)}</span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-[0.9375rem]">{api.empresaDe(equipo) || <span className="text-grafito">Sin empresa</span>}</td>
                      <td className="py-3.5 pl-4 pr-[var(--marco-px)] align-middle">
                        <Acciones api={api} equipo={equipo} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ul className="lg:hidden">
              {equipos.map((equipo) => {
                const definicion = DEFINICIONES[equipo.estado];
                const nombre = equipo.faltaTrafo ? nombreOrden(equipo) : `${nombreOrden(equipo)}, ${nombreDe(equipo)}`;
                return (
                  <li key={equipo.codigo} className="marco-fila relative px-[var(--marco-px)] py-3.5 transition-colors hover:bg-esmalte">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <Senal forma={definicion.forma} pictograma={equipo.estado} variante={equipo.faltaTrafo ? "futura" : "activa"} simple className="size-10 shrink-0 self-start" />
                      <div className="grid min-w-0 flex-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                        <div className="min-w-0">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {/* Toda la tarjeta lleva a la hoja: el enlace se estira sobre ella. */}
                            <Link
                              href={`/panel/equipo?codigo=${equipo.codigo}`}
                              aria-label={`Abrir ${nombre}`}
                              className={`${vinculo} ${equipo.numeroOrden ? "" : "text-grafito"} after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:-outline-offset-3 focus-visible:after:outline-tinta`}
                            >
                              {nombreOrden(equipo)}
                            </Link>
                            {equipo.numeroOrdenTemporal && <MarcaTemporal className="" />}
                          </span>
                          <p className="text-[0.9375rem] leading-snug">
                            {equipo.faltaTrafo ? (
                              "La empresa todavía no la ve"
                            ) : (
                              <>
                                <strong className="font-semibold">{trafoDeOrden(equipo)}</strong> · {nombreDe(equipo)}
                              </>
                            )}
                          </p>
                          <p className="text-[0.9375rem] leading-snug text-grafito">{api.empresaDe(equipo) || "Sin empresa"}</p>
                        </div>
                        <div className="text-[0.9375rem] leading-snug">
                          {equipo.faltaTrafo ? <FaltaTrafo /> : <TextoEstado equipo={equipo} />}
                          <TextoDemoras equipo={equipo} api={api} />
                        </div>
                      </div>
                      <Flecha className="size-5 shrink-0 text-grafito" />
                    </div>
                    {(equipo.baja || equipo.faltaTrafo) && (
                      <div className="relative z-[1] mt-2.5 ml-[3.25rem] sm:ml-14">
                        <Acciones api={api} equipo={equipo} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      <p className="mt-3 text-[0.9375rem] text-grafito">
        Avisa a los {dias(ingreso)} en el taller y a los {dias(aprobacion)} desde la aprobación del presupuesto.
        {api.puede("avisos") && (
          <>
            {" "}
            <button type="button" onClick={() => api.abrir({ tipo: "avisos" })} className={`${enlace} text-tinta`}>
              Cambiar los avisos
            </button>
          </>
        )}
      </p>
    </div>
  );
}

function Acciones({ api, equipo }: { api: ApiPanel; equipo: EquipoTaller }) {
  const nombre = equipo.faltaTrafo ? nombreOrden(equipo) : nombreDe(equipo);
  // Un equipo dado de baja no se trabaja: solo se puede reactivar.
  if (equipo.baja) {
    return (
      <div className="flex lg:justify-end">
        <button
          type="button"
          onClick={() => api.reactivar("equipo", equipo.codigo, nombre)}
          className="placa-secundaria justify-center whitespace-nowrap"
          aria-label={`Reactivar ${nombre}`}
        >
          Reactivar
        </button>
      </div>
    );
  }
  // Todo se trabaja en la hoja de la O.T., que abre en el próximo paso pendiente.
  return (
    <div className="flex lg:justify-end">
      {equipo.faltaTrafo ? (
        <Link href={`/panel/equipo?codigo=${equipo.codigo}&paso=2`} className="placa-secundaria justify-center whitespace-nowrap" aria-label={`Cargar el transformador de ${nombre}`}>
          Cargar transformador
        </Link>
      ) : (
        <Link href={`/panel/equipo?codigo=${equipo.codigo}`} className="placa-secundaria justify-center whitespace-nowrap" aria-label={`Abrir la O.T. de ${nombre}`}>
          Abrir O.T.
        </Link>
      )}
    </div>
  );
}
