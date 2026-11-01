"use client";

import Link from "next/link";
import { Alerta } from "@/components/iconos";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { nombreDe, TextoEstado } from "@/components/portal/piezas";
import { Senal } from "@/components/senal/Senal";
import { demorasDe, type Demora } from "@/lib/dominio/avisos";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES } from "@/lib/dominio/estados";
import { activos, type EquipoTaller } from "@/lib/dominio/tipos";
import { nombreOrden, trafoDeOrden } from "@/lib/dominio/trafo";
import { accionesDe, MenuAcciones } from "./AccionesEquipo";
import { MarcaTemporal } from "./equipo/campos";
import { BarraFiltros, useFiltros } from "./Filtros";
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

function Planilla({ api }: { api: ApiPanel }) {
  const filtros = useFiltros(api.taller.equipos, api.taller.empresas, api.taller.avisos);
  const equipos = filtros.filtrados;
  const total = activos(api.taller.equipos).length;
  const vistaBajas = filtros.estado === "baja";
  const { ingreso, aprobacion } = api.taller.avisos;

  return (
    <div className="mt-10">
      <BarraFiltros filtros={filtros} empresas={activos(api.taller.empresas)} total={total} conBajas={api.puede("baja-equipos")} />
      <p className="mt-1 text-[0.9375rem] text-grafito">
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
      <div className="marco mt-6">
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
                          <Senal forma={definicion.forma} pictograma={equipo.estado} simple className="size-10 shrink-0" />
                          <div className="text-[0.9375rem] leading-snug">
                            <TextoEstado equipo={equipo} />
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
                        <Link href={`/panel/transformador?id=${equipo.trafo}`} className={vinculo}>
                          {trafoDeOrden(equipo)}
                        </Link>
                        <span className="block text-[0.9375rem] leading-snug">{nombreDe(equipo)}</span>
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
                return (
                  <li key={equipo.codigo} className="marco-fila px-[var(--marco-px)] py-4">
                    <div className="flex items-start gap-3">
                      <Senal forma={definicion.forma} pictograma={equipo.estado} simple className="size-10 shrink-0" />
                      <div className="min-w-0">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link href={`/panel/equipo?codigo=${equipo.codigo}`} className={`${vinculo} ${equipo.numeroOrden ? "" : "text-grafito"}`}>
                            {nombreOrden(equipo)}
                          </Link>
                          {equipo.numeroOrdenTemporal && <MarcaTemporal className="" />}
                        </span>
                        <div className="text-[0.9375rem] leading-snug">
                          <TextoEstado equipo={equipo} />
                          <TextoDemoras equipo={equipo} api={api} />
                        </div>
                        <p className="text-[0.9375rem] leading-snug">
                          <Link href={`/panel/transformador?id=${equipo.trafo}`} className="font-semibold">
                            {trafoDeOrden(equipo)}
                          </Link>{" "}
                          · {api.empresaDe(equipo) || "Sin empresa"} · <span className="tracking-[0.04em]">{formatearCodigo(equipo.codigo)}</span>
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
      <div className="flex lg:justify-end">
        <button
          type="button"
          onClick={() => api.reactivar("equipo", equipo.codigo, nombre)}
          className="placa-secundaria w-full justify-center whitespace-nowrap lg:w-auto"
          aria-label={`Reactivar ${nombre}`}
        >
          Reactivar
        </button>
      </div>
    );
  }
  return (
    // Cambiar el estado es lo de todos los días; el resto (ficha, datos, informe…) va en el menú "Más".
    <div className="flex items-center gap-3 lg:justify-end">
      <button
        type="button"
        onClick={() => api.abrirEstado(equipo)}
        className="placa-secundaria flex-1 justify-center whitespace-nowrap lg:flex-none"
        aria-label={`Cambiar el estado de ${nombre}`}
      >
        Cambiar estado
      </button>
      <MenuAcciones etiqueta={`Más acciones de ${nombre}`} acciones={accionesDe(equipo, api)} />
    </div>
  );
}
