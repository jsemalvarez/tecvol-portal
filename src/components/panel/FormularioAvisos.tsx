"use client";

import { useId, useState, type FormEvent } from "react";
import { esLimite, LIMITE_MAXIMO, type LimitesAvisos } from "@/lib/dominio/avisos";
import { leerNumero } from "@/lib/dominio/placa";
import { ErrorFormulario, mensajeDeError } from "./Dialogo";
import { CampoTexto } from "./equipo/campos";
import type { AccionesPanel } from "./usePanel";

/** Los días que puede llevar un equipo antes de que el panel avise. Solo el administrador los cambia. */
export function FormularioAvisos({
  limites,
  acciones,
  onGuardados,
}: {
  limites: LimitesAvisos;
  acciones: AccionesPanel;
  onGuardados: (limites: LimitesAvisos) => void;
}) {
  const id = useId();
  const [valores, setValores] = useState({ ingreso: String(limites.ingreso), aprobacion: String(limites.aprobacion) });
  const [errores, setErrores] = useState<Partial<Record<keyof LimitesAvisos, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo: keyof LimitesAvisos) => (texto: string) => {
    setValores((v) => ({ ...v, [campo]: texto }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const ingreso = leerNumero(valores.ingreso);
    const aprobacion = leerNumero(valores.aprobacion);
    const mensaje = `Escriba una cantidad de días entera, de 1 a ${LIMITE_MAXIMO}.`;
    const encontrados = {
      ingreso: esLimite(ingreso) ? undefined : mensaje,
      aprobacion: esLimite(aprobacion) ? undefined : mensaje,
    };
    setErrores(encontrados);
    if (!esLimite(ingreso) || !esLimite(aprobacion)) return;
    setGuardando(true);
    setError(null);
    try {
      const nuevos = { ingreso, aprobacion };
      await acciones.guardarAvisos(nuevos);
      onGuardados(nuevos);
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-6">
      <p className="max-w-[56ch]">
        El panel marca los equipos que pasan estos días, para que no se queden atrás. Vale para todo el personal; el cliente no lo ve.
      </p>
      <ErrorFormulario texto={error} />
      <CampoTexto
        id={`${id}-ingreso`}
        etiqueta="Días en el taller"
        valor={valores.ingreso}
        onCambio={cambiar("ingreso")}
        error={errores.ingreso}
        unidad="días"
        numerico
        maxLength={3}
        ancho="max-w-[10rem]"
        ayuda="Desde la fecha de ingreso, mientras se trabaja en el equipo (hasta que está listo)."
      />
      <CampoTexto
        id={`${id}-aprobacion`}
        etiqueta="Días desde la aprobación del presupuesto"
        valor={valores.aprobacion}
        onCambio={cambiar("aprobacion")}
        error={errores.aprobacion}
        unidad="días"
        numerico
        maxLength={3}
        ancho="max-w-[10rem]"
        ayuda="Desde que pasa a «Reparación», mientras está en reparación o en ensayos finales."
      />
      <button type="submit" className="placa self-start" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar los avisos"}
      </button>
    </form>
  );
}
