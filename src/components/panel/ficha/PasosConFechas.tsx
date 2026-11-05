"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import type { EstadoReparacion } from "@/lib/dominio/estados";
import type { Informe } from "@/lib/dominio/informe";
import { mensajeDeError } from "../Dialogo";
import { Cotizacion, FilaFecha, guardarFechas, PiePaso, useFechasPaso, useSucio, type PropsPaso } from "./piezas";

/** Un paso que es sobre todo fechas: cada una, con lo que ve la empresa desde ese día. */
function PasoConFechas({
  api,
  equipo,
  filas,
  antes,
  despues,
  seguir,
  conGuardar = true,
  nota,
  principal,
  onSeguir,
  onSucio,
}: PropsPaso & {
  filas: { etapa: EstadoReparacion; etiqueta: string }[];
  antes?: ReactNode;
  despues?: ReactNode;
  seguir?: string;
  conGuardar?: boolean;
  nota?: ReactNode;
  /** La fecha que hace cambiar lo que ve la empresa, para avisar si se sigue sin ella. */
  principal?: EstadoReparacion;
}) {
  const id = useId();
  const fechas = useFechasPaso(
    equipo,
    filas.map((f) => f.etapa),
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  useSucio(fechas.sucias, onSucio);

  async function guardar(seguirAlPaso: boolean) {
    setError(null);
    if (!fechas.revisar()) return;
    setGuardando(true);
    try {
      await guardarFechas(api, equipo, fechas, { seguir: seguirAlPaso, principal });
      if (seguirAlPaso) onSeguir();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    guardar(true);
  }

  return (
    <form onSubmit={enviar} noValidate>
      <div className="marco-cuerpo">
        {antes}
        <div className="flex flex-col gap-4">
          {filas.map((f) => (
            <FilaFecha key={f.etapa} id={id} etapa={f.etapa} etiqueta={f.etiqueta} fechas={fechas} />
          ))}
        </div>
        {despues}
      </div>
      <PiePaso guardando={guardando} seguir={seguir} onGuardar={conGuardar ? () => guardar(false) : undefined} error={error} nota={nota} />
    </form>
  );
}

/** El paso 4: lo que marcó el diagnóstico, cuándo se envió el presupuesto y cuándo lo aprobó la empresa. */
export function PasoPresupuesto({ informe, vaDespues, ...props }: PropsPaso & { informe: Informe | null; vaDespues?: ReactNode }) {
  return (
    <PasoConFechas
      {...props}
      principal="presupuesto"
      filas={[
        { etapa: "presupuesto", etiqueta: "Enviado el" },
        { etapa: "reparacion", etiqueta: "Aprobado el" },
      ]}
      antes={
        <>
          {vaDespues}
          <Cotizacion titulo="Lo que marcó el diagnóstico" inspeccion={informe?.inspeccion ?? {}} className="mb-7" />
        </>
      }
      despues={
        <p className="mt-4 text-[0.9375rem] leading-snug text-grafito">
          La empresa aprueba por fuera de la app; acá se anota cuándo. Desde la aprobación cuenta el aviso de demora de la reparación.
        </p>
      }
    />
  );
}

/** El paso 7: listo para la entrega y entregado. Con «Entregado», la O.T. se cierra. */
export function PasoEntrega({ vaDespues, ...props }: PropsPaso & { vaDespues?: ReactNode }) {
  return (
    <PasoConFechas
      {...props}
      seguir="Guardar la entrega"
      conGuardar={false}
      filas={[
        { etapa: "listo", etiqueta: "Desde el" },
        { etapa: "entregado", etiqueta: "El" },
      ]}
      antes={vaDespues}
      nota="Con «Entregado», la O.T. se cierra y queda en el historial del transformador."
    />
  );
}
