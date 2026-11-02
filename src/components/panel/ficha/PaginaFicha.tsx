"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { nombreDe, TextoEstado } from "@/components/portal/piezas";
import { Senal } from "@/components/senal/Senal";
import { diasEntre } from "@/lib/dominio/avisos";
import { formatearCodigo, normalizarCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES, ESTADOS, indiceEstado, type EstadoReparacion } from "@/lib/dominio/estados";
import { formatearFecha } from "@/lib/dominio/fechas";
import type { EquipoTaller, Transformador } from "@/lib/dominio/tipos";
import { nombreOrden, nombreTrafo, normalizarNumero, ordenesDelTrafo } from "@/lib/dominio/trafo";
import { accionesDe } from "../AccionesEquipo";
import { MarcaTemporal } from "../equipo/campos";
import { resumenChapa } from "../equipo/FormularioOT";
import { HistorialTrafo } from "../equipo/HistorialTrafo";
import { PaginaPanel, type ApiPanel } from "../PaginaPanel";
import { dias, TextoDemoras } from "../Planilla";
import { ArchivosOrden } from "./ArchivosOrden";

const enlace = "font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/**
 * Una orden de trabajo: todo lo de un ingreso al taller en un solo lugar. Su transformador, el recorrido
 * desde el ingreso hasta hoy (cada etapa con su fecha y cuánto duró), sus datos, las demás O.T. del mismo
 * transformador y todas las acciones. El cliente ve su propia línea de etapas.
 */
export function PanelFicha() {
  const codigo = normalizarCodigo(useSearchParams().get("codigo") ?? "");
  return (
    <PaginaPanel seccion="equipos" titulo="Orden de trabajo">
      {(api) => <Ficha api={api} codigo={codigo} />}
    </PaginaPanel>
  );
}

function Ficha({ api, codigo }: { api: ApiPanel; codigo: string }) {
  const equipo = api.taller.equipos.find((e) => e.codigo === codigo);
  if (!equipo) {
    return (
      <p className="mt-6 max-w-[56ch] text-lg">
        No se encontró la orden de trabajo{codigo ? ` ${formatearCodigo(codigo)}` : ""}.{" "}
        <Link href="/panel" className={enlace}>
          Volver a las órdenes de trabajo
        </Link>
        .
      </p>
    );
  }

  const empresa = api.empresaDe(equipo);
  const trafo = api.taller.transformadores.find((t) => t.id === equipo.trafo);
  const otras = ordenesDelTrafo(api.taller.equipos, equipo.trafo, { excepto: equipo.codigo });

  return (
    <>
      <p className="mt-4 font-cartel text-[2.5rem] font-bold leading-none">
        {nombreOrden(equipo)}
        {equipo.numeroOrdenTemporal && <MarcaTemporal className="ml-3" />}
      </p>
      <p className="mt-2 max-w-[70ch] text-lg">
        {empresa || "Sin cliente"} · código <span className="tracking-[0.04em]">{formatearCodigo(equipo.codigo)}</span>
        {equipo.etapas.ingresado && <> · ingresó el {formatearFecha(equipo.etapas.ingresado)}</>}
      </p>
      {!equipo.baja && (equipo.numeroOrdenTemporal || !equipo.numeroOrden) && (
        <p className="mt-4 max-w-[64ch] font-medium">
          {equipo.numeroOrdenTemporal ? "El N.º de O.T. es temporal." : "Falta el N.º de O.T."} Cuando tenga el del sistema de gestión,{" "}
          <Link href={`/panel/editar?codigo=${equipo.codigo}`} className={enlace}>
            cárguelo
          </Link>
          .
        </p>
      )}
      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-10 lg:col-span-8">
          {trafo && <TrafoDeLaOrden trafo={trafo} cuantas={otras.length + 1} />}
          <Recorrido equipo={equipo} />
          <Datos equipo={equipo} trafo={trafo} />
          <ArchivosOrden equipo={equipo} api={api} />
          {otras.length > 0 && <HistorialTrafo trafo={equipo.trafo} ordenes={otras} />}
        </div>
        <EstadoYAcciones equipo={equipo} api={api} />
      </div>
    </>
  );
}

type Situacion = "pasada" | "actual" | "salteada" | "pendiente";

interface Paso {
  estado: EstadoReparacion;
  situacion: Situacion;
  fecha?: Date;
  /** Cuánto duró la etapa (hasta la siguiente con fecha) o, en la actual, cuánto lleva. */
  dias?: number;
}

/** Cada etapa con su fecha y su duración. Una etapa sin fecha antes de la actual se salteó. */
function pasosDe(equipo: EquipoTaller, hoy: Date): Paso[] {
  const actual = indiceEstado(equipo.estado);
  return ESTADOS.map((estado, i) => {
    const fecha = equipo.etapas[estado];
    if (i > actual) return { estado, situacion: "pendiente" };
    if (!fecha) return { estado, situacion: i === actual ? "actual" : "salteada" };
    if (i === actual) return { estado, situacion: "actual", fecha, dias: estado === "entregado" ? undefined : diasEntre(fecha, hoy) };
    const siguiente = ESTADOS.slice(i + 1, actual + 1)
      .map((e) => equipo.etapas[e])
      .find(Boolean);
    return { estado, situacion: "pasada", fecha, dias: siguiente ? diasEntre(fecha, siguiente) : undefined };
  });
}

function Recorrido({ equipo }: { equipo: EquipoTaller }) {
  const hoy = new Date();
  const pasos = pasosDe(equipo, hoy);
  const ingreso = equipo.etapas.ingresado;
  const entrega = equipo.estado === "entregado" ? equipo.etapas.entregado : undefined;
  const total = ingreso ? diasEntre(ingreso, entrega ?? hoy) : undefined;

  return (
    <section aria-labelledby="recorrido" className="marco">
      <TornillosMarco />
      <div className="marco-cabecera">
        <h2 id="recorrido" className="rotulo text-base">
          Recorrido
        </h2>
        {total !== undefined && <span className="rotulo text-base">{dias(total)}</span>}
      </div>
      <p className="marco-cuerpo pb-2 text-[0.9375rem]">
        {!ingreso
          ? "No tiene fecha de ingreso."
          : entrega
            ? `Ingresó el ${formatearFecha(ingreso)} y se entregó el ${formatearFecha(entrega)}: ${dias(total!)} en el taller.`
            : total === 0
              ? "Ingresó hoy."
              : `Ingresó el ${formatearFecha(ingreso)}: lleva ${dias(total!)} en el taller.`}
      </p>
      <ol aria-label="Etapas de la reparación" className="px-[var(--marco-px)] pb-6">
        {pasos.map((paso, i) => {
          const definicion = DEFINICIONES[paso.estado];
          const ultimo = i === pasos.length - 1;
          return (
            <li key={paso.estado} aria-current={paso.situacion === "actual" ? "step" : undefined} className="relative flex gap-4 pb-5 last:pb-0">
              {/* La línea que une las etapas: llena en lo recorrido, punteada en lo que falta. */}
              {!ultimo && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[1.0625rem] top-10 bottom-0 w-0 border-l-2 ${
                    paso.situacion === "pendiente" || paso.situacion === "actual" ? "border-dashed border-acero/60" : "border-acero"
                  }`}
                />
              )}
              <Senal
                forma={definicion.forma}
                pictograma={paso.estado}
                variante={paso.situacion === "actual" ? "activa" : paso.situacion === "pendiente" || paso.situacion === "salteada" ? "futura" : "pasada"}
                simple
                className="relative size-9 shrink-0 bg-blanco"
              />
              <div className="min-w-0 pt-1 leading-snug">
                <p className={paso.situacion === "actual" ? "font-bold" : paso.situacion === "pasada" ? "font-semibold" : "text-grafito"}>
                  {definicion.nombre}
                  {paso.situacion === "actual" && <span className="font-normal text-grafito"> · actual</span>}
                </p>
                <p className="text-[0.9375rem] text-grafito">{detalle(paso)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function detalle(paso: Paso): string {
  switch (paso.situacion) {
    case "pendiente":
      return "Pendiente";
    case "salteada":
      return "Sin fecha: se salteó";
    case "actual":
      if (!paso.fecha) return "Sin fecha";
      if (paso.dias === undefined) return `El ${formatearFecha(paso.fecha)}`;
      return `Desde el ${formatearFecha(paso.fecha)} · ${paso.dias === 0 ? "empezó hoy" : `lleva ${dias(paso.dias)}`}`;
    case "pasada":
      if (paso.dias === undefined) return `El ${formatearFecha(paso.fecha!)}`;
      return `Desde el ${formatearFecha(paso.fecha!)} · ${paso.dias === 0 ? "menos de 1 día" : dias(paso.dias)}`;
  }
}

/** El transformador de la orden, con un enlace a su ficha: ahí están su chapa y todas sus O.T. */
function TrafoDeLaOrden({ trafo, cuantas }: { trafo: Transformador; cuantas: number }) {
  return (
    <section aria-labelledby="trafo-orden" className="marco">
      <TornillosMarco />
      <div className="marco-cabecera">
        <h2 id="trafo-orden" className="rotulo text-base">
          Transformador
        </h2>
        <span className="etiqueta">{cuantas === 1 ? "1.ª O.T." : `${cuantas} O.T.`}</span>
      </div>
      <div className="marco-cuerpo flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <div>
          <p className="font-cartel text-[1.75rem] font-bold leading-none">
            {nombreTrafo(trafo)}
            {trafo.provisorio && <MarcaTemporal />}
          </p>
          <p className="mt-1 text-[0.9375rem]">{resumenChapa(trafo)}</p>
        </div>
        <Link href={`/panel/transformador?id=${trafo.id}`} className={enlace}>
          Ver el transformador {cuantas > 1 ? `y sus ${cuantas} O.T.` : "y su chapa"}
        </Link>
      </div>
    </section>
  );
}

/**
 * Los datos de la orden, con el N.º T con el que ingresó (si hoy el transformador tiene otro, se dice). Lo
 * demás del transformador está en su ficha.
 */
function Datos({ equipo, trafo }: { equipo: EquipoTaller; trafo: Transformador | undefined }) {
  const cambioT = trafo && normalizarNumero(equipo.numeroTIngreso ?? "") !== normalizarNumero(trafo.numeroT ?? "");
  const filas: [string, string | undefined][] = [
    ["N.º de O.T.", equipo.numeroOrden && (equipo.numeroOrdenTemporal ? `${equipo.numeroOrden} (temporal)` : equipo.numeroOrden)],
    [
      "N.º T al ingresar",
      cambioT
        ? `${equipo.numeroTIngreso ?? "Sin N.º T"} (hoy el transformador ${trafo.numeroT ? `tiene el ${trafo.numeroT}` : "no tiene N.º T"})`
        : equipo.numeroTIngreso,
    ],
    ["Código de seguimiento", formatearCodigo(equipo.codigo)],
    ["Referencia del cliente", equipo.referencia],
    ["Motivo del ingreso", equipo.motivo],
  ];
  return (
    <section aria-labelledby="datos-equipo" className="marco">
      <TornillosMarco />
      <div className="marco-cabecera">
        <h2 id="datos-equipo" className="rotulo text-base">
          Datos de la orden
        </h2>
        {!equipo.baja && (
          <Link href={`/panel/editar?codigo=${equipo.codigo}`} className="rotulo text-[0.875rem] text-blanco underline decoration-2 underline-offset-4">
            Editar
          </Link>
        )}
      </div>
      <dl className="marco-cuerpo grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {filas.map(([nombre, valor]) => (
          <div key={nombre} className={nombre === "Motivo del ingreso" ? "sm:col-span-2" : ""}>
            <dt className="rotulo text-[0.8125rem] text-grafito">{nombre}</dt>
            <dd className={`mt-0.5 ${valor ? "" : "text-grafito"} ${nombre === "Código de seguimiento" ? "tracking-[0.04em]" : ""}`}>
              {valor ?? "Sin cargar"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Al costado: dónde está el equipo, cuánto lleva y todo lo que se puede hacer con él. */
function EstadoYAcciones({ equipo, api }: { equipo: EquipoTaller; api: ApiPanel }) {
  const definicion = DEFINICIONES[equipo.estado];
  const nombre = nombreDe(equipo);
  return (
    <aside aria-labelledby="estado-equipo" className="border-t-[3px] border-acero pt-5 lg:sticky lg:top-8 lg:col-span-4 lg:self-start">
      <h2 id="estado-equipo" className="rotulo text-base">
        Estado
      </h2>
      <div className="mt-3 flex items-center gap-4">
        <Senal forma={definicion.forma} pictograma={equipo.estado} simple className="size-14 shrink-0" />
        <div className="text-lg leading-snug">
          <p className="font-semibold">
            <TextoEstado equipo={equipo} />
          </p>
          <div className="text-[0.9375rem]">
            <TextoDemoras equipo={equipo} api={api} />
          </div>
        </div>
      </div>

      {equipo.baja ? (
        <p className="mt-5 max-w-[44ch]">
          <strong className="font-semibold">Está dado de baja</strong> desde el {formatearFecha(equipo.baja)}: el cliente no lo ve.
          {api.puede("baja-equipos") && (
            <>
              {" "}
              <button type="button" onClick={() => api.reactivar("equipo", equipo.codigo, nombre)} className={`${enlace} cursor-pointer`}>
                Reactivar
              </button>
            </>
          )}
        </p>
      ) : (
        <button type="button" onClick={() => api.abrirEstado(equipo)} className="placa mt-5">
          Cambiar estado
        </button>
      )}

      <h2 className="rotulo mt-8 border-t border-acero pt-5 text-base">Acciones</h2>
      <ul className="mt-2">
        {accionesDe(equipo, api, { conFicha: false }).map((accion) => (
          <li key={accion.id} className="border-b border-acero last:border-b-0">
            {accion.href ? (
              <Link href={accion.href} className="flex items-center justify-between gap-3 py-3 font-semibold no-underline hover:text-naranja">
                {accion.texto}
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={accion.alElegir}
                className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left font-semibold hover:text-naranja"
              >
                {accion.texto}
                <span aria-hidden="true">→</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
