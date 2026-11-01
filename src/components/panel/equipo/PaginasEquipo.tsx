"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatearCodigo, normalizarCodigo } from "@/lib/dominio/codigo";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { nombreOrden, ordenParaEtiqueta, trafoDeOrden } from "@/lib/dominio/trafo";
import { Dialogo, ErrorFormulario, mensajeDeError } from "../Dialogo";
import { Etiqueta } from "../Etiqueta";
import { dejarAviso, PaginaPanel } from "../PaginaPanel";
import type { AccionesPanel } from "../usePanel";
import { FormularioOrden, FormularioOT } from "./FormularioOT";

const enlace = "font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/**
 * Una orden de trabajo nueva para el transformador que llega: uno que ya pasó por el taller (desde su
 * ficha llega en `?trafo=`) o uno nuevo. Al terminar, la misma página muestra la etiqueta con el código y
 * el QR para imprimir, y deja crear la siguiente.
 */
export function PanelRegistrar() {
  const router = useRouter();
  const trafoInicial = useSearchParams().get("trafo") ?? undefined;
  const [registrado, setRegistrado] = useState<EquipoTaller | null>(null);
  // Cambia con cada O.T. nueva, para que el formulario vuelva a empezar vacío.
  const [ronda, setRonda] = useState(0);

  return (
    <PaginaPanel seccion="equipos" titulo={registrado ? "O.T. creada" : "Nueva O.T."}>
      {(api) =>
        registrado ? (
          <div className="mt-6 flex flex-col items-start gap-6">
            <p role="status" className="max-w-[56ch] text-lg">
              La <strong className="font-semibold">{nombreOrden(registrado)}</strong>
              {registrado.numeroOrdenTemporal && " (N.º temporal)"} del transformador{" "}
              <strong className="font-semibold">{trafoDeOrden(registrado)}</strong> quedó como <strong className="font-semibold">Ingresado</strong>{" "}
              con el código <strong className="font-semibold tracking-[0.04em]">{formatearCodigo(registrado.codigo)}</strong>. Imprima la
              etiqueta y péguela en el transformador o en la orden en papel.
              {registrado.numeroOrdenTemporal && " La etiqueta sale sin el N.º de O.T.: cárguelo en la O.T. cuando lo tenga."}
            </p>
            <Etiqueta equipo={registrado} empresa={api.empresaDe(registrado)} orden={ordenParaEtiqueta(registrado)} />
            <p className="flex flex-wrap gap-x-6 gap-y-2">
              <button
                type="button"
                onClick={() => {
                  setRegistrado(null);
                  setRonda((n) => n + 1);
                  // La siguiente puede ser de otro transformador: se empieza sin el de la dirección.
                  if (trafoInicial) router.replace("/panel/registrar");
                  window.scrollTo({ top: 0 });
                }}
                className={`cursor-pointer ${enlace}`}
              >
                Crear otra O.T.
              </button>
              <Link href={`/panel/equipo?codigo=${registrado.codigo}`} className={enlace}>
                Ver la O.T.
              </Link>
              <Link href={`/panel/transformador?id=${registrado.trafo}`} className={enlace}>
                Ver el transformador
              </Link>
              <Link href="/panel" className={enlace}>
                Ver todas las órdenes de trabajo
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className="mt-4 max-w-[62ch] text-lg">
              Primero los datos de la orden y después el transformador que llegó: si ya pasó por el taller, búsquelo por su N.º de trafo o
              su N.º T; si no, dé de alta uno nuevo con su chapa.
            </p>
            <FormularioOT
              key={ronda}
              taller={api.taller}
              acciones={api.acciones}
              crearEmpresas={api.puede("empresas")}
              puedeDarDeBaja={api.puede("baja-transformadores")}
              trafoInicial={trafoInicial}
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

/** Corregir o completar los datos de una orden ya creada. Al guardar, vuelve a su ficha. */
export function PanelEditar() {
  const router = useRouter();
  const codigo = normalizarCodigo(useSearchParams().get("codigo") ?? "");

  return (
    <PaginaPanel seccion="equipos" titulo="Datos de la O.T.">
      {(api) => {
        const equipo = api.taller.equipos.find((e) => e.codigo === codigo);
        if (!equipo) {
          return (
            <p className="mt-6 max-w-[56ch] text-lg">
              No se encontró la orden de trabajo{codigo ? ` ${formatearCodigo(codigo)}` : ""}.{" "}
              <Link href="/panel" className={enlace}>
                Volver a las órdenes de trabajo
              </Link>
              .
            </p>
          );
        }
        if (equipo.baja) {
          return (
            <div className="mt-6 flex flex-col items-start gap-5">
              <p className="max-w-[56ch] text-lg">
                La <span className="font-semibold">{nombreOrden(equipo)}</span> está dada de baja: no se puede editar.
                {api.puede("baja-equipos") ? " Reactívela para volver a trabajar con ella." : " Si hace falta, pídale a un administrador que la reactive."}
              </p>
              {api.puede("baja-equipos") && (
                <button type="button" onClick={() => api.reactivar("equipo", equipo.codigo, nombreOrden(equipo))} className="placa-secundaria">
                  Reactivar
                </button>
              )}
            </div>
          );
        }
        return (
          <>
            <p className="mt-4 text-lg">
              <span className="font-semibold">{nombreOrden(equipo)}</span> · código{" "}
              <span className="tracking-[0.04em]">{formatearCodigo(equipo.codigo)}</span> · transformador{" "}
              <Link href={`/panel/transformador?id=${equipo.trafo}`} className={enlace}>
                {trafoDeOrden(equipo)}
              </Link>
            </p>
            <FormularioOrden
              taller={api.taller}
              acciones={api.acciones}
              equipo={equipo}
              onGuardado={(guardado) => {
                dejarAviso(`Se guardaron los datos de la ${nombreOrden(guardado)}.`);
                router.push(`/panel/equipo?codigo=${guardado.codigo}`);
              }}
            />
            {api.puede("baja-equipos") && (
              <BajaEquipo
                equipo={equipo}
                acciones={api.acciones}
                onBaja={() => {
                  dejarAviso(`Se dio de baja la ${nombreOrden(equipo)}. Para reactivarla, elija la vista "Dados de baja".`);
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
 * Dar de baja una orden, con confirmación: el cliente deja de verla y el código deja de funcionar. Nada se
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
        Para una O.T. cargada por error o que ya no corresponde seguir. El cliente deja de verla en su portal y el código deja de
        funcionar en la consulta pública. Nada se borra: se puede reactivar.
      </p>
      <button type="button" onClick={() => setConfirmando(true)} className="placa-secundaria mt-4">
        Dar de baja la O.T.
      </button>
      <Dialogo abierto={confirmando} titulo="Dar de baja la O.T." onCerrar={() => setConfirmando(false)}>
        <div className="flex flex-col gap-5">
          <p className="max-w-[56ch]">
            ¿Dar de baja la <strong className="font-semibold">{nombreOrden(equipo)}</strong> ({formatearCodigo(equipo.codigo)})? Los cambios
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
