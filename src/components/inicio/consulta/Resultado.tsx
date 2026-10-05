import Link from "next/link";
import { DEFINICIONES } from "@/lib/dominio/estados";
import { formatearFecha } from "@/lib/dominio/fechas";
import type { SeguimientoPublico } from "@/lib/dominio/tipos";
import { PORTAL_HABILITADO } from "@/lib/etapas-demo";

/** Datos públicos del equipo consultado y el paso siguiente. Cada versión del inicio lo enmarca a su modo. */
export function Resultado({ seguimiento, onOtra }: { seguimiento: SeguimientoPublico; onOtra: () => void }) {
  const definicion = DEFINICIONES[seguimiento.estado];
  const desde = seguimiento.etapas[seguimiento.estado];
  const terminado = seguimiento.estado === "listo" || seguimiento.estado === "entregado";

  return (
    <>
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-[auto_1fr]">
        <dt className="rotulo pt-0.5 text-[0.9375rem]">Equipo</dt>
        <dd className="text-lg font-medium">{seguimiento.equipo || "Sin descripción"}</dd>
        <dt className="rotulo pt-0.5 text-[0.9375rem]">Estado</dt>
        <dd className="text-lg">
          <strong className="font-semibold">{definicion.nombre}</strong>
          {desde && <> desde el {formatearFecha(desde)}</>}
        </dd>
        {!terminado && (
          <>
            <dt className="rotulo pt-0.5 text-[0.9375rem]">Entrega estimada</dt>
            <dd className="text-lg">A confirmar por el taller</dd>
          </>
        )}
      </dl>
      <p className="mt-4">{definicion.significado}</p>
      <div className="mt-5 flex flex-col items-start gap-4">
        <p>
          Todos los equipos de su empresa y su historial:{" "}
          <Link href="/ingresar" className="font-semibold underline">
            ingresar al portal
          </Link>
        </p>
        {!PORTAL_HABILITADO && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-[0.9375rem]">
            <span className="tarjeta-bloqueo">En preparación</span>
            El portal se habilita en la próxima etapa de esta demo.
          </p>
        )}
      </div>
      <button type="button" onClick={onOtra} className="placa-secundaria mt-6">
        Consultar otro código
      </button>
    </>
  );
}
