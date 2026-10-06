"use client";

/** Evento con el que el recuadro de prueba completa el formulario de ingreso. */
export const EVENTO_CUENTA_PRUEBA = "tecvol:usar-cuenta-prueba";

export interface CuentaParaUsar {
  email: string;
  clave: string;
}

/** Completa el formulario con una cuenta de prueba, para no tener que copiarla a mano. */
export function UsarCuentaPrueba({ cuenta, nombre }: { cuenta: CuentaParaUsar; nombre: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent<CuentaParaUsar>(EVENTO_CUENTA_PRUEBA, { detail: cuenta }))}
      aria-label={`Completar el ingreso con la cuenta de prueba de ${nombre}`}
      className="cursor-pointer font-semibold underline decoration-naranja decoration-2 underline-offset-4"
    >
      Usar esta cuenta
    </button>
  );
}
