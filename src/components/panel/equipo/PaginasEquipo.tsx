"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { nombreDe } from "@/components/portal/piezas";
import { formatearCodigo, normalizarCodigo } from "@/lib/dominio/codigo";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { Etiqueta } from "../Etiqueta";
import { dejarAviso, PaginaPanel } from "../PaginaPanel";
import { FormularioEquipo } from "./FormularioEquipo";

const enlace = "font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/**
 * Registrar un equipo que llega al taller. Al terminar, la misma página muestra la etiqueta con el
 * código y el QR para imprimir, y deja registrar el siguiente.
 */
export function PanelRegistrar() {
  const [registrado, setRegistrado] = useState<EquipoTaller | null>(null);
  // Cambia con cada equipo nuevo, para que el formulario vuelva a empezar vacío.
  const [ronda, setRonda] = useState(0);

  return (
    <PaginaPanel seccion="equipos" titulo={registrado ? "Equipo registrado" : "Registrar equipo"}>
      {(api) =>
        registrado ? (
          <div className="mt-6 flex flex-col items-start gap-6">
            <p role="status" className="max-w-[56ch] text-lg">
              Quedó registrado como <strong className="font-semibold">Ingresado</strong> con el código{" "}
              <strong className="font-semibold tracking-[0.04em]">{formatearCodigo(registrado.codigo)}</strong>. Imprima la etiqueta y
              péguela en el equipo o en la orden de trabajo en papel.
            </p>
            <Etiqueta equipo={registrado} empresa={api.empresaDe(registrado)} orden={registrado.numeroOrden} />
            <p className="flex flex-wrap gap-x-6 gap-y-2">
              <button
                type="button"
                onClick={() => {
                  setRegistrado(null);
                  setRonda((n) => n + 1);
                  window.scrollTo({ top: 0 });
                }}
                className={`cursor-pointer ${enlace}`}
              >
                Registrar otro equipo
              </button>
              <Link href="/panel" className={enlace}>
                Ver todos los equipos
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className="mt-4 max-w-[62ch] text-lg">
              Con el equipo a la vista, copie su chapa de arriba hacia abajo. Solo son obligatorios el cliente, la fecha de recepción y
              las fases.
            </p>
            <FormularioEquipo
              key={ronda}
              taller={api.taller}
              acciones={api.acciones}
              onRegistrado={(equipo) => {
                setRegistrado(equipo);
                window.scrollTo({ top: 0 });
              }}
            />
          </>
        )
      }
    </PaginaPanel>
  );
}

/** Corregir o completar los datos y la chapa de un equipo ya registrado. Al guardar, vuelve a la lista. */
export function PanelEditar() {
  const router = useRouter();
  const codigo = normalizarCodigo(useSearchParams().get("codigo") ?? "");

  return (
    <PaginaPanel seccion="equipos" titulo="Datos del equipo">
      {(api) => {
        const equipo = api.taller.equipos.find((e) => e.codigo === codigo);
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
            <p className="mt-4 text-lg">
              <span className="font-semibold">{nombreDe(equipo)}</span> · código{" "}
              <span className="tracking-[0.04em]">{formatearCodigo(equipo.codigo)}</span>
              {equipo.numeroOrden && <> · orden N.º {equipo.numeroOrden}</>}
            </p>
            <FormularioEquipo
              taller={api.taller}
              acciones={api.acciones}
              equipo={equipo}
              onGuardado={(guardado) => {
                dejarAviso(`Se guardaron los datos de ${nombreDe(guardado)}.`);
                router.push("/panel");
              }}
            />
          </>
        );
      }}
    </PaginaPanel>
  );
}
