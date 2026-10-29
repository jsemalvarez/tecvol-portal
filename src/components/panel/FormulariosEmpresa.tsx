"use client";

import { useId, useState, type FormEvent } from "react";
import { CLAVE_CUENTAS_NUEVAS } from "@/lib/datos/local/datos";
import { modoDatos } from "@/lib/datos/repositorios";
import {
  cuitValido,
  digitosCuit,
  facturacionParaGuardar,
  formatearCuit,
  LARGOS_FACTURACION,
  type Facturacion,
} from "@/lib/dominio/facturacion";
import { fechaParaCampo } from "@/lib/dominio/fechas";
import type { CuentaCliente, Empresa } from "@/lib/dominio/tipos";
import { ErrorFormulario, MensajeCampo, mensajeDeError } from "./Dialogo";
import { CampoTexto } from "./equipo/campos";
import type { AccionesPanel } from "./usePanel";

const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Crea una empresa o, con `empresa`, le cambia el nombre y los datos de facturación. */
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
  const [facturacion, setFacturacion] = useState<Facturacion>(() => ({
    ...empresa?.facturacion,
    cuit: empresa?.facturacion?.cuit ? formatearCuit(empresa.facturacion.cuit) : undefined,
  }));
  const [falta, setFalta] = useState(false);
  const [errorCuit, setErrorCuit] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const campo = (clave: keyof Facturacion) => (valor: string) => {
    setFacturacion((actual) => ({ ...actual, [clave]: valor }));
    if (clave === "cuit") setErrorCuit(undefined);
  };

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const valor = nombre.trim();
    const cuit = digitosCuit(facturacion.cuit ?? "");
    const cuitMal = cuit && !cuitValido(cuit);
    if (cuitMal) {
      setErrorCuit(
        cuit.length === 11 ? "Revise el CUIT: el último dígito no coincide con los demás." : "Revise el CUIT: debe tener 11 números, como 30-54574456-9.",
      );
    }
    if (!valor) setFalta(true);
    if (!valor || cuitMal) return;
    const datos = { nombre: valor, facturacion: facturacionParaGuardar({ ...facturacion, cuit }) };
    setGuardando(true);
    try {
      if (!empresa) return onGuardada(await acciones.crearEmpresa(datos));
      await acciones.editarEmpresa(empresa.id, datos);
      onGuardada({ ...empresa, ...datos });
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
      <fieldset className="flex flex-col gap-6 border-t-[3px] border-acero pt-5">
        <legend className="sr-only">Datos de facturación</legend>
        <div aria-hidden="true">
          <p className="rotulo text-[0.9375rem]">Datos de facturación</p>
          <p className="mt-1 text-[0.9375rem] text-grafito">Para el certificado y la factura. Si no los tiene ahora, puede completarlos después.</p>
        </div>
        <CampoTexto
          id={`${id}-razon`}
          etiqueta="Razón social"
          valor={facturacion.razonSocial ?? ""}
          onCambio={campo("razonSocial")}
          maxLength={LARGOS_FACTURACION.razonSocial}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <CampoTexto
            id={`${id}-cuit`}
            etiqueta="CUIT"
            valor={facturacion.cuit ?? ""}
            onCambio={campo("cuit")}
            error={errorCuit}
            numerico
            maxLength={16}
          />
          <div>
            <label htmlFor={`${id}-inicio`} className="rotulo block text-[0.9375rem]">
              Inicio de actividades
            </label>
            <input
              id={`${id}-inicio`}
              type="date"
              value={facturacion.inicioActividades ?? ""}
              max={fechaParaCampo(new Date())}
              onChange={(e) => campo("inicioActividades")(e.target.value)}
              className="renglon mt-1"
            />
          </div>
        </div>
        <CampoTexto
          id={`${id}-domicilio`}
          etiqueta="Domicilio"
          valor={facturacion.domicilio ?? ""}
          onCambio={campo("domicilio")}
          ayuda="Calle y número, localidad, código postal y provincia."
          maxLength={LARGOS_FACTURACION.domicilio}
        />
        <CampoTexto
          id={`${id}-telefonos`}
          etiqueta="Teléfonos"
          valor={facturacion.telefonos ?? ""}
          onCambio={campo("telefonos")}
          ayuda="Puede poner varios, con el fax y la guardia si los tiene."
          maxLength={LARGOS_FACTURACION.telefonos}
        />
      </fieldset>
      <button type="submit" className="placa self-start" disabled={guardando}>
        {guardando ? "Guardando…" : empresa ? "Guardar los cambios" : "Crear empresa"}
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
        email para elegir su contraseña. El enlace vence en poco tiempo: avísele que lo use apenas lo reciba y que, si no lo
        ve, revise la carpeta de spam. Si se le vence, reenvíelo desde la lista de cuentas.
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
