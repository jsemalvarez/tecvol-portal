"use client";

import { useId, useState, type FormEvent } from "react";
import { CLAVE_CUENTAS_NUEVAS } from "@/lib/datos/local/datos";
import { modoDatos } from "@/lib/datos/repositorios";
import { DESCRIPCIONES_ROL, NOMBRES_ROL, ROLES_PERSONAL } from "@/lib/dominio/roles";
import type { CuentaPersonal, RolPersonal } from "@/lib/dominio/tipos";
import { ErrorFormulario, MensajeCampo, mensajeDeError } from "./Dialogo";
import type { AccionesPanel } from "./usePanel";

const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Cuenta del personal: sin `cuenta`, la crea con el rol elegido y la persona recibe el email para elegir su
 * contraseña, como un cliente. Con `cuenta`, solo le cambia el rol.
 */
export function FormularioPersonal({
  cuenta,
  acciones,
  onGuardada,
}: {
  cuenta?: CuentaPersonal;
  acciones: AccionesPanel;
  onGuardada: (cuenta: CuentaPersonal, nueva: boolean) => void;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<RolPersonal>(cuenta?.rol ?? "jefe-taller");
  const [errorEmail, setErrorEmail] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    if (cuenta) {
      if (rol === cuenta.rol) return onGuardada(cuenta, false);
      setGuardando(true);
      try {
        await acciones.editarPersonal(cuenta.uid, rol);
        onGuardada({ ...cuenta, rol }, false);
      } catch (e) {
        setError(mensajeDeError(e));
        setGuardando(false);
      }
      return;
    }
    const valor = email.trim().toLowerCase();
    if (!valor) return setErrorEmail("Escriba el email de la persona que va a usar la cuenta.");
    if (!EMAIL_VALIDO.test(valor)) return setErrorEmail("Revise el email: debe tener la forma nombre@tecvol.com.ar.");
    setGuardando(true);
    try {
      onGuardada(await acciones.crearPersonal(valor, rol), true);
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-6">
      {cuenta ? (
        <p className="max-w-[56ch]">
          Cuenta de <strong className="font-semibold">{cuenta.email}</strong>. El cambio vale desde la próxima vez que abra el panel.
        </p>
      ) : (
        <p className="max-w-[56ch]">
          Al crearla, le llega un email para elegir su contraseña. El enlace vence en poco tiempo: avísele que lo use apenas lo
          reciba y que, si no lo ve, revise la carpeta de spam. Si se le vence, reenvíelo desde la lista.
        </p>
      )}
      <ErrorFormulario texto={error} />
      {!cuenta && (
        <div>
          <label htmlFor={`${id}-email`} className="rotulo block text-[0.9375rem]">
            Email
          </label>
          <input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrorEmail(undefined);
            }}
            aria-invalid={errorEmail ? true : undefined}
            aria-describedby={errorEmail ? `${id}-email-error` : undefined}
            className="renglon mt-1"
          />
          <MensajeCampo id={`${id}-email-error`} texto={errorEmail} />
        </div>
      )}
      <fieldset>
        <legend className="rotulo text-[0.9375rem]">Rol</legend>
        <div className="mt-3 grid gap-2">
          {ROLES_PERSONAL.map((opcion) => (
            <label
              key={opcion}
              className={`flex cursor-pointer items-start gap-3 rounded-[0.25rem] border-2 px-3 py-2.5 transition-colors ${
                rol === opcion ? "border-tinta bg-blanco" : "border-transparent bg-esmalte hover:border-acero"
              }`}
            >
              <input
                type="radio"
                name={`rol-${id}`}
                value={opcion}
                checked={rol === opcion}
                onChange={() => setRol(opcion)}
                className="mt-1 size-4 shrink-0 accent-[var(--color-tinta)]"
              />
              <span className="min-w-0 leading-snug">
                <span className="font-semibold">{NOMBRES_ROL[opcion]}</span>
                <span className="block text-[0.9375rem] text-grafito">{DESCRIPCIONES_ROL[opcion]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="placa" disabled={guardando}>
          {guardando ? "Guardando…" : cuenta ? "Guardar el rol" : "Crear cuenta y enviar email"}
        </button>
        {!cuenta && modoDatos === "local" && (
          <p className="max-w-[44ch] text-[0.9375rem] text-grafito">
            Con datos de prueba no se envía el email: la cuenta entra con la contraseña{" "}
            <strong className="font-semibold text-tinta">{CLAVE_CUENTAS_NUEVAS}</strong>.
          </p>
        )}
      </div>
    </form>
  );
}
