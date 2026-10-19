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
import { NOMBRE_USOS } from "@/lib/dominio/placa";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { reparacionesDelTrafo } from "@/lib/dominio/trafo";
import { accionesDe } from "../AccionesEquipo";
import { HistorialTrafo } from "../equipo/HistorialTrafo";
import { PaginaPanel, type ApiPanel } from "../PaginaPanel";
import { dias, TextoDemoras } from "../Planilla";

const enlace = "font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/**
 * Ficha de un equipo: todo lo de una reparación en un solo lugar. El recorrido desde el ingreso hasta hoy
 * (cada etapa con su fecha y cuánto duró), los datos y la chapa, el historial del trafo y todas las
 * acciones. Es la trazabilidad del equipo para el personal; el cliente ve su propia línea de etapas.
 */
export function PanelFicha() {
  const codigo = normalizarCodigo(useSearchParams().get("codigo") ?? "");
  return (
    <PaginaPanel seccion="equipos" titulo="Ficha del equipo">
      {(api) => <Ficha api={api} codigo={codigo} />}
    </PaginaPanel>
  );
}

function Ficha({ api, codigo }: { api: ApiPanel; codigo: string }) {
  const equipo = api.taller.equipos.find((e) => e.codigo === codigo);
  if (!equipo) {
    return (
      <p className="mt-6 max-w-[56ch] text-lg">
        No se encontró el equipo{codigo ? ` ${formatearCodigo(codigo)}` : ""}.{" "}
        <Link href="/panel" className={enlace}>
          Volver a la lista de equipos
        </Link>
        .
      </p>
    );
  }

  const empresa = api.empresaDe(equipo);
  const otras = equipo.numeroTrafo ? reparacionesDelTrafo(api.taller.equipos, equipo.numeroTrafo, equipo.codigo) : [];

  return (
    <>
      <p className="mt-4 max-w-[70ch] text-lg">
        <span className="font-semibold">{nombreDe(equipo)}</span>
        {equipo.referencia && <> · {equipo.equipo}</>} · {empresa || "Sin cliente"}
      </p>
      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-10 lg:col-span-8">
          <Recorrido equipo={equipo} />
          <Datos equipo={equipo} empresa={empresa} />
          {otras.length > 0 && <HistorialTrafo reparaciones={otras} empresaDe={(id) => api.taller.empresas.find((e) => e.id === id)?.nombre ?? ""} nuevo={false} copiadoDe={null} onUsar={() => {}} />}
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

/** Lo que identifica al equipo y lo principal de la chapa. Lo demás está en "Editar datos". */
function Datos({ equipo, empresa }: { equipo: EquipoTaller; empresa: string }) {
  const placa = equipo.placa;
  const filas: [string, string | undefined][] = [
    ["Cliente", empresa || undefined],
    ["Referencia del cliente", equipo.referencia],
    ["N.º de orden (Punto Técnico)", equipo.numeroOrden],
    ["N.º de trafo", equipo.numeroTrafo],
    ["Código de seguimiento", formatearCodigo(equipo.codigo)],
    ["Equipo", equipo.equipo],
    ["Fabricante", placa?.fabricante],
    ["N.º de fabricación", equipo.serie],
    ["Año de fabricación", placa?.anio ? String(placa.anio) : undefined],
    ["Uso", equipo.uso ? NOMBRE_USOS[equipo.uso] : undefined],
  ];
  return (
    <section aria-labelledby="datos-equipo" className="marco">
      <TornillosMarco />
      <div className="marco-cabecera">
        <h2 id="datos-equipo" className="rotulo text-base">
          Datos del equipo
        </h2>
      </div>
      <dl className="marco-cuerpo grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {filas.map(([nombre, valor]) => (
          <div key={nombre}>
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
