"use client";

import { Senal } from "@/components/senal/Senal";
import { modoDatos } from "@/lib/datos/repositorios";
import { DEFINICIONES, ESTADOS, indiceEstado } from "@/lib/dominio/estados";
import { formatearFecha } from "@/lib/dominio/fechas";
import type { EquipoCliente } from "@/lib/dominio/tipos";

/** Azul (presupuesto) y verde (listo): el paso siguiente es del cliente. */
function requiereAtencion(equipo: EquipoCliente) {
  const forma = DEFINICIONES[equipo.estado].forma;
  return forma === "obligacion" || forma === "seguridad";
}

/** Fecha en que el equipo llegó a su estado actual. */
function desdeDe(equipo: EquipoCliente) {
  return equipo.etapas[equipo.estado] ?? equipo.actualizado ?? null;
}

const masReciente = (a: EquipoCliente, b: EquipoCliente) => (desdeDe(b)?.getTime() ?? 0) - (desdeDe(a)?.getTime() ?? 0);

/**
 * Los equipos en el orden de lectura del portal: primero los que esperan algo del cliente,
 * después los que están en el taller (los más avanzados primero) y al final los entregados.
 */
export function agrupar(equipos: EquipoCliente[]) {
  const activos = equipos.filter((e) => e.estado !== "entregado");
  const atencion = activos.filter(requiereAtencion).sort(masReciente);
  const enTrabajo = activos
    .filter((e) => !requiereAtencion(e))
    .sort((a, b) => indiceEstado(b.estado) - indiceEstado(a.estado) || masReciente(a, b));
  const entregados = equipos.filter((e) => e.estado === "entregado").sort(masReciente);
  return { atencion, enTaller: [...atencion, ...enTrabajo], entregados };
}

/** Cómo lo nombra el cliente; si no tiene referencia, la descripción del equipo. */
export function nombreDe(equipo: EquipoCliente) {
  return equipo.referencia ?? (equipo.equipo || "Equipo sin descripción");
}

export function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** "Diagnóstico desde el 30/09/2026"; los registros, que son un momento, "Entregado el 03/08/2026". */
export function TextoEstado({ equipo }: { equipo: EquipoCliente }) {
  const desde = desdeDe(equipo);
  const momento = DEFINICIONES[equipo.estado].forma === "registro";
  return (
    <>
      {DEFINICIONES[equipo.estado].nombre}
      {desde && <> {momento ? "el" : "desde el"} {formatearFecha(desde)}</>}
    </>
  );
}

/**
 * Las siete etapas con su fecha: pasadas en contorno, la actual encendida, las que faltan punteadas.
 * Una debajo de la otra en el celular y en fila desde 768px.
 */
export function LineaEtapas({ equipo }: { equipo: EquipoCliente }) {
  const actual = indiceEstado(equipo.estado);
  return (
    <ol aria-label="Etapas de la reparación" className="md:grid md:grid-cols-7 md:gap-x-3">
      {ESTADOS.map((estado, i) => {
        const definicion = DEFINICIONES[estado];
        const fecha = equipo.etapas[estado];
        return (
          <li
            key={estado}
            aria-current={i === actual ? "step" : undefined}
            className="flex items-center gap-3 border-b border-acero py-2.5 last:border-b-0 md:flex-col md:items-start md:gap-2 md:border-b-0 md:py-0"
          >
            <Senal
              forma={definicion.forma}
              pictograma={estado}
              variante={i < actual ? "pasada" : i === actual ? "activa" : "futura"}
              simple
              className="size-9 shrink-0"
            />
            <span className={`min-w-0 flex-1 text-[0.9375rem] ${i === actual ? "font-bold" : ""}`}>{definicion.nombre}</span>
            <span className="text-[0.9375rem] text-grafito">
              {fecha ? formatearFecha(fecha) : i > actual ? "Pendiente" : "Sin fecha"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Mientras carga: contornos punteados sin color, nunca un estado de ejemplo. */
export function CargaPortal() {
  return (
    <div role="status" className="mt-10 space-y-3">
      <span className="sr-only">Cargando sus equipos…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="flex items-center gap-4 rounded-[0.25rem] border-2 border-dashed border-acero px-5 py-4">
          <Senal forma="registro" pictograma="ingresado" variante="futura" className="size-11 shrink-0" />
          <span className="h-3 w-48 max-w-[50%] rounded-[0.125rem] bg-acero/25" />
        </div>
      ))}
    </div>
  );
}

/** En modo local, aviso de que la empresa y los equipos son de prueba. */
export function AvisoDatosPrueba() {
  if (modoDatos !== "local") return null;
  return (
    <p className="rounded-[0.25rem] border-2 border-dashed border-acero px-4 py-3 text-[0.9375rem]">
      <span className="rotulo block text-[0.8125rem]">Modo local, sin Firebase</span>
      La empresa y los equipos son de prueba.
    </p>
  );
}
