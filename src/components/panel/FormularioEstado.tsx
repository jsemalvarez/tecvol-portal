"use client";

import { useId, useState, type FormEvent } from "react";
import { Senal } from "@/components/senal/Senal";
import {
  DEFINICIONES,
  ESTADOS,
  estadoSiguiente,
  etapasConEstado,
  fechasDesordenadas,
  indiceEstado,
  type EstadoReparacion,
} from "@/lib/dominio/estados";
import { fechaDeCampo, fechaParaCampo, formatearFecha } from "@/lib/dominio/fechas";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { ErrorFormulario, mensajeDeError } from "./Dialogo";
import type { AccionesPanel, EstadoAnterior } from "./usePanel";

/** Qué pasa con las fechas de las otras etapas al elegir un estado. */
function efecto(equipo: EquipoTaller, elegido: EstadoReparacion) {
  const actual = indiceEstado(equipo.estado);
  const nuevo = indiceEstado(elegido);
  if (nuevo < actual) {
    const borradas = ESTADOS.slice(nuevo + 1).filter((e) => equipo.etapas[e]);
    return borradas.length ? `Se borran las fechas de ${borradas.map((e) => DEFINICIONES[e].nombre).join(", ")}.` : null;
  }
  const salteadas = ESTADOS.slice(actual + 1, nuevo).filter((e) => !equipo.etapas[e]);
  return salteadas.length ? `Quedan sin fecha: ${salteadas.map((e) => DEFINICIONES[e].nombre).join(", ")}.` : null;
}

const enlace = "cursor-pointer text-[0.9375rem] font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/** "La fecha de Presupuesto no puede ser anterior a la de Diagnóstico (15/09/2026)." */
function textoDesorden(etapas: Partial<Record<EstadoReparacion, Date>>, etapa: EstadoReparacion, anterior: EstadoReparacion) {
  return `La fecha de ${DEFINICIONES[etapa].nombre} no puede ser anterior a la de ${DEFINICIONES[anterior].nombre} (${formatearFecha(etapas[anterior]!)}).`;
}

/**
 * Elegir el estado de un equipo y la fecha del cambio (hoy, si no se indica otra). El taller asigna
 * el estado a mano: puede saltear etapas o volver atrás para corregir un error. Aparte, puede corregir
 * la fecha de cualquier etapa ya pasada sin cambiar el estado (ver `FormularioFechas`).
 */
export function FormularioEstado({
  equipo,
  acciones,
  onGuardado,
  onFechasCorregidas,
}: {
  equipo: EquipoTaller;
  acciones: AccionesPanel;
  onGuardado: (anterior: EstadoAnterior, estado: EstadoReparacion) => void;
  onFechasCorregidas: (anterior: EstadoAnterior) => void;
}) {
  const id = useId();
  const hoy = fechaParaCampo(new Date());
  const [elegido, setElegido] = useState<EstadoReparacion>(estadoSiguiente(equipo.estado) ?? equipo.estado);
  const [fecha, setFecha] = useState(hoy);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const aviso = efecto(equipo, elegido);

  if (corrigiendo) {
    return <FormularioFechas equipo={equipo} acciones={acciones} onGuardadas={onFechasCorregidas} onVolver={() => setCorrigiendo(false)} />;
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const dia = fechaDeCampo(fecha);
    if (!dia) return setError("Elija la fecha del cambio.");
    if (fecha > hoy) return setError("La fecha no puede ser posterior a hoy.");
    // Las etapas anteriores conservan su fecha: la del cambio no puede quedar antes que ellas.
    const etapas = etapasConEstado(equipo.etapas, elegido, dia);
    const desorden = fechasDesordenadas(etapas);
    if (desorden) return setError(textoDesorden(etapas, desorden.etapa, desorden.anterior));
    setError(null);
    setGuardando(true);
    try {
      const anterior = await acciones.cambiarEstado(equipo, elegido, dia);
      onGuardado(anterior, elegido);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
      <fieldset>
        <legend className="rotulo text-[0.9375rem]">Estado</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {ESTADOS.map((estado) => {
            const definicion = DEFINICIONES[estado];
            const actual = estado === equipo.estado;
            const fechaEtapa = equipo.etapas[estado];
            return (
              <label
                key={estado}
                className={`flex cursor-pointer items-center gap-3 rounded-[0.25rem] border-2 px-3 py-2.5 transition-colors ${
                  elegido === estado ? "border-tinta bg-blanco" : "border-transparent bg-esmalte hover:border-acero"
                }`}
              >
                <input
                  type="radio"
                  name={`estado-${id}`}
                  value={estado}
                  checked={elegido === estado}
                  onChange={() => setElegido(estado)}
                  className="size-4 shrink-0 accent-[var(--color-tinta)]"
                />
                <Senal forma={definicion.forma} pictograma={estado} simple className="size-8 shrink-0" />
                <span className="min-w-0 text-[0.9375rem] leading-tight">
                  <span className={actual ? "font-bold" : ""}>{definicion.nombre}</span>
                  <span className="block text-[0.8125rem] text-grafito">
                    {actual ? "Actual" : fechaEtapa ? formatearFecha(fechaEtapa) : " "}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <label htmlFor={`fecha-${id}`} className="rotulo block text-[0.9375rem]">
            Fecha del cambio
          </label>
          <input
            id={`fecha-${id}`}
            type="date"
            value={fecha}
            max={hoy}
            onChange={(e) => setFecha(e.target.value)}
            className="renglon mt-1 w-[11.5rem]"
          />
        </div>
        <button type="submit" className="placa" disabled={guardando}>
          {guardando ? "Guardando…" : elegido === equipo.estado ? "Corregir la fecha" : `Pasar a ${DEFINICIONES[elegido].nombre}`}
        </button>
      </div>
      {aviso && <p className="max-w-[60ch] text-[0.9375rem] text-grafito">{aviso}</p>}
      <ErrorFormulario texto={error} />
      <p className="border-t border-acero pt-4 text-[0.9375rem]">
        ¿Una fecha anterior quedó mal?{" "}
        <button type="button" onClick={() => setCorrigiendo(true)} className={enlace}>
          Corregir las fechas de las etapas
        </button>
      </p>
    </form>
  );
}

/**
 * Corregir la fecha de cualquier etapa hasta la actual, sin cambiar el estado ni borrar las otras. Las
 * etapas salteadas pueden quedar sin fecha; el ingreso y la etapa actual, no. Las fechas tienen que
 * seguir el orden del taller.
 */
function FormularioFechas({
  equipo,
  acciones,
  onGuardadas,
  onVolver,
}: {
  equipo: EquipoTaller;
  acciones: AccionesPanel;
  onGuardadas: (anterior: EstadoAnterior) => void;
  onVolver: () => void;
}) {
  const id = useId();
  const hoy = fechaParaCampo(new Date());
  const etapas = ESTADOS.slice(0, indiceEstado(equipo.estado) + 1);
  const [valores, setValores] = useState<Partial<Record<EstadoReparacion, string>>>(() =>
    Object.fromEntries(etapas.map((e) => [e, equipo.etapas[e] ? fechaParaCampo(equipo.etapas[e]) : ""])),
  );
  const [error, setError] = useState<{ texto: string; etapa?: EstadoReparacion } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const nuevas: Partial<Record<EstadoReparacion, Date>> = {};
    for (const etapa of etapas) {
      const valor = valores[etapa] ?? "";
      const nombre = DEFINICIONES[etapa].nombre;
      if (!valor) {
        if (etapa === "ingresado" || etapa === equipo.estado) {
          return setError({ texto: `Elija la fecha de ${nombre}: ${etapa === equipo.estado ? "es la etapa actual" : "es el ingreso"}.`, etapa });
        }
        continue;
      }
      if (valor > hoy) return setError({ texto: `La fecha de ${nombre} no puede ser posterior a hoy.`, etapa });
      // Una fecha sin tocar se guarda tal cual, con su hora; una nueva, al mediodía de ese día.
      const original = equipo.etapas[etapa];
      const fecha = original && fechaParaCampo(original) === valor ? original : fechaDeCampo(valor);
      if (!fecha) return setError({ texto: `Revise la fecha de ${nombre}.`, etapa });
      nuevas[etapa] = fecha;
    }
    const desorden = fechasDesordenadas(nuevas);
    if (desorden) return setError({ texto: textoDesorden(nuevas, desorden.etapa, desorden.anterior), etapa: desorden.etapa });
    if (etapas.every((e) => nuevas[e] === equipo.etapas[e])) return setError({ texto: "No cambió ninguna fecha." });

    setError(null);
    setGuardando(true);
    try {
      onGuardadas(await acciones.corregirFechas(equipo, nuevas));
    } catch (e) {
      setError({ texto: mensajeDeError(e) });
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
      <p className="max-w-[60ch] text-[0.9375rem]">
        El estado sigue en <strong className="font-semibold">{DEFINICIONES[equipo.estado].nombre}</strong>. Las etapas salteadas pueden
        quedar sin fecha.
      </p>
      <fieldset>
        <legend className="rotulo text-[0.9375rem]">Fechas de las etapas</legend>
        <ul className="mt-3 grid gap-2">
          {etapas.map((etapa) => {
            const definicion = DEFINICIONES[etapa];
            return (
              <li key={etapa} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-[0.25rem] bg-esmalte px-3 py-2">
                <label htmlFor={`${id}-${etapa}`} className="flex min-w-0 items-center gap-3 text-[0.9375rem] leading-tight">
                  <Senal forma={definicion.forma} pictograma={etapa} simple className="size-8 shrink-0" />
                  <span>
                    {definicion.nombre}
                    {etapa === equipo.estado && <span className="block text-[0.8125rem] text-grafito">Actual</span>}
                  </span>
                </label>
                <input
                  id={`${id}-${etapa}`}
                  type="date"
                  value={valores[etapa] ?? ""}
                  max={hoy}
                  onChange={(e) => {
                    setValores((v) => ({ ...v, [etapa]: e.target.value }));
                    if (error?.etapa === etapa) setError(null);
                  }}
                  aria-invalid={error?.etapa === etapa ? true : undefined}
                  className="renglon w-[11.5rem]"
                />
              </li>
            );
          })}
        </ul>
      </fieldset>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="submit" className="placa" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar las fechas"}
        </button>
        <button type="button" onClick={onVolver} className={enlace}>
          Volver al estado
        </button>
      </div>
      <ErrorFormulario texto={error?.texto ?? null} />
    </form>
  );
}
