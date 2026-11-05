"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { formatearNumero, intensidadNominal } from "@/lib/dominio/placa";
import {
  calcularProtocolo,
  celdasIniciales,
  conNumeracion,
  leerValores,
  posicionesDeChapa,
  valoresConPosiciones,
  valoresDeCeldas,
  valoresEnUso,
  type Celda,
  type Posiciones,
  type ProtocoloGuardado,
  type ValoresProtocolo,
} from "@/lib/dominio/protocolo";
import { mensajeDeError } from "../Dialogo";
import { Opciones } from "../equipo/campos";
import { FilaFecha, guardarFechas, PiePaso, UltimoGuardado, useFechasPaso, useSucio, type PropsPaso } from "./piezas";
import { PlanillaProtocolo } from "./PlanillaProtocolo";

const ETAPAS = ["ensayos"] as const;

/** Qué le da la chapa a las intensidades nominales: el Excel las pide escritas, y las cuentas usan lo que se escriba. */
function IntensidadesDeChapa({ equipo }: Pick<PropsPaso, "equipo">) {
  const { potencia, tensionPrimaria, tensionSecundaria, fases } = equipo.placa ?? {};
  if (!potencia || !tensionPrimaria) return null;
  const amperes = (tension: number) => `${formatearNumero(intensidadNominal(potencia, tension, fases), 2)} A`;
  return (
    <>
      {" "}
      Según la chapa, la intensidad nominal es {amperes(tensionPrimaria)} en el primario
      {tensionSecundaria ? ` y ${amperes(tensionSecundaria)} en el secundario` : ""}.
    </>
  );
}

/**
 * El paso 6: desde cuándo está en ensayos (lo ve la empresa) y el protocolo de ensayo eléctrico, que es el Excel del
 * taller: las mismas celdas para completar y las mismas cuentas. Se puede guardar a medias; lo ve solo el personal,
 * hasta que se suba el PDF a los archivos de la orden.
 */
export function PasoEnsayos({
  api,
  equipo,
  guardado,
  vaDespues,
  onGuardado,
  onSeguir,
  onSucio,
}: PropsPaso & {
  guardado: ProtocoloGuardado | null;
  vaDespues?: ReactNode;
  onGuardado: (protocolo: ProtocoloGuardado) => void;
}) {
  const id = useId();
  const fechas = useFechasPaso(equipo, ETAPAS);
  const [posiciones, setPosiciones] = useState<Posiciones>(guardado?.posiciones ?? posicionesDeChapa(equipo.placa));
  const [base, setBase] = useState(() => ({
    posiciones,
    valores: valoresDeCeldas(guardado ? conNumeracion(guardado.celdas, guardado.posiciones) : celdasIniciales(equipo, api.empresaDe(equipo))),
  }));
  const [valores, setValores] = useState<ValoresProtocolo>(base.valores);
  const [ultimo, setUltimo] = useState(guardado ? { actualizado: guardado.actualizado, por: guardado.por } : null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const planilla = useRef<HTMLDivElement>(null);

  const { celdas, invalidas } = leerValores(valores, posiciones);
  const calculo = calcularProtocolo(celdas, posiciones);
  const sinGuardar = posiciones !== base.posiciones || JSON.stringify(valoresEnUso(valores, posiciones)) !== JSON.stringify(valoresEnUso(base.valores, base.posiciones));
  useSucio(sinGuardar || fechas.sucias, onSucio);

  function cambiar(celda: Celda, texto: string) {
    setValores((v) => ({ ...v, [celda]: texto }));
    setError(null);
  }

  function cambiarPosiciones(nuevas: Posiciones) {
    setPosiciones(nuevas);
    setValores((v) => valoresConPosiciones(v, nuevas));
    setError(null);
  }

  /** Revisa y guarda lo escrito. Devuelve las celdas guardadas, o `null` si hubo errores. */
  async function guardarValores(seguir: boolean) {
    const fechasBien = fechas.revisar();
    setError(null);
    if (invalidas.length) {
      setError("Hay celdas en rojo que no se entienden. Escriba solo el número, sin la unidad.");
      const primera = planilla.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      primera?.focus({ preventScroll: true });
      primera?.scrollIntoView({ block: "center", behavior: "smooth" });
      return null;
    }
    if (!fechasBien) return null;
    setGuardando(true);
    try {
      await api.acciones.guardarProtocolo(equipo.codigo, celdas, posiciones);
      await guardarFechas(api, equipo, fechas, { seguir, principal: "ensayos" });
      const nuevo = { actualizado: new Date(), por: api.email };
      setBase({ posiciones, valores });
      setUltimo(nuevo);
      onGuardado({ celdas, posiciones, ...nuevo });
      return celdas;
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
    const listas = sinGuardar || fechas.sucias ? await guardarValores(false) : celdas;
    if (!listas) return;
    setError(null);
    setDescargando(true);
    try {
      const { descargarPdfProtocolo } = await import("../protocolo/pdf");
      await descargarPdfProtocolo({ codigo: equipo.codigo, celdas: listas, posiciones });
    } catch {
      setError("No se pudo armar el PDF. Revise su conexión e intente de nuevo.");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <div className="px-[var(--marco-px)] pb-7 pt-6">
        {vaDespues}
        <FilaFecha id={id} etapa="ensayos" etiqueta="Desde el" fechas={fechas} />
      </div>

      <section aria-labelledby={`${id}-protocolo`} className="border-t-2 border-acero">
        <div className="bg-esmalte px-[var(--marco-px)] py-4">
          <h3 id={`${id}-protocolo`} className="font-cartel text-[1.375rem] font-bold uppercase leading-tight tracking-[0.04em]">
            Protocolo de ensayo eléctrico
          </h3>
          <p className="mt-1 max-w-[70ch] text-[0.9375rem] leading-snug text-grafito">
            Complete las celdas con línea; las grises se calculan solas, con las mismas cuentas del Excel. Viene cargado lo de la chapa y lo habitual de
            la planilla (los K, los tiempos, las firmas): revíselo.
            <IntensidadesDeChapa equipo={equipo} />
          </p>
        </div>
        <div className="px-[var(--marco-px)] pt-5">
          <Opciones<`${Posiciones}`>
            id={`${id}-posiciones`}
            leyenda="Conmutador"
            opciones={[
              { valor: "5", etiqueta: "5 posiciones" },
              { valor: "3", etiqueta: "3 posiciones" },
            ]}
            valor={`${posiciones}`}
            onCambio={(v) => cambiarPosiciones(Number(v) as Posiciones)}
          />
          {posiciones === 3 && (
            <p className="mt-3 max-w-[70ch] text-[0.9375rem] leading-snug text-grafito">
              Las columnas 2 y 4 no se usan. Las tensiones de los extremos se calculan con ±5 %, como en la planilla de 3 posiciones.
            </p>
          )}
        </div>
        {/* Hasta 1280 px la columna es angosta: la planilla aprovecha todo el ancho de la placa. */}
        <div ref={planilla} className="px-3 pb-7 pt-5 xl:px-[var(--marco-px)]">
          <PlanillaProtocolo valores={valores} calculo={calculo} posiciones={posiciones} invalidas={new Set(invalidas)} onCambio={cambiar} />
        </div>
      </section>

      <PiePaso
        guardando={guardando}
        onGuardar={() => guardarValores(false)}
        error={error}
        nota="Se puede guardar a medias y completar después. Para que la empresa lo vea, descargue el PDF y súbalo en «Archivos para la empresa»."
        antes={
          <>
            <button type="button" onClick={descargar} className="placa-secundaria" disabled={guardando || descargando}>
              {descargando ? "Armando el PDF…" : sinGuardar || fechas.sucias ? "Guardar y descargar PDF" : "Descargar PDF"}
            </button>
            <UltimoGuardado ultimo={ultimo} />
          </>
        }
      />
    </form>
  );
}
