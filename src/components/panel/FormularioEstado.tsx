"use client";

import { useId, useState, type FormEvent } from "react";
import { Senal } from "@/components/senal/Senal";
import { DEFINICIONES, ESTADOS, estadoSiguiente, indiceEstado, type EstadoReparacion } from "@/lib/dominio/estados";
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

/**
 * Elegir el estado de un equipo y la fecha del cambio (hoy, si no se indica otra). El taller asigna
 * el estado a mano: puede saltear etapas o volver atrás para corregir un error.
 */
export function FormularioEstado({
  equipo,
  acciones,
  onGuardado,
  enFila = false,
}: {
  equipo: EquipoTaller;
  acciones: AccionesPanel;
  onGuardado: (anterior: EstadoAnterior, estado: EstadoReparacion) => void;
  /** Las opciones en más columnas, para un panel ancho. */
  enFila?: boolean;
}) {
  const id = useId();
  const hoy = fechaParaCampo(new Date());
  const [elegido, setElegido] = useState<EstadoReparacion>(estadoSiguiente(equipo.estado) ?? equipo.estado);
  const [fecha, setFecha] = useState(hoy);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const aviso = efecto(equipo, elegido);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const dia = fechaDeCampo(fecha);
    if (!dia) return setError("Elija la fecha del cambio.");
    if (fecha > hoy) return setError("La fecha no puede ser posterior a hoy.");
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
        <div className={`mt-3 grid gap-2 ${enFila ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2"}`}>
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
    </form>
  );
}
