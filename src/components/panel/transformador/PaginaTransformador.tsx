"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { formatearFecha } from "@/lib/dominio/fechas";
import { formatearNumero, NOMBRE_FASES, NOMBRE_USOS } from "@/lib/dominio/placa";
import type { Transformador } from "@/lib/dominio/tipos";
import { historialNumeroT, nombreOrden, nombreTrafo, numerosTAnteriores, ordenesDelTrafo } from "@/lib/dominio/trafo";
import { Dialogo, ErrorFormulario, mensajeDeError } from "../Dialogo";
import { MarcaTemporal } from "../equipo/campos";
import { resumenChapa } from "../equipo/FormularioOT";
import { ListaOrdenes } from "../equipo/HistorialTrafo";
import { dejarAviso, PaginaPanel, type ApiPanel } from "../PaginaPanel";
import { FormularioTransformador } from "./FormularioTransformador";

const enlace = "font-semibold underline decoration-naranja decoration-2 underline-offset-4";

function NoEncontrado() {
  return (
    <p className="mt-6 max-w-[56ch] text-lg">
      No se encontró el transformador.{" "}
      <Link href="/panel/transformadores" className={enlace}>
        Volver a los transformadores
      </Link>
      .
    </p>
  );
}

/**
 * Ficha de un transformador: sus números, su chapa, todas las órdenes de trabajo que tuvo y el historial
 * de su N.º T. Desde acá se crea su O.T. nueva cuando vuelve al taller y se lo da de baja si se destruyó.
 */
export function PanelTransformador() {
  const id = useSearchParams().get("id") ?? "";
  return (
    <PaginaPanel seccion="transformadores" titulo="Transformador">
      {(api) => <FichaTransformador api={api} id={id} />}
    </PaginaPanel>
  );
}

function FichaTransformador({ api, id }: { api: ApiPanel; id: string }) {
  const trafo = api.taller.transformadores.find((t) => t.id === id);
  if (!trafo) return <NoEncontrado />;

  const ordenes = ordenesDelTrafo(api.taller.equipos, trafo.id, { conBajas: true });
  const abiertas = ordenes.filter((o) => !o.baja && o.estado !== "entregado");
  const empresa = api.taller.empresas.find((e) => e.id === trafo.empresa)?.nombre ?? "Sin cliente";
  const anteriores = numerosTAnteriores(api.taller.equipos, trafo);
  const numerosT = trafo.numeroT ? [trafo.numeroT, ...anteriores] : anteriores;

  return (
    <>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <p className="font-cartel text-[2.5rem] font-bold leading-none">
            {nombreTrafo(trafo)}
            {trafo.provisorio && <MarcaTemporal className="ml-3" />}
          </p>
          <p className="mt-2 text-lg">
            {empresa} · {resumenChapa(trafo)}
            {trafo.baja && (
              <>
                {" · "}
                <strong className="font-semibold">Dado de baja el {formatearFecha(trafo.baja)}</strong>
              </>
            )}
          </p>
        </div>
        {!trafo.baja && (
          <div className="flex flex-col items-center gap-1.5">
            <Link href={`/panel/registrar?trafo=${trafo.id}`} className="placa">
              + Nueva O.T.
            </Link>
            <span className="text-[0.9375rem] text-grafito">(OT) Orden de Trabajo</span>
          </div>
        )}
      </div>
      {abiertas.length > 0 && (
        <p className="mt-4 max-w-[64ch] font-medium">
          {abiertas.length === 1 ? "Tiene una O.T. que todavía no se entregó" : `Tiene ${abiertas.length} O.T. que todavía no se entregaron`}: antes
          de crear otra, revise que no sea el mismo ingreso.
        </p>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-10 lg:col-span-8">
          <section aria-labelledby="ordenes-trafo" className="marco">
            <TornillosMarco />
            <div className="marco-cabecera">
              <h2 id="ordenes-trafo" className="rotulo text-base">
                Sus órdenes de trabajo
              </h2>
              <span className="rotulo text-base">{ordenes.length}</span>
            </div>
            {ordenes.length ? (
              <>
                <p className="marco-cuerpo pb-2 text-[0.9375rem]">
                  {ordenes.length === 1 ? "Pasó una vez por el taller." : `Pasó ${ordenes.length} veces por el taller.`} De la más nueva a la más
                  vieja.
                </p>
                <ListaOrdenes ordenes={ordenes} />
              </>
            ) : (
              <p className="marco-cuerpo">Todavía no tiene órdenes de trabajo.</p>
            )}
          </section>

          {numerosT.length > 0 && (
            <section aria-labelledby="historial-t" className="marco">
              <TornillosMarco />
              <div className="marco-cabecera">
                <h2 id="historial-t" className="rotulo text-base">
                  Trazabilidad del N.º T
                </h2>
              </div>
              <p className="marco-cuerpo pb-2 text-[0.9375rem]">
                El N.º T lo pone el cliente y puede pasar de un transformador a otro. Por cada número que tuvo este, los transformadores de{" "}
                {empresa} que lo tuvieron y las O.T. con las que ingresaron con él.
              </p>
              {numerosT.map((numero) => (
                <HistorialNumeroT key={numero} api={api} trafo={trafo} numero={numero} />
              ))}
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-10 lg:col-span-4">
          <Datos trafo={trafo} empresa={empresa} anteriores={anteriores} />
          <Baja trafo={trafo} api={api} />
        </aside>
      </div>
    </>
  );
}

/**
 * Un N.º T que tuvo el transformador: quién lo tiene hoy, quiénes lo tuvieron antes y con qué O.T.
 * ingresaron con él. Así se sigue el número cuando el cliente se lo cambia o se lo pasa a otro.
 */
function HistorialNumeroT({ api, trafo, numero }: { api: ApiPanel; trafo: Transformador; numero: string }) {
  const pasos = historialNumeroT(api.taller, trafo.empresa, numero);
  const esElDeHoy = trafo.numeroT === numero;
  return (
    <div className="border-t-2 border-acero px-[var(--marco-px)] pb-4 pt-4">
      <h3 className="font-cartel text-[1.375rem] font-bold leading-tight">
        {numero} <span className="rotulo align-middle text-[0.8125rem] text-grafito">{esElDeHoy ? "El que tiene hoy" : "Lo tuvo antes"}</span>
      </h3>
      <ul className="mt-2">
        {pasos.map(({ trafo: t, loTiene, hasta, ordenes }) => {
          let situacion: string;
          const ya = hasta ? `Lo tuvo hasta el ${formatearFecha(hasta)}` : "Ya no lo tiene";
          if (loTiene) situacion = t.baja ? `Lo tenía al darse de baja, el ${formatearFecha(t.baja)}` : "Lo tiene hoy";
          else if (t.baja) situacion = `${ya} · dado de baja el ${formatearFecha(t.baja)}`;
          else situacion = t.numeroT ? `${ya}; hoy tiene el ${t.numeroT}` : `${ya}; hoy no tiene N.º T`;
          return (
            <li key={t.id} className="border-t border-acero py-3 first:border-t-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                {t.id === trafo.id ? (
                  <span className="font-semibold">
                    Trafo {t.numero} <span className="etiqueta ml-1">Este</span>
                  </span>
                ) : (
                  <Link href={`/panel/transformador?id=${t.id}`} className={enlace}>
                    Trafo {t.numero}
                  </Link>
                )}
                <span className={`text-[0.9375rem] ${loTiene && !t.baja ? "font-semibold" : "text-grafito"}`}>{situacion}</span>
              </div>
              <p className="mt-1 text-[0.9375rem] leading-snug">
                {ordenes.length === 0 ? (
                  <span className="text-grafito">Todavía no ingresó al taller con este número.</span>
                ) : (
                  <>
                    Ingresó con él:{" "}
                    {ordenes.map((o, i) => (
                      <span key={o.codigo}>
                        {i > 0 && ", "}
                        <Link href={`/panel/equipo?codigo=${o.codigo}`} className="underline decoration-acero underline-offset-4 hover:decoration-naranja">
                          {nombreOrden(o)}
                        </Link>
                        {o.etapas.ingresado && ` (${formatearFecha(o.etapas.ingresado)})`}
                      </span>
                    ))}
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Datos({ trafo, empresa, anteriores }: { trafo: Transformador; empresa: string; anteriores: string[] }) {
  const placa = trafo.placa;
  const filas: [string, string | undefined][] = [
    ["N.º de trafo (de fábrica)", trafo.provisorio ? `${trafo.numero} (temporal)` : trafo.numero],
    ["N.º T", trafo.numeroT],
    ...(anteriores.length ? [["N.º T que tuvo antes", anteriores.join(", ")] as [string, string]] : []),
    ["Cliente", empresa],
    ["Uso", trafo.uso ? NOMBRE_USOS[trafo.uso] : undefined],
    ["Fabricante", placa?.fabricante],
    ["Fases", placa?.fases ? NOMBRE_FASES[placa.fases] : undefined],
    ["Potencia", placa?.potencia ? `${formatearNumero(placa.potencia)} kVA` : undefined],
    [
      "Tensiones",
      placa?.tensionPrimaria && placa.tensionSecundaria ? `${formatearNumero(placa.tensionPrimaria)} / ${formatearNumero(placa.tensionSecundaria)} V` : undefined,
    ],
    ["Año de fabricación", placa?.anio ? String(placa.anio) : undefined],
  ];
  return (
    <section aria-labelledby="datos-trafo" className="marco">
      <TornillosMarco />
      <div className="marco-cabecera">
        <h2 id="datos-trafo" className="rotulo text-base">
          Datos y chapa
        </h2>
      </div>
      <dl className="marco-cuerpo flex flex-col gap-3">
        {filas.map(([nombre, valor]) => (
          <div key={nombre}>
            <dt className="rotulo text-[0.8125rem] text-grafito">{nombre}</dt>
            <dd className={`mt-0.5 ${valor ? "" : "text-grafito"}`}>{valor ?? "Sin cargar"}</dd>
          </div>
        ))}
      </dl>
      {!trafo.baja && (
        <div className="marco-pie px-[var(--marco-px)] py-4">
          <Link href={`/panel/transformador/editar?id=${trafo.id}`} className="placa-secundaria">
            Editar datos y chapa
          </Link>
        </div>
      )}
    </section>
  );
}

/** Dar de baja el transformador (se destruyó o el cliente ya no lo tiene), o reactivarlo. Los dos roles del personal. */
function Baja({ trafo, api }: { trafo: Transformador; api: ApiPanel }) {
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!api.puede("baja-transformadores")) return null;

  if (trafo.baja) {
    return (
      <section className="border-t-[3px] border-acero pt-5">
        <h2 className="rotulo text-base">Dado de baja</h2>
        <p className="mt-2 text-[0.9375rem]">Desde el {formatearFecha(trafo.baja)}. Sus O.T. quedan en el historial.</p>
        <button type="button" onClick={() => api.reactivar("transformador", trafo.id, nombreTrafo(trafo))} className="placa-secundaria mt-4">
          Reactivar
        </button>
      </section>
    );
  }

  async function confirmar() {
    setGuardando(true);
    setError(null);
    try {
      await api.acciones.darDeBaja("transformador", trafo.id);
      setConfirmando(false);
      setGuardando(false);
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby="baja-trafo" className="border-t-[3px] border-acero pt-5">
      <h2 id="baja-trafo" className="rotulo text-base">
        Dar de baja
      </h2>
      <p className="mt-2 text-[0.9375rem]">
        Si se destruyó o el cliente ya no lo tiene. Sus O.T. quedan en el historial{trafo.numeroT ? " y el N.º T queda libre para otro transformador" : ""}.
      </p>
      <button type="button" onClick={() => setConfirmando(true)} className="placa-secundaria mt-4">
        Dar de baja
      </button>
      <Dialogo abierto={confirmando} titulo="Dar de baja el transformador" onCerrar={() => setConfirmando(false)}>
        <div className="flex flex-col gap-5">
          <p className="max-w-[56ch]">
            ¿Dar de baja el transformador <strong className="font-semibold">{nombreTrafo(trafo)}</strong>? No se le pueden crear O.T. nuevas.
            Se puede reactivar.
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

/** Corregir los datos y la chapa de un transformador. Al guardar, vuelve a su ficha. */
export function PanelEditarTransformador() {
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  return (
    <PaginaPanel seccion="transformadores" titulo="Datos del transformador">
      {(api) => {
        const trafo = api.taller.transformadores.find((t) => t.id === id);
        if (!trafo) return <NoEncontrado />;
        return (
          <>
            <p className="mt-4 text-lg">
              <Link href={`/panel/transformador?id=${trafo.id}`} className={enlace}>
                {nombreTrafo(trafo)}
              </Link>{" "}
              · {api.taller.empresas.find((e) => e.id === trafo.empresa)?.nombre ?? "Sin cliente"}. Lo que cambie acá se ve en todas sus O.T.
            </p>
            <FormularioTransformador
              taller={api.taller}
              acciones={api.acciones}
              trafo={trafo}
              puedeDarDeBaja={api.puede("baja-transformadores")}
              onGuardado={() => {
                dejarAviso(`Se guardaron los datos del transformador ${nombreTrafo(trafo)}.`);
                router.push(`/panel/transformador?id=${trafo.id}`);
              }}
            />
          </>
        );
      }}
    </PaginaPanel>
  );
}

/** Dar de alta un transformador sin O.T. Al guardar, va a su ficha, desde donde se crea su O.T. cuando llega. */
export function PanelNuevoTransformador() {
  const router = useRouter();
  return (
    <PaginaPanel seccion="transformadores" titulo="Nuevo transformador">
      {(api) => (
        <>
          <p className="mt-4 max-w-[62ch] text-lg">
            Para cargar un transformador del cliente con los datos de su chapa. Si llegó al taller, mejor cree su O.T. con «Nueva O.T.»: el
            transformador se da de alta con ella.
          </p>
          <FormularioTransformador
            taller={api.taller}
            acciones={api.acciones}
            crearEmpresas={api.puede("empresas")}
            puedeDarDeBaja={api.puede("baja-transformadores")}
            onGuardado={(trafo) => {
              dejarAviso(`Se dio de alta el transformador ${nombreTrafo(trafo)}.`);
              router.push(`/panel/transformador?id=${trafo.id}`);
            }}
          />
        </>
      )}
    </PaginaPanel>
  );
}
