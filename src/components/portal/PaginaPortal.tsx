"use client";

import type { ReactNode } from "react";
import { Alerta } from "@/components/iconos";
import { EsqueletoAcceso } from "@/components/ingreso/piezas";
import type { PortalCliente } from "@/lib/dominio/tipos";
import { AvisoDatosPrueba, agrupar, CargaPortal, plural } from "./piezas";
import { usePortal } from "./usePortal";

/**
 * Página del portal: la sesión, el título, los estados de carga y la banda de abajo. Cada diseño
 * recibe los datos ya cargados y decide cómo mostrar los equipos.
 */
export function PaginaPortal({ children }: { children: (portal: PortalCliente) => ReactNode }) {
  const { estado, reintentar, salir } = usePortal();
  const sesion = estado.fase === "verificando" ? null : estado.sesion;
  const portal = estado.fase === "listo" ? estado.portal : null;
  const grupos = portal ? agrupar(portal.equipos) : null;

  let contenido: ReactNode;
  if (estado.fase === "verificando" || estado.fase === "cargando") {
    contenido = <CargaPortal />;
  } else if (estado.fase === "sin-empresa") {
    contenido = (
      <p className="mt-8 max-w-[56ch] text-lg">
        Su cuenta todavía no está asociada a una empresa. Comuníquese con el taller para que la asocie y pueda ver sus
        equipos acá.
      </p>
    );
  } else if (estado.fase === "error") {
    contenido = (
      <div className="mt-8 flex flex-col items-start gap-5">
        <p role="alert" className="flex max-w-[52ch] items-start gap-2 text-lg font-medium text-rojo">
          <Alerta className="mt-1 size-5 shrink-0" />
          No se pudieron cargar sus equipos. Revise su conexión e intente de nuevo.
        </p>
        <button type="button" onClick={reintentar} className="placa-secundaria">
          Reintentar
        </button>
      </div>
    );
  } else if (estado.portal.equipos.length === 0) {
    contenido = (
      <p className="mt-8 max-w-[56ch] text-lg">
        Todavía no hay equipos de su empresa en el taller. Cuando el taller registre uno, aparece acá con su estado.
      </p>
    );
  } else {
    contenido = children(estado.portal);
  }

  return (
    <EsqueletoAcceso
      derecha={
        sesion ? (
          <div className="flex items-center gap-5">
            <span className="hidden text-[0.9375rem] md:inline">{sesion.email}</span>
            <button type="button" onClick={salir} className="placa-secundaria">
              Salir
            </button>
          </div>
        ) : null
      }
      banda={
        <>
          <p className="max-w-[60ch] text-[0.9375rem]">
            <strong className="font-semibold">El estado de cada equipo lo carga el taller.</strong> Para aprobar un
            presupuesto, coordinar una entrega o hacer una consulta, comuníquese con el taller.
          </p>
          <AvisoDatosPrueba />
        </>
      }
    >
      <section
        aria-labelledby="titulo-portal"
        aria-busy={estado.fase === "verificando" || estado.fase === "cargando"}
        className="mx-auto w-full max-w-[1500px] flex-1 px-7 pb-20 pt-10 sm:px-12 sm:pt-14 xl:px-24"
      >
        <p className="rotulo text-[0.9375rem] text-grafito">{portal?.empresa || "Portal de clientes"}</p>
        <h1 id="titulo-portal" className="mt-2 font-cartel text-[3rem] font-bold leading-[0.92] sm:text-[4rem]">
          Sus equipos
        </h1>
        {grupos && portal && portal.equipos.length > 0 && (
          <p className="mt-4 text-lg">
            {plural(grupos.enTaller.length, "en el taller", "en el taller")} ·{" "}
            {plural(grupos.entregados.length, "entregado", "entregados")}
            {grupos.atencion.length > 0 && (
              <>
                {" · "}
                <strong className="font-semibold">
                  {plural(grupos.atencion.length, "requiere su atención", "requieren su atención")}
                </strong>
              </>
            )}
          </p>
        )}
        {contenido}
      </section>
    </EsqueletoAcceso>
  );
}
