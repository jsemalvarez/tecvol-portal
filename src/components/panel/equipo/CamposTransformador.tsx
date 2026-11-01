"use client";

import { useMemo, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import {
  conmutadorSugerido,
  FASES,
  formatearKV,
  formatearNumero,
  intensidadNominal,
  leerNumero,
  NOMBRE_FASES,
  NOMBRE_USOS,
  USOS,
  type Placa,
  type Uso,
} from "@/lib/dominio/placa";
import type { DatosTransformador, Transformador } from "@/lib/dominio/tipos";
import type { AccionesPanel } from "../usePanel";
import { BotonTemporal, CampoTexto, Grupo, Opciones, Sugerencias } from "./campos";
import { placaDe, type Campo, type Errores, type Valores } from "./valores";

/** Sugerencias de base; se suman las que ya cargó el taller en otros transformadores. */
const SUGERENCIAS = {
  fabricante: [] as string[],
  norma: ["IRAM 2250", "IEC 60076"],
  servicio: ["Continuo"],
  enfriamiento: ["ONAN", "ONAF", "KNAN"],
  grupoConexion: ["Dyn11", "Dyn5", "Yyn0", "Yzn11", "Dd0"],
  materialBobinados: ["Cobre", "Aluminio"],
};

type CampoSugerido = keyof typeof SUGERENCIAS;

/** Lo que comparten los campos del transformador: los valores, sus errores y cómo cambiarlos. */
export interface PropsCampos {
  id: string;
  valores: Valores;
  setValores: Dispatch<SetStateAction<Valores>>;
  errores: Errores;
  quitarError: (campo: keyof Errores) => void;
  /** Al dar de alta, las fases son obligatorias. */
  nuevo: boolean;
}

/** Los datos guardados de un transformador, para editar uno solo (por ejemplo, el N.º T) sin tocar el resto. */
export const datosDe = (trafo: Transformador): DatosTransformador => ({
  numero: trafo.numero,
  provisorio: trafo.provisorio,
  numeroT: trafo.numeroT,
  equipo: trafo.equipo,
  uso: trafo.uso,
  placa: trafo.placa,
});

/** Cambia un campo y borra su error: el rojo queda solo donde todavía falta algo. */
function cambiador({ setValores, quitarError }: PropsCampos) {
  return (campo: Campo) => (valor: string) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    quitarError(campo);
  };
}

/**
 * Qué pasa con el transformador que ya tiene el N.º T que se le quiere poner a otro: `quitar`, el cliente
 * se lo cambió (sigue activo, sin N.º T); `baja`, se destruyó o ya no lo tienen. Vacío: todavía no se eligió.
 */
export type Reemplazo = "" | "quitar" | "baja";

/** Deja libre el N.º T de `trafo` para pasárselo a otro, según `reemplazo`. Lo que ingresó con él queda en sus O.T. */
export async function liberarNumeroT(acciones: AccionesPanel, trafo: Transformador, reemplazo: Exclude<Reemplazo, "">) {
  if (reemplazo === "baja") return acciones.darDeBaja("transformador", trafo.id);
  return acciones.editarTransformador(trafo.id, { ...datosDe(trafo), numeroT: undefined });
}

/** El error del N.º T si lo tiene otro transformador activo y no se dijo qué pasó con aquel. */
export const errorNumeroTOcupado = "Ese N.º T ya lo tiene otro transformador activo del cliente: corríjalo o diga qué pasó con aquel.";

/**
 * El N.º T del cliente. Si ya lo tiene otro transformador activo del cliente, se pregunta qué pasó: el
 * cliente se lo pasó a este (aquel sigue activo, sin N.º T), aquel se destruyó (se lo da de baja) o es un
 * error y hay que corregirlo.
 */
export function CampoNumeroT({
  id,
  valor,
  onCambio,
  error,
  ayuda = "El número interno que le pone el cliente. No todos lo usan.",
  ocupadoPor,
  reemplazo,
  onReemplazo,
  puedeDarDeBaja,
}: {
  id: string;
  valor: string;
  onCambio: (valor: string) => void;
  error?: string;
  ayuda?: ReactNode;
  /** El transformador activo del cliente que ya tiene el N.º T escrito. */
  ocupadoPor?: Transformador;
  reemplazo: Reemplazo;
  onReemplazo: (reemplazo: Reemplazo) => void;
  /** Si el rol puede dar de baja un transformador (permiso `baja-transformadores`). */
  puedeDarDeBaja: boolean;
}) {
  const opcion = (valorOpcion: Exclude<Reemplazo, "">, texto: ReactNode) => (
    <label className="mt-2 flex cursor-pointer items-start gap-2">
      <input
        type="radio"
        name={`${id}-reemplazo`}
        checked={reemplazo === valorOpcion}
        onChange={() => onReemplazo(valorOpcion)}
        className="mt-1 size-4 shrink-0 accent-tinta"
      />
      <span>{texto}</span>
    </label>
  );
  return (
    <div>
      <CampoTexto
        id={id}
        etiqueta="N.º T"
        valor={valor}
        onCambio={(v) => {
          onCambio(v);
          onReemplazo("");
        }}
        error={error}
        maxLength={30}
        ancho="max-w-[12rem]"
        ayuda={ayuda}
      />
      {ocupadoPor && (
        <fieldset className="mt-3 max-w-[48ch] text-[0.9375rem] leading-snug">
          <legend className="font-medium">
            El {valor.trim()} ya lo tiene el transformador {ocupadoPor.numero}, que sigue activo. ¿Qué pasó?
          </legend>
          {opcion("quitar", <>El cliente se lo cambió: pasárselo a este. El {ocupadoPor.numero} sigue activo y queda sin N.º T.</>)}
          {puedeDarDeBaja
            ? opcion("baja", <>El {ocupadoPor.numero} se destruyó o ya no lo tienen: darlo de baja y pasarle el número a este.</>)
            : <p className="mt-2">Si aquel se destruyó, pídale a un administrador que lo dé de baja.</p>}
          <p className="mt-2 text-grafito">Si no es ninguna, es un error: corrija el número.</p>
        </fieldset>
      )}
    </div>
  );
}

/**
 * Lo que identifica al transformador: el N.º de trafo (el de fábrica o, si no se ve en la chapa o no lo
 * tiene, uno temporal), el N.º T del cliente (ver `CampoNumeroT`) y el uso.
 */
export function IdentidadTransformador(
  props: PropsCampos & {
    /** El que se ofrece si no tiene N.º de trafo. */
    provisorioSiguiente: string;
    /** El transformador activo del cliente que ya tiene el N.º T escrito. */
    ocupadoPor?: Transformador;
    reemplazo: Reemplazo;
    onReemplazo: (reemplazo: Reemplazo) => void;
    puedeDarDeBaja: boolean;
  },
) {
  const { id, valores, setValores, errores, quitarError, provisorioSiguiente, ocupadoPor, reemplazo, onReemplazo, puedeDarDeBaja } = props;
  const cambiar = cambiador(props);
  const campoId = (campo: string) => `${id}-${campo}`;

  return (
    <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
      <div>
        <CampoTexto
          id={campoId("numero")}
          etiqueta="N.º de trafo"
          obligatorio
          valor={valores.numero}
          onCambio={(v) => {
            cambiar("numero")(v);
            if (valores.provisorio) setValores((actual) => ({ ...actual, provisorio: false }));
          }}
          error={errores.numero}
          maxLength={60}
          ancho="max-w-[16rem]"
          ayuda={
            valores.provisorio ? (
              <span>
                <span className="font-semibold text-tinta">N.º temporal.</span>{" "}
                {props.nuevo
                  ? "Cuando consiga el de fábrica, cámbielo en la ficha del transformador."
                  : "Cuando consiga el de fábrica, escríbalo en su lugar."}
              </span>
            ) : (
              "El de fábrica, en la chapa. En algunas figura como N.º de serie o de fabricación."
            )
          }
        />
        {!valores.provisorio && !valores.numero.trim() && (
          <BotonTemporal
            cuando="Si no lo tiene o no se ve en la chapa."
            onClick={() => {
              setValores((v) => ({ ...v, numero: provisorioSiguiente, provisorio: true }));
              quitarError("numero");
            }}
          />
        )}
      </div>
      <CampoNumeroT
        id={campoId("numeroT")}
        valor={valores.numeroT}
        onCambio={cambiar("numeroT")}
        error={errores.numeroT}
        ocupadoPor={ocupadoPor}
        reemplazo={reemplazo}
        onReemplazo={onReemplazo}
        puedeDarDeBaja={puedeDarDeBaja}
      />
      <Opciones<Uso | "">
        id={campoId("uso")}
        leyenda="Uso"
        className="sm:col-span-2"
        valor={valores.uso}
        onCambio={(v) => cambiar("uso")(v)}
        opciones={[...USOS.map((u) => ({ valor: u, etiqueta: NOMBRE_USOS[u] })), { valor: "", etiqueta: "Sin indicar" }]}
      />
    </div>
  );
}

/**
 * La chapa del transformador, de arriba hacia abajo en el mismo orden en que la trae: identificación,
 * características, tensiones, conmutador, aceite y masa.
 */
export function ChapaTransformador(props: PropsCampos & { transformadores: Transformador[] }) {
  const { id, valores, setValores, errores, quitarError, nuevo, transformadores } = props;
  const cambiar = cambiador(props);
  const campoId = (campo: string) => `${id}-${campo}`;
  const lista = (campo: CampoSugerido) => `${id}-sugerencias-${campo}`;
  const placa = placaDe(valores);

  const sugerencias = useMemo(() => {
    const usadas = (campo: CampoSugerido) =>
      transformadores.map((t) => t.placa?.[campo as keyof Placa]).filter((v): v is string => typeof v === "string");
    return Object.fromEntries(
      (Object.keys(SUGERENCIAS) as CampoSugerido[]).map((campo) => [
        campo,
        [...new Set([...SUGERENCIAS[campo], ...usadas(campo)])].sort((a, b) => a.localeCompare(b, "es")),
      ]),
    ) as Record<CampoSugerido, string[]>;
  }, [transformadores]);

  const comun = (campo: Campo) => ({ id: campoId(campo), valor: valores[campo], onCambio: cambiar(campo), error: errores[campo] });
  const numero = (campo: Campo, unidad: string) => ({ ...comun(campo), unidad, numerico: true, maxLength: 12 });
  const cambiarPunto = (i: number) => (valor: string) => {
    setValores((v) => ({ ...v, conmutador: v.conmutador.map((p, j) => (j === i ? valor : p)) }));
    quitarError(`conmutador${i}`);
  };

  const tensionPrimaria = leerNumero(valores.tensionPrimaria, true);
  const tensionSecundaria = leerNumero(valores.tensionSecundaria, true);
  const conmutadorVacio = valores.conmutador.every((p) => !p.trim());

  return (
    <div className="marco">
      <TornillosMarco />
      <div className="marco-cabecera">
        <h2 className="rotulo text-base">Placa de características</h2>
      </div>

      <Grupo titulo="Identificación" primero ayuda="Datos de placa">
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-6">
          <CampoTexto {...comun("fabricante")} etiqueta="Fabricante" lista={lista("fabricante")} className="sm:col-span-4" />
          <CampoTexto {...comun("anio")} etiqueta="Año de fabricación" numerico maxLength={4} className="sm:col-span-2" ancho="max-w-[8rem]" />
          <CampoTexto {...comun("tipo")} etiqueta="Tipo" className="sm:col-span-3" ayuda="El modelo, si la chapa lo indica." />
          <CampoTexto {...comun("norma")} etiqueta="Norma" lista={lista("norma")} className="sm:col-span-3" ancho="max-w-[14rem]" />
        </div>
      </Grupo>

      <Grupo titulo="Características">
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-6">
          <Opciones
            id={campoId("fases")}
            leyenda="Fases"
            obligatorio={nuevo}
            className="sm:col-span-6"
            valor={valores.fases}
            onCambio={(v) => cambiar("fases")(v)}
            error={errores.fases}
            opciones={FASES.map((f) => ({ valor: f, etiqueta: NOMBRE_FASES[f] }))}
          />
          <CampoTexto {...numero("potencia", "kVA")} etiqueta="Potencia nominal" ancho="max-w-[10rem]" className="sm:col-span-2" />
          <CampoTexto {...numero("frecuencia", "Hz")} etiqueta="Frecuencia" ancho="max-w-[8rem]" className="sm:col-span-2" />
          <CampoTexto
            {...numero("tensionCortocircuito", "%")}
            etiqueta="Tensión de cortocircuito"
            ancho="max-w-[8rem]"
            className="sm:col-span-2"
            ayuda="En la chapa: Tensión de CC o Ucc."
          />
          <CampoTexto {...comun("grupoConexion")} etiqueta="Grupo de conexiones" lista={lista("grupoConexion")} maxLength={20} className="sm:col-span-2" ancho="max-w-[10rem]" />
          <CampoTexto {...comun("servicio")} etiqueta="Servicio" lista={lista("servicio")} maxLength={40} className="sm:col-span-2" />
          <CampoTexto {...comun("enfriamiento")} etiqueta="Sistema de enfriamiento" lista={lista("enfriamiento")} maxLength={20} className="sm:col-span-2" ancho="max-w-[10rem]" />
        </div>
      </Grupo>

      <Grupo titulo="Tensiones nominales" ayuda="La intensidad se calcula sola: sirve para controlar contra la chapa.">
        <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
          {(
            [
              ["tensionPrimaria", "Primario", tensionPrimaria, 1000, "13,2 kV se escribe 13200"],
              ["tensionSecundaria", "Secundario", tensionSecundaria, 100, "0,4 kV se escribe 400"],
            ] as const
          ).map(([campo, nombre, tension, minimo, ejemplo]) => {
            const intensidad =
              placa.potencia && tension && placa.fases ? `${formatearNumero(intensidadNominal(placa.potencia, tension, placa.fases))} A` : null;
            return (
              <div key={campo}>
                <h4 className="rotulo border-b-2 border-acero pb-1.5 text-base">{nombre}</h4>
                <CampoTexto
                  {...numero(campo, "V")}
                  etiqueta="Tensión"
                  contexto={`del ${nombre.toLowerCase()}`}
                  ancho="max-w-[11rem]"
                  className="mt-4"
                  ayuda={
                    tension && tension > 0 && !errores[campo]
                      ? tension < minimo
                        ? `¿Está en voltios? ${ejemplo}.`
                        : `Equivale a ${formatearKV(tension)} kV.`
                      : undefined
                  }
                />
                <dl className="mt-5 flex items-baseline gap-3">
                  <dt className="rotulo text-[0.9375rem]">Intensidad</dt>
                  <dd className="text-[1.125rem]">
                    {intensidad ?? (
                      <span className="text-[0.9375rem] text-grafito">
                        {placa.fases ? "Falta la potencia o la tensión" : "Elija las fases para calcularla"}
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            );
          })}
        </div>
      </Grupo>

      <Grupo titulo="Conmutador sin tensión" ayuda="La tensión de cada punto, como en la tabla de la chapa.">
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-5">
          {valores.conmutador.map((punto, i) => {
            const enVoltios = leerNumero(punto, true);
            const nominal = !!tensionPrimaria && enVoltios === tensionPrimaria;
            return (
              <CampoTexto
                key={i}
                id={campoId(`conmutador${i}`)}
                etiqueta={`Punto ${i + 1}`}
                contexto="del conmutador"
                valor={punto}
                onCambio={cambiarPunto(i)}
                error={errores[`conmutador${i}`]}
                unidad="V"
                numerico
                maxLength={12}
                ayuda={nominal ? "Nominal" : undefined}
              />
            );
          })}
        </div>
        {conmutadorVacio && tensionPrimaria && tensionPrimaria >= 1000 && (
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              type="button"
              onClick={() => setValores((v) => ({ ...v, conmutador: conmutadorSugerido(tensionPrimaria).map(String) }))}
              className="placa-secundaria"
            >
              Completar con pasos de 2,5 %
            </button>
            <p className="max-w-[44ch] text-[0.9375rem] leading-snug text-grafito">Es lo más común. Después revise que coincida con la chapa.</p>
          </div>
        )}
      </Grupo>

      <Grupo titulo="Aceite y masa">
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-6">
          <CampoTexto {...numero("aceite", "L")} etiqueta="Aceite aislante" ancho="max-w-[9rem]" className="sm:col-span-2" />
          <CampoTexto {...numero("masa", "kg")} etiqueta="Masa total" ancho="max-w-[9rem]" className="sm:col-span-2" />
          <CampoTexto {...comun("materialBobinados")} etiqueta="Material de los bobinados" lista={lista("materialBobinados")} maxLength={40} className="sm:col-span-2" />
        </div>
      </Grupo>

      {(Object.keys(sugerencias) as CampoSugerido[]).map((campo) => (
        <Sugerencias key={campo} id={lista(campo)} valores={sugerencias[campo]} />
      ))}
    </div>
  );
}
