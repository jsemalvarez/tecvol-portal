"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { formatearFecha } from "@/lib/dominio/fechas";
import {
  ACCIONES_ITEM,
  ESTADOS_ITEM,
  FASES_RELACION,
  ITEMS_INSPECCION,
  MEDICIONES_AISLAMIENTO,
  NOMBRE_ACCION_ITEM,
  NOMBRE_ESTADO_ITEM,
  type IdItem,
  type InformeGuardado,
} from "@/lib/dominio/informe";
import { formatearNumero } from "@/lib/dominio/placa";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { ErrorFormulario, MensajeCampo, mensajeDeError } from "../Dialogo";
import { CampoTexto, Pastillas } from "../equipo/campos";
import { useAvisoAlSalir } from "../equipo/useAvisoAlSalir";
import type { AccionesPanel } from "../usePanel";
import { leerValoresInforme, valoresDeInforme, type ErroresInforme, type ValoresInforme } from "./valores";

const hora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });

const COLUMNAS_RELACION = "md:grid-cols-[8rem_repeat(3,minmax(0,6.5rem))_minmax(0,1fr)]";

/** Enlace secundario de cada fila: en grafito, para que once filas iguales no pesen más que los datos. */
const enlace =
  "cursor-pointer text-[0.9375rem] font-semibold text-grafito underline decoration-naranja decoration-2 underline-offset-4 hover:text-tinta";

/**
 * El informe de diagnóstico, en el orden de la planilla del taller: inspección visual (cada ítem OK,
 * Regular o Mal y, si no está bien, qué hacer), resistencia de aislamiento y relación de transformación.
 * Al costado, lo que hay que reparar o cambiar, que es lo que necesita quien cotiza. Se puede guardar a
 * medias y seguir después: guardar no saca de la página.
 */
export function FormularioInforme({
  equipo,
  acciones,
  email,
  guardado,
}: {
  equipo: EquipoTaller;
  acciones: AccionesPanel;
  /** Quién tiene la sesión abierta: queda como autor al guardar. */
  email: string;
  guardado: InformeGuardado | null;
}) {
  const id = useId();
  const [base, setBase] = useState(() => valoresDeInforme(guardado));
  const [valores, setValores] = useState<ValoresInforme>(base);
  const [ultimo, setUltimo] = useState(guardado ? { actualizado: guardado.actualizado, por: guardado.por } : null);
  const [errores, setErrores] = useState<ErroresInforme>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [recienGuardado, setRecienGuardado] = useState(false);
  const [intento, setIntento] = useState(0);
  const [conComentario, setConComentario] = useState<Set<IdItem>>(new Set());
  const formulario = useRef<HTMLFormElement>(null);

  const sucio = useMemo(() => JSON.stringify(valores) !== JSON.stringify(base), [valores, base]);
  useAvisoAlSalir(sucio && !guardando);

  useEffect(() => {
    if (!intento) return;
    const primero = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    primero?.focus({ preventScroll: true });
    primero?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [intento]);

  const actualizar = (cambio: (v: ValoresInforme) => ValoresInforme, clave?: string) => {
    setValores(cambio);
    setRecienGuardado(false);
    if (clave && errores[clave]) {
      setErrores((actuales) => {
        const resto = { ...actuales };
        delete resto[clave];
        return resto;
      });
    }
  };

  const cambiarItem = (item: IdItem, cambio: Partial<ValoresInforme["inspeccion"][IdItem]>) =>
    actualizar((v) => ({ ...v, inspeccion: { ...v.inspeccion, [item]: { ...v.inspeccion[item], ...cambio } } }));

  const cambiarAislamiento = (campo: keyof ValoresInforme["aislamiento"]) => (texto: string) =>
    actualizar((v) => ({ ...v, aislamiento: { ...v.aislamiento, [campo]: texto } }), `aislamiento.${campo}`);

  const cambiarRelacion = (i: number, campo: keyof ValoresInforme["relacion"][number]) => (texto: string) =>
    actualizar((v) => ({ ...v, relacion: v.relacion.map((p, j) => (j === i ? { ...p, [campo]: texto } : p)) }), `relacion.${i}.${campo}`);

  const sinRevisar = ITEMS_INSPECCION.filter((item) => !valores.inspeccion[item.id].estado);

  function marcarOk() {
    actualizar((v) => ({
      ...v,
      inspeccion: Object.fromEntries(
        Object.entries(v.inspeccion).map(([item, valor]) => [item, valor.estado ? valor : { ...valor, estado: "ok" }]),
      ) as ValoresInforme["inspeccion"],
    }));
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const { informe, errores: encontrados } = leerValoresInforme(valores);
    setErrores(encontrados);
    setError(null);
    setRecienGuardado(false);
    if (Object.keys(encontrados).length) {
      setIntento((n) => n + 1);
      return;
    }
    setGuardando(true);
    try {
      await acciones.guardarInforme(equipo.codigo, informe);
      setBase(valores);
      setUltimo({ actualizado: new Date(), por: email });
      setRecienGuardado(true);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  // Lo que sirve para cotizar: los ítems que no están bien, agrupados por lo que hay que hacer.
  const revisados = ITEMS_INSPECCION.length - sinRevisar.length;
  const conProblema = ITEMS_INSPECCION.filter((item) => ["regular", "mal"].includes(valores.inspeccion[item.id].estado));
  const grupos = [
    { titulo: "Cambiar", items: conProblema.filter((item) => valores.inspeccion[item.id].accion === "cambiar") },
    { titulo: "Reparar", items: conProblema.filter((item) => valores.inspeccion[item.id].accion === "reparar") },
    { titulo: "Sin acción indicada", items: conProblema.filter((item) => !valores.inspeccion[item.id].accion) },
  ].filter((g) => g.items.length);

  return (
    <form ref={formulario} onSubmit={guardar} noValidate className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="flex flex-col gap-10 lg:col-span-8">
        <section aria-labelledby={`${id}-inspeccion`} className="marco">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 id={`${id}-inspeccion`} className="rotulo text-base">
              Inspección visual
            </h2>
            <span className="rotulo text-base">
              {revisados} de {ITEMS_INSPECCION.length}
            </span>
          </div>
          {sinRevisar.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-acero bg-esmalte px-[var(--marco-px)] py-3.5">
              <button type="button" onClick={marcarOk} className="placa-secundaria">
                {sinRevisar.length === ITEMS_INSPECCION.length
                  ? "Marcar todo OK"
                  : sinRevisar.length === 1
                    ? "Marcar el que falta como OK"
                    : `Marcar los ${sinRevisar.length} que faltan como OK`}
              </button>
              <p className="text-[0.9375rem] leading-snug text-grafito">Después cambie solo lo que no esté bien.</p>
            </div>
          )}
          <ul>
            {ITEMS_INSPECCION.map((item) => {
              const valor = valores.inspeccion[item.id];
              const problema = valor.estado === "regular" || valor.estado === "mal";
              const verComentario = problema || !!valor.comentario || conComentario.has(item.id);
              const comentarioId = `${id}-${item.id}-comentario`;
              return (
                <li key={item.id} className="marco-fila px-[var(--marco-px)] py-4">
                  <div className="grid items-center gap-x-5 gap-y-3 md:grid-cols-[9rem_auto_minmax(0,1fr)]">
                    <p className="font-semibold leading-snug">{item.nombre}</p>
                    <Pastillas
                      nombre={`${id}-${item.id}-estado`}
                      etiqueta={`Estado de ${item.nombre}`}
                      opciones={ESTADOS_ITEM.map((e) => ({ valor: e, etiqueta: NOMBRE_ESTADO_ITEM[e] }))}
                      valor={valor.estado}
                      onCambio={(estado) => cambiarItem(item.id, { estado })}
                    />
                    <div className="flex min-h-10 items-center">
                      {problema && item.conAccion ? (
                        <Pastillas
                          nombre={`${id}-${item.id}-accion`}
                          etiqueta={`Qué hacer con ${item.nombre}`}
                          opciones={ACCIONES_ITEM.map((a) => ({ valor: a, etiqueta: NOMBRE_ACCION_ITEM[a] }))}
                          valor={valor.accion}
                          onCambio={(accion) => cambiarItem(item.id, { accion })}
                        />
                      ) : (
                        !verComentario && (
                          <button
                            type="button"
                            onClick={() => setConComentario((actuales) => new Set(actuales).add(item.id))}
                            className={enlace}
                          >
                            Agregar comentario<span className="sr-only"> sobre {item.nombre}</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  {verComentario && (
                    <div className="mt-3 flex items-end gap-3 md:ml-[calc(9rem+1.25rem)]">
                      <label htmlFor={comentarioId} className="rotulo shrink-0 pb-2.5 text-[0.8125rem]">
                        Comentario<span className="sr-only"> sobre {item.nombre}</span>
                      </label>
                      <input
                        id={comentarioId}
                        value={valor.comentario}
                        onChange={(e) => cambiarItem(item.id, { comentario: e.target.value })}
                        maxLength={300}
                        className="renglon text-base"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby={`${id}-aislamiento`} className="marco">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 id={`${id}-aislamiento`} className="rotulo text-base">
              Resistencia de aislamiento
            </h2>
          </div>
          <div className="marco-cuerpo">
            <div className="grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-4">
              {MEDICIONES_AISLAMIENTO.map((medicion) => (
                <CampoTexto
                  key={medicion.id}
                  id={`${id}-aislamiento-${medicion.id}`}
                  etiqueta={medicion.nombre}
                  unidad="MΩ"
                  numerico
                  maxLength={12}
                  ancho="max-w-[9rem]"
                  valor={valores.aislamiento[medicion.id]}
                  onCambio={cambiarAislamiento(medicion.id)}
                  error={errores[`aislamiento.${medicion.id}`]}
                />
              ))}
              <CampoTexto
                id={`${id}-aislamiento-indice`}
                etiqueta="Índice de absorción"
                numerico
                maxLength={8}
                ancho="max-w-[7rem]"
                valor={valores.aislamiento.indiceAbsorcion}
                onCambio={cambiarAislamiento("indiceAbsorcion")}
                error={errores["aislamiento.indiceAbsorcion"]}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby={`${id}-relacion`} className="marco">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 id={`${id}-relacion`} className="rotulo text-base">
              Relación de transformación
            </h2>
          </div>
          <div
            aria-hidden="true"
            className={`hidden gap-x-5 border-b border-acero bg-esmalte px-[var(--marco-px)] py-2.5 md:grid ${COLUMNAS_RELACION}`}
          >
            {["Punto", "U", "V", "W", "Comentario"].map((titulo) => (
              <span key={titulo} className="rotulo text-[0.8125rem]">
                {titulo}
              </span>
            ))}
          </div>
          <ol>
            {valores.relacion.map((punto, i) => {
              const tension = equipo.placa?.conmutador?.[i];
              return (
                <li key={i} className={`marco-fila grid grid-cols-3 items-start gap-x-5 gap-y-3 px-[var(--marco-px)] py-4 ${COLUMNAS_RELACION}`}>
                  <div className="col-span-3 md:col-span-1">
                    <p className="font-semibold leading-snug">Punto {i + 1}</p>
                    {tension && <p className="text-[0.9375rem] leading-snug text-grafito">{formatearNumero(tension, 0)} V en la chapa</p>}
                  </div>
                  {FASES_RELACION.map((fase) => {
                    const campo = `${id}-relacion-${i}-${fase}`;
                    const clave = `relacion.${i}.${fase}`;
                    return (
                      <div key={fase}>
                        <label htmlFor={campo} className="rotulo block text-[0.8125rem] md:sr-only">
                          {fase.toUpperCase()}
                          <span className="sr-only"> del punto {i + 1}</span>
                        </label>
                        <input
                          id={campo}
                          value={punto[fase]}
                          onChange={(e) => cambiarRelacion(i, fase)(e.target.value)}
                          inputMode="decimal"
                          autoComplete="off"
                          maxLength={12}
                          aria-invalid={errores[clave] ? true : undefined}
                          aria-describedby={errores[clave] ? `${campo}-error` : undefined}
                          className="renglon"
                        />
                        {/* La celda es angosta: el error se dice corto. */}
                        <MensajeCampo id={`${campo}-error`} texto={errores[clave] && "Solo el número."} />
                      </div>
                    );
                  })}
                  <div className="col-span-3 md:col-span-1">
                    <label htmlFor={`${id}-relacion-${i}-comentario`} className="rotulo block text-[0.8125rem] md:sr-only">
                      Comentario<span className="sr-only"> del punto {i + 1}</span>
                    </label>
                    <input
                      id={`${id}-relacion-${i}-comentario`}
                      value={punto.comentario}
                      onChange={(e) => cambiarRelacion(i, "comentario")(e.target.value)}
                      maxLength={200}
                      className="renglon"
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <aside aria-labelledby={`${id}-cotizacion`} className="border-t-[3px] border-acero pt-5 lg:sticky lg:top-8 lg:col-span-4 lg:self-start">
        <h2 id={`${id}-cotizacion`} className="rotulo text-base">
          Para la cotización
        </h2>
        {revisados === 0 ? (
          <p className="mt-3">Todavía no se revisó ningún ítem.</p>
        ) : grupos.length === 0 ? (
          <p className="mt-3">
            Todo lo revisado está OK{sinRevisar.length > 0 && <> ({sinRevisar.length} sin revisar)</>}.
          </p>
        ) : (
          <dl className="mt-3">
            {grupos.map((grupo) => (
              <div key={grupo.titulo} className="border-b border-acero py-2.5 first:pt-0">
                <dt className="rotulo text-[0.9375rem]">{grupo.titulo}</dt>
                <dd className="mt-0.5 leading-snug">
                  {grupo.items
                    .map((item) => (grupo.titulo === "Sin acción indicada" ? `${item.nombre} (${NOMBRE_ESTADO_ITEM[valores.inspeccion[item.id].estado as "regular" | "mal"]})` : item.nombre))
                    .join(" · ")}
                </dd>
              </div>
            ))}
            {sinRevisar.length > 0 && <p className="pt-2.5 text-[0.9375rem] text-grafito">{sinRevisar.length === 1 ? "1 ítem sin revisar." : `${sinRevisar.length} ítems sin revisar.`}</p>}
          </dl>
        )}
        <p className="mt-5 max-w-[44ch] text-[0.9375rem] leading-snug text-grafito">
          Solo lo ve el personal del taller: el cliente no lo ve en su portal. Se puede guardar a medias y completar después.
        </p>

        <div className="mt-6 flex flex-col items-start gap-4 border-t border-acero pt-6">
          <ErrorFormulario texto={error} />
          <button type="submit" className="placa" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar informe"}
          </button>
          <p role="status" className="text-[0.9375rem] leading-snug">
            {recienGuardado ? (
              <strong className="font-semibold">Se guardó el informe.</strong>
            ) : ultimo?.actualizado ? (
              <span className="text-grafito">
                Guardado por última vez el {formatearFecha(ultimo.actualizado)} a las {hora.format(ultimo.actualizado)}
                {ultimo.por && <>, por {ultimo.por}</>}.
              </span>
            ) : (
              <span className="text-grafito">Todavía no se guardó.</span>
            )}
          </p>
        </div>
      </aside>
    </form>
  );
}
