"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
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
import { MensajeCampo, mensajeDeError } from "../Dialogo";
import { CampoTexto, Grupo, Pastillas } from "../equipo/campos";
import { leerValoresInforme, valoresDeInforme, type ErroresInforme, type ValoresInforme } from "../informe/valores";
import { Cotizacion, FilaFecha, guardarFechas, PiePaso, UltimoGuardado, useFechasPaso, useSucio, type PropsPaso } from "./piezas";

const COLUMNAS_RELACION = "md:grid-cols-[6rem_repeat(3,minmax(0,6rem))_minmax(0,1fr)]";

/** Enlace secundario de cada fila: en grafito, para que once filas iguales no pesen más que los datos. */
const enlace =
  "cursor-pointer text-[0.9375rem] font-semibold text-grafito underline decoration-naranja decoration-2 underline-offset-4 hover:text-tinta";

const ETAPAS = ["diagnostico"] as const;

/**
 * El paso 3: desde cuándo está en diagnóstico (lo ve la empresa) y el informe, en el orden de la planilla del
 * taller: inspección visual (cada ítem OK, Regular o Mal y, si no está bien, qué hacer), resistencia de
 * aislamiento y relación de transformación. Lo que hay que reparar o cambiar queda resumido para quien
 * cotiza. El informe lo ve solo el personal y se puede guardar a medias.
 */
export function PasoDiagnostico({
  api,
  equipo,
  guardado,
  onGuardado,
  onSeguir,
  onSucio,
}: PropsPaso & {
  guardado: InformeGuardado | null;
  onGuardado: (informe: InformeGuardado) => void;
}) {
  const id = useId();
  const fechas = useFechasPaso(equipo, ETAPAS);
  const [base, setBase] = useState(() => valoresDeInforme(guardado));
  const [valores, setValores] = useState<ValoresInforme>(base);
  const [ultimo, setUltimo] = useState(guardado ? { actualizado: guardado.actualizado, por: guardado.por } : null);
  const [errores, setErrores] = useState<ErroresInforme>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [intento, setIntento] = useState(0);
  const [conComentario, setConComentario] = useState<Set<IdItem>>(new Set());
  const formulario = useRef<HTMLFormElement>(null);

  const informeSucio = JSON.stringify(valores) !== JSON.stringify(base);
  useSucio(informeSucio || fechas.sucias, onSucio);

  useEffect(() => {
    if (!intento) return;
    const primero = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    primero?.focus({ preventScroll: true });
    primero?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [intento]);

  const actualizar = (cambio: (v: ValoresInforme) => ValoresInforme, clave?: string) => {
    setValores(cambio);
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
  const revisados = ITEMS_INSPECCION.length - sinRevisar.length;

  function marcarOk() {
    actualizar((v) => ({
      ...v,
      inspeccion: Object.fromEntries(
        Object.entries(v.inspeccion).map(([item, valor]) => [item, valor.estado ? valor : { ...valor, estado: "ok" }]),
      ) as ValoresInforme["inspeccion"],
    }));
  }

  /** Revisa y guarda lo escrito. Devuelve lo guardado, o `null` si hubo errores. */
  async function guardarValores(seguir: boolean) {
    const { informe, errores: encontrados } = leerValoresInforme(valores);
    const fechasBien = fechas.revisar();
    setErrores(encontrados);
    setError(null);
    if (Object.keys(encontrados).length || !fechasBien) {
      setIntento((n) => n + 1);
      return null;
    }
    setGuardando(true);
    try {
      await api.acciones.guardarInforme(equipo.codigo, informe);
      await guardarFechas(api, equipo, fechas, { seguir, principal: "diagnostico" });
      const nuevo = { actualizado: new Date(), por: api.email };
      setBase(valores);
      setUltimo(nuevo);
      onGuardado({ ...informe, ...nuevo });
      return { informe, ultimo: nuevo };
    } catch (e) {
      setError(mensajeDeError(e));
      return null;
    } finally {
      setGuardando(false);
    }
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (await guardarValores(true)) onSeguir();
  }

  /** El PDF sale de lo guardado: si hay cambios, primero se guardan. */
  async function descargar() {
    const listo = informeSucio || fechas.sucias ? await guardarValores(false) : { informe: leerValoresInforme(valores).informe, ultimo };
    if (!listo) return;
    setError(null);
    setDescargando(true);
    try {
      const { descargarPdfInforme } = await import("../informe/pdf");
      await descargarPdfInforme({ equipo, empresa: api.empresaDe(equipo), informe: listo.informe, guardado: listo.ultimo });
    } catch {
      setError("No se pudo armar el PDF. Revise su conexión e intente de nuevo.");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <form ref={formulario} onSubmit={enviar} noValidate>
      <div className="px-[var(--marco-px)] pb-7 pt-6">
        <FilaFecha id={id} etapa="diagnostico" etiqueta="Desde el" fechas={fechas} />
      </div>

      <Grupo
        titulo="Inspección visual"
        ayuda={
          <>
            {revisados} de {ITEMS_INSPECCION.length} revisados
          </>
        }
        plano
      >
        {sinRevisar.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-acero px-[var(--marco-px)] py-3.5">
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
                        <button type="button" onClick={() => setConComentario((actuales) => new Set(actuales).add(item.id))} className={enlace}>
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
      </Grupo>

      <Grupo titulo="Resistencia de aislamiento">
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
      </Grupo>

      <Grupo titulo="Relación de transformación" plano>
        <div aria-hidden="true" className={`hidden gap-x-5 border-b border-acero px-[var(--marco-px)] py-2.5 md:grid ${COLUMNAS_RELACION}`}>
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
      </Grupo>

      <div className="border-t-2 border-acero px-[var(--marco-px)] pb-8 pt-7">
        <Cotizacion titulo="Para la cotización" inspeccion={valores.inspeccion} />
      </div>
      <PiePaso
        guardando={guardando}
        onGuardar={() => guardarValores(false)}
        error={error}
        nota="Se puede guardar a medias y completar después."
        antes={
          <>
            <button type="button" onClick={descargar} className="placa-secundaria" disabled={guardando || descargando}>
              {descargando ? "Armando el PDF…" : informeSucio || fechas.sucias ? "Guardar y descargar PDF" : "Descargar PDF"}
            </button>
            <UltimoGuardado ultimo={ultimo} />
          </>
        }
      />
    </form>
  );
}
