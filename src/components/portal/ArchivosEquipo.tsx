"use client";

import { useState } from "react";
import { abrirEnPestana } from "@/components/abrirArchivo";
import { Alerta } from "@/components/iconos";
import { obtenerPortal } from "@/lib/datos/repositorios";
import { formatearTamano } from "@/lib/dominio/archivos";
import { formatearFecha } from "@/lib/dominio/fechas";
import type { ArchivoOrden, EquipoCliente } from "@/lib/dominio/tipos";

/** Los PDF que el taller subió a la orden: cada uno se abre en una pestaña nueva. Sin PDF, no se muestra. */
export function ArchivosEquipo({ equipo }: { equipo: EquipoCliente }) {
  const [error, setError] = useState(false);
  const archivos = equipo.archivos ?? [];
  if (archivos.length === 0) return null;

  async function abrir(archivo: ArchivoOrden) {
    setError(false);
    try {
      await abrirEnPestana(async () => (await obtenerPortal()).enlaceArchivo(equipo.codigo, archivo.id));
    } catch {
      setError(true);
    }
  }

  return (
    <div className="mt-6">
      <h3 className="rotulo text-[0.9375rem]">Archivos del taller</h3>
      <ul className="mt-1">
        {archivos.map((a) => (
          <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 border-b border-acero py-2.5 last:border-b-0">
            <button
              type="button"
              onClick={() => abrir(a)}
              className="cursor-pointer break-all text-left font-semibold underline decoration-naranja decoration-2 underline-offset-4"
            >
              {a.nombre}
            </button>
            <span className="text-[0.9375rem] text-grafito">
              PDF · {formatearTamano(a.tamano)} · {formatearFecha(a.subido)}
            </span>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 flex items-start gap-2 text-[0.9375rem] font-medium text-rojo">
          <Alerta className="mt-0.5 size-[1.125rem] shrink-0" />
          No se pudo abrir el PDF. Revise su conexión e intente de nuevo.
        </p>
      )}
    </div>
  );
}
