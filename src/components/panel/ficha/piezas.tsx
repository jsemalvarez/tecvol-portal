"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Candado, Desplegar, Flecha, Tilde } from "@/components/iconos";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { Senal } from "@/components/senal/Senal";
import { DEFINICIONES, estadoDeEtapas, type EstadoReparacion } from "@/lib/dominio/estados";
import { fechaParaCampo, formatearFecha } from "@/lib/dominio/fechas";
import type { AccionItem, EstadoItem, IdItem } from "@/lib/dominio/informe";
import { paraCotizar } from "@/lib/dominio/informe";
import { erroresDeFechas, etapasConFechas, TITULOS, type ErroresFechas, type NumeroPaso, type SituacionPaso, type ValoresFechas } from "@/lib/dominio/pasos";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { ErrorFormulario, MensajeCampo } from "../Dialogo";
import type { ApiPanel } from "../PaginaPanel";

/** Lo que recibe cada paso de la hoja de una O.T. ya guardada. */
export interface PropsPaso {
  api: ApiPanel;
  equipo: EquipoTaller;
  /** Se guardó y hay que pasar al paso que sigue. */
  onSeguir: () => void;
  /** Hay cambios sin guardar en este paso. */
  onSucio: (sucio: boolean) => void;
}

/** Avisa a la hoja si este paso tiene cambios sin guardar; al desmontarse, ya no los tiene. */
export function useSucio(sucio: boolean, onSucio: (sucio: boolean) => void) {
  useEffect(() => {
    onSucio(sucio);
    return () => onSucio(false);
    // `onSucio` cambia en cada render de la hoja; alcanza con el valor.
  }, [sucio]);
}

/** Lo que el pie de un paso necesita saber del paso en el que está. */
const ContextoPaso = createContext({ sinGuardar: false, soloLectura: false });

const CLASES_NUMERO = {
  completo: "bg-tinta text-blanco",
  salteado: "border-2 border-acero bg-esmalte text-grafito",
  abierto: "bg-naranja text-tinta",
  libre: "border-[3px] border-tinta bg-blanco",
  espera: "border-2 border-dashed border-acero bg-blanco text-grafito",
};

/**
 * Un paso de la hoja: una placa que se despliega tocando su cabecera. Cerrado muestra lo que tiene cargado. Si
 * falta un paso anterior, queda punteado con su tarjeta de bloqueo: al tocarlo dice qué falta y lleva hasta ahí.
 * El contenido no se desmonta al cerrar: lo escrito sin guardar sigue ahí al volver.
 */
export function Paso({
  n,
  situacion,
  abierto,
  texto,
  cargado,
  salteado,
  sinGuardar,
  soloLectura,
  aviso,
  falta,
  faltaCorta,
  irA,
  onAlternar,
  onIr,
  children,
}: {
  n: NumeroPaso;
  situacion: SituacionPaso;
  abierto: boolean;
  texto: string;
  /** `texto` es lo que tiene cargado: va en negro. */
  cargado: boolean;
  /** Quedó atrás sin sus datos: cómo se lo nombra. */
  salteado?: string;
  sinGuardar: boolean;
  /** La O.T. está dada de baja: se ve, pero no se edita. */
  soloLectura: boolean;
  /** Se tocó estando bloqueado: se dice qué falta. */
  aviso: boolean;
  falta: string;
  faltaCorta: string;
  /** Qué dice el botón que lleva al paso que falta. */
  irA: string;
  onAlternar: () => void;
  onIr: () => void;
  children?: ReactNode;
}) {
  const bloqueado = situacion === "bloqueado";
  const cuerpo = abierto && !bloqueado;
  const numero = situacion === "completo" ? "completo" : salteado ? "salteado" : cuerpo ? "abierto" : bloqueado || situacion === "despues" ? "espera" : "libre";
  return (
    <section
      id={`paso-${n}`}
      aria-labelledby={`paso-${n}-titulo`}
      className={`marco scroll-mt-16 overflow-clip [&>.marco-tornillo]:z-20 ${bloqueado ? "border-dashed bg-esmalte shadow-none" : cuerpo ? "border-tinta" : ""}`}
    >
      <TornillosMarco />
      <h2>
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={cuerpo}
          aria-controls={`paso-${n}-cuerpo`}
          className="group flex min-h-[5.5rem] w-full cursor-pointer items-center gap-4 px-[var(--marco-px)] py-4 text-left sm:gap-5"
        >
          <span aria-hidden="true" className={`flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-placa)] font-cartel text-[1.625rem] font-bold leading-none ${CLASES_NUMERO[numero]}`}>
            {situacion === "completo" ? <Tilde className="size-7" /> : salteado ? "–" : bloqueado ? <Candado className="size-6" /> : n}
          </span>
          <span className="min-w-0">
            {situacion === "completo" && <span className="sr-only">Completo. </span>}
            {bloqueado && <span className="sr-only">Bloqueado. </span>}
            <span
              id={`paso-${n}-titulo`}
              className={`block font-cartel text-[1.375rem] font-bold uppercase leading-[1.1] tracking-[0.04em] decoration-naranja decoration-2 underline-offset-4 group-hover:underline sm:text-[1.5625rem] ${bloqueado ? "text-grafito" : ""}`}
            >
              {n} · {TITULOS[n]}
            </span>
            <span className={`mt-0.5 block leading-snug ${cargado ? "text-tinta" : "text-grafito"}`}>
              {/* En el celular no entra la tarjeta de al lado: se dice acá. */}
              {salteado && <span className="font-semibold text-tinta sm:sr-only">{salteado}. </span>}
              {texto}
            </span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-3.5">
            {bloqueado && <span className="tarjeta-bloqueo hidden md:inline-flex">{faltaCorta}</span>}
            {sinGuardar && !cuerpo && <span className="tarjeta-bloqueo">Sin guardar</span>}
            {salteado && !sinGuardar && (
              <span aria-hidden="true" className="tarjeta-bloqueo hidden sm:inline-flex">
                {salteado}
              </span>
            )}
            <Desplegar className={`size-6 transition-transform ${cuerpo ? "rotate-180" : ""}`} />
          </span>
        </button>
      </h2>
      {bloqueado && aviso && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t-2 border-dashed border-acero bg-blanco px-[var(--marco-px)] py-4">
          <Candado className="size-6 shrink-0" />
          <p className="min-w-[14rem] flex-1 text-[1.0625rem] leading-snug">{falta}</p>
          <button type="button" onClick={onIr} className="placa-secundaria">
            {irA}
          </button>
        </div>
      )}
      {/* Un campo que recibe el foco no queda tapado por lo que está fijo arriba y abajo de la pantalla. */}
      <div id={`paso-${n}-cuerpo`} hidden={!cuerpo} className="border-t-2 border-acero [&_:is(input,select,textarea)]:scroll-mb-28 [&_:is(input,select,textarea)]:scroll-mt-16">
        {!bloqueado && (
          <ContextoPaso value={{ sinGuardar, soloLectura }}>
            <fieldset disabled={soloLectura} className="contents">
              {children}
            </fieldset>
          </ContextoPaso>
        )}
      </div>
    </section>
  );
}

/** Dentro de un paso: por el orden del taller va más adelante, pero se puede cargar igual. */
export function VaDespues({ children }: { children: ReactNode }) {
  return (
    <p className="mb-7 rounded-[var(--radius-placa)] bg-durazno px-4 py-3.5 leading-snug">
      <strong className="font-semibold">Va después.</strong> {children}
    </p>
  );
}

const BOTON_BARRA = "max-sm:min-h-12 max-sm:px-3 max-sm:text-base";

/**
 * El final de un paso. Va directo dentro del formulario: la barra con guardar y seguir (siempre) y guardar sin
 * moverse (si `onGuardar`) se queda pegada abajo de la pantalla mientras el paso sigue, para no tener que bajar
 * hasta el final de un formulario largo. `nota` y `antes` van en su lugar, arriba de la barra; `children`, en la
 * barra. Con la O.T. dada de baja no se guarda nada: no hay barra.
 */
export function PiePaso({
  guardando,
  seguir = "Guardar y seguir",
  onGuardar,
  error,
  nota,
  antes,
  children,
}: {
  guardando: boolean;
  seguir?: string;
  onGuardar?: () => void;
  error?: string | null;
  nota?: ReactNode;
  antes?: ReactNode;
  children?: ReactNode;
}) {
  const { sinGuardar, soloLectura } = useContext(ContextoPaso);
  const conNota = nota && !soloLectura;
  return (
    <>
      {(conNota || antes) && (
        <div className="flex flex-col items-start gap-3.5 border-t border-acero px-[var(--marco-px)] py-5">
          {conNota && <p className="text-[0.9375rem] leading-snug text-grafito">{nota}</p>}
          {antes}
        </div>
      )}
      {!soloLectura && (
        <div className="marco-pie sticky bottom-0 z-10 flex flex-col items-start gap-3 bg-blanco px-[var(--marco-px)] py-3 max-sm:px-5">
          <ErrorFormulario texto={error ?? null} />
          <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
            <button type="submit" className={`placa ${BOTON_BARRA}`} disabled={guardando}>
              {guardando ? "Guardando…" : seguir}
              {!guardando && <Flecha className="size-5 max-sm:hidden" />}
            </button>
            {onGuardar && (
              <button type="button" onClick={onGuardar} className={`placa-secundaria ${BOTON_BARRA}`} disabled={guardando}>
                Guardar
              </button>
            )}
            {children}
            {sinGuardar && <span className="tarjeta-bloqueo ml-auto max-sm:hidden">Sin guardar</span>}
          </div>
        </div>
      )}
    </>
  );
}

const hora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });

/** Quién guardó por última vez y cuándo. */
export function UltimoGuardado({ ultimo }: { ultimo: { actualizado: Date | null; por?: string } | null }) {
  return (
    <p className="text-[0.9375rem] leading-snug text-grafito">
      {ultimo?.actualizado ? (
        <>
          Guardado por última vez el {formatearFecha(ultimo.actualizado)} a las {hora.format(ultimo.actualizado)}
          {ultimo.por && <>, por {ultimo.por}</>}.
        </>
      ) : (
        "Todavía no se guardó."
      )}
    </p>
  );
}

/** Las fechas de las etapas que se cargan en un paso: lo escrito, sus errores y cómo guardarlas. */
export function useFechasPaso(equipo: EquipoTaller, etapas: readonly EstadoReparacion[]) {
  const hoy = fechaParaCampo(new Date());
  const guardadas: ValoresFechas = Object.fromEntries(etapas.map((e) => [e, equipo.etapas[e] ? fechaParaCampo(equipo.etapas[e]) : ""]));
  const clave = JSON.stringify(guardadas);
  const [valores, setValores] = useState(guardadas);
  const [errores, setErrores] = useState<ErroresFechas>({});
  // Si cambiaron desde afuera (la ventana "Cambiar estado", deshacer), se muestra lo guardado.
  const [claveAnterior, setClaveAnterior] = useState(clave);
  if (clave !== claveAnterior) {
    setClaveAnterior(clave);
    setValores(guardadas);
    setErrores({});
  }
  const sucias = JSON.stringify(valores) !== clave;

  return {
    hoy,
    valores,
    errores,
    sucias,
    cambiar(etapa: EstadoReparacion, valor: string) {
      setValores((v) => ({ ...v, [etapa]: valor }));
      setErrores((e) => ({ ...e, [etapa]: undefined }));
    },
    /** Revisa las fechas y deja los errores a la vista. */
    revisar() {
      const encontrados = erroresDeFechas(valores, equipo.etapas, hoy);
      setErrores(encontrados);
      return Object.keys(encontrados).length === 0;
    },
    etapasNuevas: () => etapasConFechas(equipo.etapas, valores),
  };
}

export type FechasPaso = ReturnType<typeof useFechasPaso>;

/**
 * Guarda las fechas de un paso, si cambiaron, y avisa qué ve ahora la empresa, con la opción de deshacer.
 * Con `principal`, si se sigue sin la fecha de esa etapa, avisa que para la empresa no cambió nada.
 */
export async function guardarFechas(api: ApiPanel, equipo: EquipoTaller, fechas: FechasPaso, { seguir, principal }: { seguir: boolean; principal?: EstadoReparacion }) {
  const etapas = fechas.etapasNuevas();
  if (!fechas.sucias) {
    const sinFecha = seguir && principal && !etapas[principal];
    api.avisar(sinFecha ? `Se guardó. Sin la fecha, la empresa sigue viendo «${DEFINICIONES[equipo.estado].rotulo}».` : "Se guardó.");
    return;
  }
  const anterior = await api.acciones.guardarEtapas(equipo, etapas);
  const estado = estadoDeEtapas(etapas);
  const texto =
    estado === equipo.estado
      ? "Se guardó."
      : estado === "entregado"
        ? "Se guardó la entrega. La O.T. quedó cerrada."
        : `Se guardó. La empresa ahora ve «${DEFINICIONES[estado].rotulo}».`;
  api.avisar(texto, () => api.acciones.restaurar(anterior));
}

/** Una etapa dentro de su paso: lo que ve la empresa, con su señal, y la fecha desde la que lo ve. */
export function FilaFecha({ id, etapa, etiqueta, fechas }: { id: string; etapa: EstadoReparacion; etiqueta: string; fechas: FechasPaso }) {
  const definicion = DEFINICIONES[etapa];
  const campo = `${id}-${etapa}`;
  const error = fechas.errores[etapa];
  return (
    <div className="flex flex-wrap items-end gap-x-7 gap-y-3.5 rounded-[var(--radius-placa)] border border-acero bg-esmalte px-5 py-4">
      <div className="flex min-w-[14rem] flex-1 items-center gap-3">
        <Senal forma={definicion.forma} pictograma={etapa} simple className="size-11 shrink-0" />
        <div>
          <p className="rotulo text-[0.8125rem] text-grafito">La empresa ve</p>
          <p className="text-[1.125rem] font-semibold leading-snug">{definicion.rotulo}</p>
        </div>
      </div>
      <div className="min-w-0">
        <label htmlFor={campo} className="rotulo block text-[0.9375rem]">
          {etiqueta}
        </label>
        <div className="mt-1 flex items-end gap-3.5">
          <input
            id={campo}
            type="date"
            value={fechas.valores[etapa] ?? ""}
            max={fechas.hoy}
            onChange={(e) => fechas.cambiar(etapa, e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${campo}-error` : undefined}
            className="renglon w-[11.5rem]"
          />
          <button
            type="button"
            onClick={() => fechas.cambiar(etapa, fechas.hoy)}
            className="cursor-pointer pb-2.5 text-[0.9375rem] font-semibold underline decoration-naranja decoration-2 underline-offset-4"
          >
            Hoy<span className="sr-only"> ({etiqueta})</span>
          </button>
        </div>
        <MensajeCampo id={`${campo}-error`} texto={error} />
      </div>
    </div>
  );
}

/** Lo que marcó la inspección, agrupado por lo que hay que hacer: es lo que necesita quien cotiza. */
export function Cotizacion({
  titulo,
  inspeccion,
  className = "",
}: {
  titulo: string;
  inspeccion: Partial<Record<IdItem, { estado?: EstadoItem | ""; accion?: AccionItem | "" }>>;
  className?: string;
}) {
  const { revisados, sinRevisar, grupos } = paraCotizar(inspeccion);
  return (
    <div className={`rounded-[var(--radius-placa)] border-2 border-tinta bg-blanco px-5 py-4 ${className}`}>
      <h3 className="rotulo text-[1.0625rem]">{titulo}</h3>
      {revisados === 0 ? (
        <p className="mt-2">Todavía no se revisó ningún ítem.</p>
      ) : grupos.length === 0 ? (
        <p className="mt-2">Todo lo revisado está OK: nada para reparar ni cambiar.</p>
      ) : (
        <dl className="mt-1">
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="flex flex-wrap gap-x-3.5 gap-y-0.5 border-b border-acero py-2">
              <dt className="rotulo min-w-[10.5rem] text-[0.9375rem]">{grupo.titulo}</dt>
              <dd className="font-semibold leading-snug">{grupo.items.join(" · ")}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-2.5 text-[0.9375rem] text-grafito">
        {sinRevisar > 0 && revisados > 0 && <>{sinRevisar === 1 ? "1 ítem sin revisar. " : `${sinRevisar} ítems sin revisar. `}</>}
        Solo lo ve el personal del taller.
      </p>
    </div>
  );
}
