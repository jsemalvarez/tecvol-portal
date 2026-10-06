"use client";

import { useId, useMemo, useState } from "react";
import { normalizarCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES, ESTADOS, esEstado, type EstadoReparacion } from "@/lib/dominio/estados";
import type { Empresa, EquipoTaller } from "@/lib/dominio/tipos";

export type FiltroEstado = "en-taller" | "todos" | EstadoReparacion;

const sinAcentos = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Búsqueda por código, referencia, equipo, serie o empresa, más los filtros de empresa y estado. */
export function useFiltros(equipos: EquipoTaller[], empresas: Empresa[]) {
  const [texto, setTexto] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("en-taller");

  const filtrados = useMemo(() => {
    const nombres = new Map(empresas.map((e) => [e.id, e.nombre]));
    const buscado = sinAcentos(texto.trim());
    const codigo = normalizarCodigo(texto);
    return equipos.filter((e) => {
      if (empresa && e.empresa !== empresa) return false;
      if (estado === "en-taller" && e.estado === "entregado") return false;
      if (esEstado(estado) && e.estado !== estado) return false;
      if (!buscado) return true;
      if (codigo.length >= 2 && e.codigo.includes(codigo)) return true;
      return sinAcentos([e.referencia, e.equipo, e.serie, nombres.get(e.empresa)].filter(Boolean).join(" ")).includes(buscado);
    });
  }, [equipos, empresas, texto, empresa, estado]);

  return { filtrados, texto, setTexto, empresa, setEmpresa, estado, setEstado };
}

export type Filtros = ReturnType<typeof useFiltros>;

export function BarraFiltros({
  filtros,
  empresas,
  total,
}: {
  filtros: Filtros;
  empresas: Empresa[];
  total: number;
}) {
  const id = useId();
  return (
    <div role="search" aria-label="Buscar equipos">
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
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
            <option value="en-taller">En el taller</option>
            <option value="todos">Todos, con los entregados</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {DEFINICIONES[estado].nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p aria-live="polite" className="mt-3 text-[0.9375rem] text-grafito">
        {filtros.filtrados.length === total
          ? `${total} ${total === 1 ? "equipo" : "equipos"}`
          : `${filtros.filtrados.length} de ${total} equipos`}
      </p>
    </div>
  );
}
