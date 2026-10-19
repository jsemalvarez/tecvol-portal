"use client";

import { useId, useMemo, useState } from "react";
import { conAviso, type LimitesAvisos } from "@/lib/dominio/avisos";
import { normalizarCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES, ESTADOS, esEstado, indiceEstado, type EstadoReparacion } from "@/lib/dominio/estados";
import type { Empresa, EquipoTaller } from "@/lib/dominio/tipos";

/**
 * `baja`: solo los equipos dados de baja. Las demás vistas no los muestran. `con-aviso`: los que pasaron
 * los días de los avisos (ver `conAviso`).
 */
export type FiltroEstado = "en-taller" | "con-aviso" | "todos" | "baja" | EstadoReparacion;

/** Cómo se ordena la lista: lo último que cambió, o lo que lleva más tiempo, para llevar el orden de los trabajos. */
export type Orden = "antiguedad" | "aprobacion" | "reciente";

const NOMBRES_ORDEN: Record<Orden, string> = {
  antiguedad: "Ingreso, el más antiguo primero",
  aprobacion: "Aprobación, la más antigua primero",
  reciente: "Último cambio primero",
};

const sinAcentos = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const tiempo = (fecha: Date | null | undefined) => fecha?.getTime() ?? Number.POSITIVE_INFINITY;

/**
 * Para ordenar los trabajos: lo más antiguo primero. Lo que ya no se trabaja (listo o entregado) o no
 * tiene la fecha va al final, también del más antiguo al más nuevo.
 */
function comparador(orden: Orden) {
  if (orden === "reciente") return (a: EquipoTaller, b: EquipoTaller) => (b.actualizado?.getTime() ?? 0) - (a.actualizado?.getTime() ?? 0);
  const porIngreso = (a: EquipoTaller, b: EquipoTaller) => tiempo(a.etapas.ingresado) - tiempo(b.etapas.ingresado);
  const enTrabajo = (e: EquipoTaller) => indiceEstado(e.estado) < indiceEstado("listo");
  const clave =
    orden === "antiguedad"
      ? (e: EquipoTaller) => (enTrabajo(e) ? e.etapas.ingresado : undefined)
      : (e: EquipoTaller) => (e.estado === "reparacion" || e.estado === "ensayos" ? e.etapas.reparacion : undefined);
  return (a: EquipoTaller, b: EquipoTaller) => tiempo(clave(a)) - tiempo(clave(b)) || porIngreso(a, b);
}

/**
 * Búsqueda por código, referencia, equipo, N.º de fabricación, N.º de orden, N.º de trafo, fabricante o empresa, más los
 * filtros de empresa y estado, y el orden.
 */
export function useFiltros(equipos: EquipoTaller[], empresas: Empresa[], limites: LimitesAvisos) {
  const [texto, setTexto] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("en-taller");
  const [orden, setOrden] = useState<Orden>("antiguedad");

  const filtrados = useMemo(() => {
    const nombres = new Map(empresas.map((e) => [e.id, e.nombre]));
    const buscado = sinAcentos(texto.trim());
    const codigo = normalizarCodigo(texto);
    const hoy = new Date();
    return equipos
      .filter((e) => {
        if ((estado === "baja") !== !!e.baja) return false;
        if (empresa && e.empresa !== empresa) return false;
        if (estado === "en-taller" && e.estado === "entregado") return false;
        if (estado === "con-aviso" && !conAviso(e, limites, hoy)) return false;
        if (esEstado(estado) && e.estado !== estado) return false;
        if (!buscado) return true;
        if (codigo.length >= 2 && e.codigo.includes(codigo)) return true;
        return sinAcentos(
          [e.referencia, e.equipo, e.serie, e.numeroOrden, e.numeroTrafo, e.placa?.fabricante, nombres.get(e.empresa)].filter(Boolean).join(" "),
        ).includes(buscado);
      })
      .sort(comparador(orden));
  }, [equipos, empresas, limites, texto, empresa, estado, orden]);

  return { filtrados, texto, setTexto, empresa, setEmpresa, estado, setEstado, orden, setOrden };
}

export type Filtros = ReturnType<typeof useFiltros>;

export function BarraFiltros({
  filtros,
  empresas,
  total,
  conBajas = false,
}: {
  filtros: Filtros;
  empresas: Empresa[];
  /** Cuántos equipos hay sin contar los dados de baja. */
  total: number;
  /** Ofrece la vista de los dados de baja, para reactivarlos. */
  conBajas?: boolean;
}) {
  const id = useId();
  return (
    <div role="search" aria-label="Buscar equipos">
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* La búsqueda ocupa la fila entera en pantallas medianas; en las grandes, las cuatro van en fila. */}
        <div className="md:col-span-3 xl:col-span-1">
          <label htmlFor={`${id}-texto`} className="rotulo block text-[0.8125rem]">
            Buscar
          </label>
          <input
            id={`${id}-texto`}
            type="search"
            value={filtros.texto}
            onChange={(e) => filtros.setTexto(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="renglon mt-0.5 text-base"
          />
        </div>
        <div>
          <label htmlFor={`${id}-empresa`} className="rotulo block text-[0.8125rem]">
            Empresa
          </label>
          <select id={`${id}-empresa`} value={filtros.empresa} onChange={(e) => filtros.setEmpresa(e.target.value)} className="renglon mt-0.5 text-base">
            <option value="">Todas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-estado`} className="rotulo block text-[0.8125rem]">
            Estado
          </label>
          <select
            id={`${id}-estado`}
            value={filtros.estado}
            onChange={(e) => filtros.setEstado(e.target.value as FiltroEstado)}
            className="renglon mt-0.5 text-base"
          >
            {/* Dos tipos de opción: cuánto de la lista ver, o un estado puntual. */}
            <optgroup label="Vista">
              <option value="en-taller">En el taller</option>
              <option value="con-aviso">Con aviso de demora</option>
              <option value="todos">Todos, también los entregados</option>
              {conBajas && <option value="baja">Dados de baja</option>}
            </optgroup>
            <optgroup label="Estado">
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {DEFINICIONES[estado].nombre}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-orden`} className="rotulo block text-[0.8125rem]">
            Ordenar por
          </label>
          <select id={`${id}-orden`} value={filtros.orden} onChange={(e) => filtros.setOrden(e.target.value as Orden)} className="renglon mt-0.5 text-base">
            {(Object.keys(NOMBRES_ORDEN) as Orden[]).map((orden) => (
              <option key={orden} value={orden}>
                {NOMBRES_ORDEN[orden]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p aria-live="polite" className="mt-3 text-[0.9375rem] text-grafito">
        {filtros.estado === "baja"
          ? `${filtros.filtrados.length} ${filtros.filtrados.length === 1 ? "dado" : "dados"} de baja`
          : filtros.filtrados.length === total
            ? `${total} ${total === 1 ? "equipo" : "equipos"}`
            : `${filtros.filtrados.length} de ${total} equipos`}
      </p>
    </div>
  );
}
