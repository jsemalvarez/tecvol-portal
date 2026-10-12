"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { nombreDe } from "@/components/portal/piezas";
import { formatearCodigo, normalizarCodigo } from "@/lib/dominio/codigo";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { Dialogo, ErrorFormulario, mensajeDeError } from "../Dialogo";
import { Etiqueta } from "../Etiqueta";
import { dejarAviso, PaginaPanel } from "../PaginaPanel";
import type { AccionesPanel } from "../usePanel";
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
              crearEmpresas={api.puede("empresas")}
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
        if (equipo.baja) {
          return (
            <div className="mt-6 flex flex-col items-start gap-5">
              <p className="max-w-[56ch] text-lg">
                <span className="font-semibold">{nombreDe(equipo)}</span> está dado de baja: no se puede editar.
                {api.puede("baja-equipos") ? " Reactívelo para volver a trabajar con él." : " Si hace falta, pídale a un administrador que lo reactive."}
              </p>
              {api.puede("baja-equipos") && (
                <button type="button" onClick={() => api.reactivar("equipo", equipo.codigo, nombreDe(equipo))} className="placa-secundaria">
                  Reactivar
                </button>
              )}
            </div>
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
              crearEmpresas={api.puede("empresas")}
              onGuardado={(guardado) => {
                dejarAviso(`Se guardaron los datos de ${nombreDe(guardado)}.`);
                router.push("/panel");
              }}
            />
            {api.puede("baja-equipos") && (
              <BajaEquipo
                equipo={equipo}
                acciones={api.acciones}
                onBaja={() => {
                  dejarAviso(`Se dio de baja ${nombreDe(equipo)}. Para reactivarlo, elija la vista "Dados de baja".`);
                  router.push("/panel");
                }}
              />
            )}
          </>
        );
      }}
    </PaginaPanel>
  );
}

/**
 * Dar de baja un equipo, con confirmación: el cliente deja de verlo y el código deja de funcionar. Nada se
 * borra: queda en la vista "Dados de baja" de la lista, desde donde se reactiva.
 */
function BajaEquipo({ equipo, acciones, onBaja }: { equipo: EquipoTaller; acciones: AccionesPanel; onBaja: () => void }) {
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setGuardando(true);
    setError(null);
    try {
      await acciones.darDeBaja("equipo", equipo.codigo);
      onBaja();
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby="baja-equipo" className="mt-14 max-w-[60ch] border-t-[3px] border-acero pt-6">
      <h2 id="baja-equipo" className="rotulo text-base">
        Dar de baja
      </h2>
      <p className="mt-2">
        Para un equipo cargado por error o que ya no corresponde seguir. El cliente deja de verlo en su portal y el código deja de
        funcionar en la consulta pública. Nada se borra: se puede reactivar.
      </p>
      <button type="button" onClick={() => setConfirmando(true)} className="placa-secundaria mt-4">
        Dar de baja el equipo
      </button>
      <Dialogo abierto={confirmando} titulo="Dar de baja el equipo" onCerrar={() => setConfirmando(false)}>
        <div className="flex flex-col gap-5">
          <p className="max-w-[56ch]">
            ¿Dar de baja <strong className="font-semibold">{nombreDe(equipo)}</strong> ({formatearCodigo(equipo.codigo)})? Los cambios
            sin guardar de este formulario se pierden.
          </p>
          <ErrorFormulario texto={error} />
          <button type="button" onClick={confirmar} className="placa self-start" disabled={guardando}>
            {guardando ? "Dando de baja…" : "Sí, dar de baja"}
          </button>
        </div>
      </Dialogo>
    </section>
  );
}
