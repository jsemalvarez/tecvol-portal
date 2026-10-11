"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alerta } from "@/components/iconos";
import { nombreDe } from "@/components/portal/piezas";
import { formatearCodigo, normalizarCodigo } from "@/lib/dominio/codigo";
import type { InformeGuardado } from "@/lib/dominio/informe";
import { PaginaPanel, type ApiPanel } from "../PaginaPanel";
import { FormularioInforme } from "./FormularioInforme";

const enlace = "font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/** El informe de diagnóstico de un equipo, que el taller carga después de desarmarlo. */
export function PanelInforme() {
  const codigo = normalizarCodigo(useSearchParams().get("codigo") ?? "");
  return (
    <PaginaPanel
      seccion="equipos"
      titulo="Informe de diagnóstico"
      nota={
        <>
          <strong className="font-semibold">El informe es solo para el taller.</strong> El cliente no lo ve en su portal ni en la consulta
          pública.
        </>
      }
    >
      {(api) => <ContenidoInforme api={api} codigo={codigo} />}
    </PaginaPanel>
  );
}

function ContenidoInforme({ api, codigo }: { api: ApiPanel; codigo: string }) {
  const equipo = api.taller.equipos.find((e) => e.codigo === codigo);
  const [carga, setCarga] = useState<{ informe: InformeGuardado | null } | "error" | null>(null);
  const [intento, setIntento] = useState(0);
  const { obtenerInforme } = api.acciones;

  useEffect(() => {
    if (!equipo) return;
    let activo = true;
    obtenerInforme(equipo.codigo)
      .then((informe) => activo && setCarga({ informe }))
      .catch(() => activo && setCarga("error"));
    return () => {
      activo = false;
    };
    // `obtenerInforme` cambia en cada render del panel; alcanza con el equipo y los reintentos.
  }, [equipo?.codigo, intento]);

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
      </p>
      {carga === null ? (
        <p role="status" className="mt-10 text-lg">
          Cargando el informe…
        </p>
      ) : carga === "error" ? (
        <div className="mt-8 flex flex-col items-start gap-5">
          <p role="alert" className="flex max-w-[52ch] items-start gap-2 text-lg font-medium text-rojo">
            <Alerta className="mt-1 size-5 shrink-0" />
            No se pudo cargar el informe. Revise su conexión e intente de nuevo.
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
        <FormularioInforme key={equipo.codigo} equipo={equipo} acciones={api.acciones} email={api.email} guardado={carga.informe} />
      )}
    </>
  );
}
