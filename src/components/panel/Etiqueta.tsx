"use client";

import Image from "next/image";
import qrcode from "qrcode-generator";
import { useMemo, type ReactNode } from "react";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { formatearFecha } from "@/lib/dominio/fechas";
import type { EquipoCliente } from "@/lib/dominio/tipos";

/** QR en SVG, módulo por módulo, con su margen blanco de cuatro módulos. */
export function CodigoQR({ valor, className = "" }: { valor: string; className?: string }) {
  const { lado, trazo } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(valor);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let fila = 0; fila < n; fila++) {
      for (let columna = 0; columna < n; columna++) {
        if (qr.isDark(fila, columna)) d += `M${columna + 4} ${fila + 4}h1v1h-1z`;
      }
    }
    return { lado: n + 8, trazo: d };
  }, [valor]);

  return (
    <svg viewBox={`0 0 ${lado} ${lado}`} shapeRendering="crispEdges" className={className} aria-hidden="true">
      <rect width={lado} height={lado} fill="#fff" />
      <path d={trazo} fill="#1a1a1a" />
    </svg>
  );
}

/**
 * Etiqueta del equipo para imprimir y pegar en él o en la orden de ingreso: el código, los datos
 * para reconocerlo y un QR que abre la consulta pública. Al imprimir, solo sale la etiqueta.
 * La usan el panel y el portal. Con `children`, esas acciones van primero e imprimir pasa a secundaria.
 */
export function Etiqueta({ equipo, empresa, children }: { equipo: EquipoCliente; empresa: string; children?: ReactNode }) {
  const origen = typeof window === "undefined" ? "" : window.location.origin;
  const enlace = `${origen}/seguimiento/${equipo.codigo}`;
  const ingreso = equipo.etapas.ingresado;

  return (
    <div className="flex flex-col items-start gap-5">
      <div className="impresion w-full max-w-[27rem] rounded-[0.25rem] border-2 border-tinta bg-blanco p-4 text-tinta">
        <div className="flex items-center justify-between gap-3 border-b-2 border-tinta pb-2">
          <Image src="/marca/tecvol-logo.png" alt="Tecvol" width={1600} height={379} unoptimized className="h-6 w-auto" />
          <span className="rotulo text-[0.8125rem]">Seguimiento de reparación</span>
        </div>
        <div className="mt-3 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4">
          <CodigoQR valor={enlace} className="w-full" />
          <div className="min-w-0">
            <p className="rotulo text-[0.8125rem]">Código</p>
            <p className="font-cartel text-[2.5rem] font-bold leading-none tracking-[0.06em]">{formatearCodigo(equipo.codigo)}</p>
            {equipo.referencia && <p className="mt-2 font-semibold leading-snug">{equipo.referencia}</p>}
            <p className="text-[0.8125rem] leading-snug">{equipo.equipo}</p>
            {empresa && <p className="text-[0.8125rem] leading-snug">{empresa}</p>}
            {ingreso && <p className="text-[0.8125rem] leading-snug">Ingresó el {formatearFecha(ingreso)}</p>}
          </div>
        </div>
        <p className="mt-3 border-t border-tinta pt-2 text-[0.8125rem] leading-snug">
          Escanee el QR o escriba el código en {origen.replace(/^https?:\/\//, "")} para ver el estado.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <button type="button" onClick={() => window.print()} className={children ? "placa-secundaria" : "placa"}>
          Imprimir etiqueta
        </button>
      </div>
    </div>
  );
}
