"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { IdPictograma } from "@/components/senal/pictogramas";
import type { VarianteSenal } from "@/components/senal/Senal";
import { obtenerRepositorios, ServicioNoConfiguradoError } from "@/lib/datos/repositorios";
import { formatearCodigo, validarCodigo, type ValidacionCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES, type FormaSenal } from "@/lib/dominio/estados";
import type { SeguimientoPublico } from "@/lib/dominio/tipos";

export type Consulta =
  | { fase: "inactiva" }
  | { fase: "cargando"; codigo: string }
  | { fase: "encontrada"; seguimiento: SeguimientoPublico }
  | { fase: "no-encontrada"; codigo: string }
  | { fase: "error"; mensaje: string };

export interface SenalVisible {
  clave: string;
  forma: FormaSenal;
  pictograma: IdPictograma;
  variante?: VarianteSenal;
  rotulo: string;
  titulo: string;
}

const ERRORES_CODIGO: Record<Exclude<ValidacionCodigo, { ok: true }>["motivo"], string> = {
  vacio: "Escriba el código de seguimiento que figura en su orden de ingreso.",
  largo: "El código tiene 8 caracteres, letras y números. Revíselo en su orden de ingreso.",
  confusos: "Los códigos no usan O, 0, I, 1 ni L. Revise el código en su orden de ingreso.",
  invalidos: "El código solo tiene letras y números. Revíselo en su orden de ingreso.",
};

/** Estado y acciones de la consulta pública por código. `codigoInicial` llega por el QR de la orden de ingreso. */
export function useConsulta(codigoInicial?: string) {
  const [entrada, setEntrada] = useState(() => (codigoInicial ? formatearCodigo(codigoInicial) : ""));
  const [errorCampo, setErrorCampo] = useState<string | null>(null);
  const [consulta, setConsulta] = useState<Consulta>(() =>
    codigoInicial ? { fase: "cargando", codigo: codigoInicial } : { fase: "inactiva" },
  );
  const campo = useRef<HTMLInputElement>(null);
  const resultado = useRef<HTMLDivElement>(null);

  async function consultar(valor: string, { mover = true } = {}) {
    const validacion = validarCodigo(valor);
    if (!validacion.ok) {
      setErrorCampo(ERRORES_CODIGO[validacion.motivo]);
      setConsulta({ fase: "inactiva" });
      campo.current?.focus();
      return;
    }
    setErrorCampo(null);
    setConsulta({ fase: "cargando", codigo: validacion.codigo });
    try {
      const { seguimiento } = await obtenerRepositorios();
      const encontrado = await seguimiento.obtenerPorCodigo(validacion.codigo);
      setConsulta(
        encontrado
          ? { fase: "encontrada", seguimiento: encontrado }
          : { fase: "no-encontrada", codigo: validacion.codigo },
      );
      // La dirección queda igual a la del QR, para poder compartirla o volver a ella.
      window.history.replaceState(null, "", `/seguimiento/${formatearCodigo(validacion.codigo)}`);
      if (mover && window.matchMedia("(max-width: 1023px)").matches) {
        resultado.current?.scrollIntoView({ block: "start" });
      }
    } catch (error) {
      setConsulta({
        fase: "error",
        mensaje:
          error instanceof ServicioNoConfiguradoError
            ? "La consulta en línea todavía no está habilitada. Comuníquese con el taller."
            : "No se pudo consultar el estado. Revise su conexión e intente de nuevo.",
      });
    }
  }

  useEffect(() => {
    if (codigoInicial) void consultar(codigoInicial, { mover: false });
    // Solo al abrir la página desde un QR o un enlace de seguimiento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    void consultar(entrada);
  }

  function cambiarEntrada(valor: string) {
    setEntrada(formatearCodigo(valor));
    if (errorCampo) setErrorCampo(null);
  }

  function limpiar() {
    setEntrada("");
    setErrorCampo(null);
    setConsulta({ fase: "inactiva" });
    window.history.replaceState(null, "", "/");
    campo.current?.focus();
  }

  const seguimiento = consulta.fase === "encontrada" ? consulta.seguimiento : null;
  const cargando = consulta.fase === "cargando";
  const hayResultado = consulta.fase === "encontrada" || consulta.fase === "no-encontrada";

  return {
    entrada,
    cambiarEntrada,
    errorCampo,
    consulta,
    enviar,
    limpiar,
    campo,
    resultado,
    seguimiento,
    cargando,
    hayResultado,
  };
}

/** Señal de la consulta en curso, o null cuando no hay consulta (el inicio muestra entonces la ilustración). */
export function senalDeConsulta(consulta: Consulta): SenalVisible | null {
  if (consulta.fase === "encontrada") {
    const d = DEFINICIONES[consulta.seguimiento.estado];
    return { clave: `equipo-${consulta.seguimiento.codigo}-${d.id}`, forma: d.forma, pictograma: d.id, rotulo: d.rotulo, titulo: `Su equipo: ${d.rotulo}` };
  }
  if (consulta.fase === "no-encontrada") {
    return { clave: `sin-codigo-${consulta.codigo}`, forma: "registro", pictograma: "pregunta", rotulo: "Código no encontrado", titulo: "Código no encontrado" };
  }
  if (consulta.fase === "cargando") {
    // Neutra: nunca se muestra un estado de ejemplo antes del real (p. ej. al abrir el QR).
    return { clave: `consultando-${consulta.codigo}`, forma: "registro", pictograma: "transformador", variante: "futura", rotulo: "Consultando…", titulo: "Consultando el estado" };
  }
  return null;
}

/** Código de la consulta en curso, ya validado, o null. */
export function codigoDeConsulta(consulta: Consulta): string | null {
  if (consulta.fase === "encontrada") return consulta.seguimiento.codigo;
  if (consulta.fase === "no-encontrada" || consulta.fase === "cargando") return consulta.codigo;
  return null;
}
