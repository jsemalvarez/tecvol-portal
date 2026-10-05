import type { ReactNode } from "react";
import { Alerta } from "@/components/iconos";
import { FRANJA } from "@/components/senal/franja";
import { Senal } from "@/components/senal/Senal";
import { formatearCodigo } from "@/lib/dominio/codigo";
import type { Consulta, SenalVisible } from "./useConsulta";

/** Señal del equipo consultado, montada en su chapa blanca como una señal real, con su franja y el código. */
export function SenalConFranja({
  senal,
  idDestello,
  anchoSenal,
  pie,
}: {
  senal: SenalVisible;
  idDestello: string;
  anchoSenal: string;
  pie?: ReactNode;
}) {
  return (
    <figure className="flex flex-col items-center rounded-[0.875rem] bg-blanco p-4 text-tinta shadow-placa sm:p-5">
      <div key={senal.clave} className={`senal-entra ${anchoSenal}`}>
        <Senal
          forma={senal.forma}
          pictograma={senal.pictograma}
          variante={senal.variante}
          titulo={senal.titulo}
          destello={senal.variante !== "futura"}
          idDestello={idDestello}
          className="block w-full"
        />
      </div>
      <figcaption
        className={`rotulo mt-3 w-full rounded-[0.375rem] px-3 py-2 text-center text-lg font-extrabold leading-tight lg:text-xl ${FRANJA[senal.forma]}`}
      >
        {senal.rotulo}
      </figcaption>
      {pie && <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[0.9375rem]">{pie}</div>}
    </figure>
  );
}

/** Aviso de código no encontrado o de error de consulta. */
export function AvisoConsulta({ consulta }: { consulta: Consulta }) {
  if (consulta.fase === "no-encontrada") {
    return (
      <p className="max-w-[52ch] text-lg">
        No encontramos el código <strong className="font-semibold">{formatearCodigo(consulta.codigo)}</strong>. Revise el
        código en su orden de ingreso o escanee el QR impreso en ella.
      </p>
    );
  }
  if (consulta.fase === "error") {
    return (
      <p className="flex max-w-[52ch] items-start gap-2 font-medium text-rojo">
        <Alerta className="mt-0.5 size-5 shrink-0" />
        {consulta.mensaje}
      </p>
    );
  }
  return null;
}

/** Ayuda del campo del código, o el error de validación en su lugar. */
export function AyudaCodigo({ error, oculta, className = "" }: { error: string | null; oculta: boolean; className?: string }) {
  if (error) {
    return (
      <p id="codigo-error" className={`flex max-w-[52ch] items-start gap-2 font-medium text-rojo ${className}`}>
        <Alerta className="mt-0.5 size-5 shrink-0" />
        {error}
      </p>
    );
  }
  return (
    <p id="codigo-ayuda" className={oculta ? "sr-only" : `max-w-[52ch] text-grafito ${className}`}>
      Son 8 letras y números. Figura en su orden de ingreso, junto al código QR.
    </p>
  );
}
