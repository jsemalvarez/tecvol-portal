"use client";

import { useId, useState, type FormEvent } from "react";
import { CLAVE_CUENTAS_NUEVAS } from "@/lib/datos/local/datos";
import { modoDatos } from "@/lib/datos/repositorios";
import type { CuentaCliente, Empresa } from "@/lib/dominio/tipos";
import { ErrorFormulario, MensajeCampo, mensajeDeError } from "./Dialogo";
import type { AccionesPanel } from "./usePanel";

const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Crea una empresa o, con `empresa`, le cambia el nombre. */
export function FormularioEmpresa({
  empresa,
  acciones,
  onGuardada,
}: {
  empresa?: Empresa;
  acciones: AccionesPanel;
  onGuardada: (empresa: Empresa) => void;
}) {
  const id = useId();
  const [nombre, setNombre] = useState(empresa?.nombre ?? "");
  const [falta, setFalta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const valor = nombre.trim();
    if (!valor) return setFalta(true);
    setGuardando(true);
    try {
      if (!empresa) return onGuardada(await acciones.crearEmpresa(valor));
      await acciones.editarEmpresa(empresa.id, valor);
      onGuardada({ ...empresa, nombre: valor });
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-6">
      <ErrorFormulario texto={error} />
      <div>
        <label htmlFor={`${id}-nombre`} className="rotulo block text-[0.9375rem]">
          Nombre de la empresa
        </label>
        <input
          id={`${id}-nombre`}
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            setFalta(false);
          }}
          maxLength={120}
          aria-invalid={falta || undefined}
          aria-describedby={falta ? `${id}-nombre-error` : undefined}
          className="renglon mt-1"
        />
        <p className="mt-2 text-[0.9375rem] text-grafito">Como la va a ver el cliente en su portal.</p>
        <MensajeCampo id={`${id}-nombre-error`} texto={falta ? "Escriba el nombre de la empresa." : undefined} />
      </div>
      <button type="submit" className="placa self-start" disabled={guardando}>
        {guardando ? "Guardando…" : empresa ? "Guardar el nombre" : "Crear empresa"}
      </button>
    </form>
  );
}

/** Pasa una cuenta de cliente a otra empresa: desde ese momento ve los equipos de la nueva. */
export function FormularioEditarCuenta({
  cuenta,
  empresas,
  acciones,
  onGuardada,
}: {
  cuenta: CuentaCliente;
  /** Las empresas activas, entre las que se elige. */
  empresas: Empresa[];
  acciones: AccionesPanel;
  onGuardada: (cuenta: CuentaCliente) => void;
}) {
  const id = useId();
  const [empresa, setEmpresa] = useState(cuenta.empresa);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (empresa === cuenta.empresa) return onGuardada(cuenta);
    setGuardando(true);
    try {
      await acciones.editarCuenta(cuenta.uid, empresa);
      onGuardada({ ...cuenta, empresa });
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-6">
      <p className="max-w-[56ch]">
        La cuenta de <strong className="font-semibold">{cuenta.email}</strong> va a ver solo los equipos de la empresa que elija. El
        email no se puede cambiar: para otra persona, dé de baja esta cuenta y cree una nueva.
      </p>
      <ErrorFormulario texto={error} />
      <div>
        <label htmlFor={`${id}-empresa`} className="rotulo block text-[0.9375rem]">
          Empresa
        </label>
        <select id={`${id}-empresa`} value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="renglon mt-1">
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="placa self-start" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

/**
 * Cuenta de cliente para una empresa: se crea con una contraseña que nadie conoce y el cliente recibe un
 * email para elegir la suya.
 */
export function FormularioCuenta({
  empresa,
  acciones,
  onCreada,
}: {
  empresa: Empresa;
  acciones: AccionesPanel;
  onCreada: (cuenta: CuentaCliente) => void;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [errorEmail, setErrorEmail] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const valor = email.trim().toLowerCase();
    if (!valor) return setErrorEmail("Escriba el email de la persona que va a usar la cuenta.");
    if (!EMAIL_VALIDO.test(valor)) return setErrorEmail("Revise el email: debe tener la forma nombre@empresa.com.ar.");
    setGuardando(true);
    setError(null);
    try {
      onCreada(await acciones.crearCuenta(valor, empresa.id));
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-6">
      <p className="max-w-[56ch]">
        La cuenta ve solo los equipos de <strong className="font-semibold">{empresa.nombre}</strong>. Al crearla, le llega un
        email para elegir su contraseña. Avísele que, si no lo ve, revise la carpeta de spam.
      </p>
      <ErrorFormulario texto={error} />
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
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="placa" disabled={guardando}>
          {guardando ? "Creando la cuenta…" : "Crear cuenta y enviar email"}
        </button>
        {modoDatos === "local" && (
          <p className="max-w-[44ch] text-[0.9375rem] text-grafito">
            Con datos de prueba no se envía el email: la cuenta entra con la contraseña{" "}
            <strong className="font-semibold text-tinta">{CLAVE_CUENTAS_NUEVAS}</strong>.
          </p>
        )}
      </div>
    </form>
  );
}
