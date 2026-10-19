"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alerta } from "@/components/iconos";
import { nombreDe } from "@/components/portal/piezas";
import { ErrorDePanel } from "@/lib/datos/repositorios";
import { bobinadoVacio, type BobinadoGuardado } from "@/lib/dominio/bobinado";
import { formatearCodigo, normalizarCodigo } from "@/lib/dominio/codigo";
import { reparacionesDelTrafo } from "@/lib/dominio/trafo";
import { PaginaPanel, type ApiPanel } from "../PaginaPanel";
import { FormularioBobinado, type BobinadoAnterior } from "./FormularioBobinado";

const enlace = "font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/** Los datos de bobinado de una reparación, que carga el jefe de taller. */
export function PanelBobinado() {
  const codigo = normalizarCodigo(useSearchParams().get("codigo") ?? "");
  return (
    <PaginaPanel
      seccion="equipos"
      titulo="Datos de bobinado"
      nota={
        <>
          <strong className="font-semibold">Los datos de bobinado son solo para el taller.</strong> El cliente no los ve en su portal ni
          en la consulta pública.
        </>
      }
    >
      {(api) => <ContenidoBobinado api={api} codigo={codigo} />}
    </PaginaPanel>
  );
}

type Carga = { guardado: BobinadoGuardado | null; anterior: BobinadoAnterior | null } | "error" | "permiso" | null;

function ContenidoBobinado({ api, codigo }: { api: ApiPanel; codigo: string }) {
  const equipo = api.taller.equipos.find((e) => e.codigo === codigo);
  const [carga, setCarga] = useState<Carga>(null);
  const [intento, setIntento] = useState(0);
  const { obtenerBobinado } = api.acciones;
  // Reparaciones anteriores del mismo trafo, de la más nueva a la más vieja.
  const anteriores = equipo?.numeroTrafo ? reparacionesDelTrafo(api.taller.equipos, equipo.numeroTrafo, equipo.codigo) : [];
  const claveAnteriores = anteriores.map((e) => e.codigo).join(",");

  useEffect(() => {
    if (!equipo) return;
    let activo = true;
    Promise.all([obtenerBobinado(equipo.codigo), Promise.all(anteriores.map((e) => obtenerBobinado(e.codigo)))])
      .then(([guardado, previos]) => {
        // La reparación anterior más nueva que tenga algo cargado.
        const i = previos.findIndex((b) => b && !bobinadoVacio(b));
        if (activo) setCarga({ guardado, anterior: i >= 0 ? { equipo: anteriores[i], bobinado: previos[i]! } : null });
      })
      .catch((e) => activo && setCarga(e instanceof ErrorDePanel && e.motivo === "permiso" ? "permiso" : "error"));
    return () => {
      activo = false;
    };
    // `obtenerBobinado` y `anteriores` cambian en cada render del panel; alcanza con los códigos y los reintentos.
  }, [equipo?.codigo, claveAnteriores, intento]);

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

  return (
    <>
      <p className="mt-4 max-w-[70ch] text-lg">
        <span className="font-semibold">{nombreDe(equipo)}</span>
        {equipo.referencia && <> · {equipo.equipo}</>} · {api.empresaDe(equipo) || "Sin cliente"} · código{" "}
        <span className="tracking-[0.04em]">{formatearCodigo(equipo.codigo)}</span>
        {equipo.numeroOrden && <> · orden N.º {equipo.numeroOrden}</>}
        {equipo.numeroTrafo && <> · trafo N.º {equipo.numeroTrafo}</>}
      </p>
      {carga === null ? (
        <p role="status" className="mt-10 text-lg">
          Cargando los datos de bobinado…
        </p>
      ) : carga === "error" || carga === "permiso" ? (
        <div className="mt-8 flex flex-col items-start gap-5">
          <p role="alert" className="flex max-w-[52ch] items-start gap-2 text-lg font-medium text-rojo">
            <Alerta className="mt-1 size-5 shrink-0" />
            {carga === "permiso"
              ? "Su cuenta no tiene permiso para ver los datos de bobinado. Avise a quien administra el sistema."
              : "No se pudieron cargar los datos de bobinado. Revise su conexión e intente de nuevo."}
          </p>
          <button
            type="button"
            onClick={() => {
              setCarga(null);
              setIntento((n) => n + 1);
            }}
            className="placa-secundaria"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <FormularioBobinado
          key={equipo.codigo}
          equipo={equipo}
          acciones={api.acciones}
          email={api.email}
          guardado={carga.guardado}
          anterior={carga.anterior}
        />
      )}
    </>
  );
}
