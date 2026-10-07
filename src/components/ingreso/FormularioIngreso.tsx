"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alerta, Flecha } from "@/components/iconos";
import {
  ErrorDeIngreso,
  obtenerAutenticacion,
  ServicioNoConfiguradoError,
  type MotivoErrorDeIngreso,
} from "@/lib/datos/repositorios";
import type { Rol, Sesion } from "@/lib/dominio/tipos";
import { EVENTO_CUENTA_PRUEBA, type CuentaParaUsar } from "./UsarCuentaPrueba";

type Modo = "ingreso" | "restablecer" | "enviado";

const MENSAJES: Record<MotivoErrorDeIngreso, string> = {
  credenciales: "El email o la contraseña no coinciden. Revíselos e intente de nuevo.",
  intentos: "Hubo demasiados intentos. Espere unos minutos o restablezca la contraseña.",
  deshabilitada: "La cuenta está deshabilitada. Comuníquese con el taller.",
  conexion: "No se pudo conectar. Revise su conexión e intente de nuevo.",
  desconocido: "No se pudo ingresar. Intente de nuevo en unos minutos.",
};

const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function destinoDe(rol: Rol) {
  return rol === "personal" ? "/panel" : "/portal";
}

function mensajeDe(error: unknown) {
  if (error instanceof ErrorDeIngreso) return MENSAJES[error.motivo];
  if (error instanceof ServicioNoConfiguradoError) return "El ingreso todavía no está habilitado. Comuníquese con el taller.";
  return MENSAJES.desconocido;
}

function MensajeError({ id, texto }: { id: string; texto: string }) {
  return (
    <p id={id} className="mt-2 flex items-start gap-2 text-[0.9375rem] font-medium text-rojo">
      <Alerta className="mt-0.5 size-[1.125rem] shrink-0" />
      {texto}
    </p>
  );
}

/**
 * Ingreso con email y contraseña para clientes y personal. El rol de la cuenta decide el destino:
 * el cliente va al portal, el personal al panel. Incluye el pedido de una contraseña nueva.
 */
export function FormularioIngreso() {
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [modo, setModo] = useState<Modo>("ingreso");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [errores, setErrores] = useState<{ email?: string; clave?: string }>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campoEmail = useRef<HTMLInputElement>(null);
  const aviso = useRef<HTMLDivElement>(null);
  const botonIngresar = useRef<HTMLButtonElement>(null);
  const primerRender = useRef(true);

  useEffect(() => {
    let dejarDeEscuchar = () => {};
    let activo = true;
    obtenerAutenticacion()
      .then((autenticacion) => {
        if (activo) dejarDeEscuchar = autenticacion.observarSesion(setSesion);
      })
      .catch(() => setSesion(null));
    return () => {
      activo = false;
      dejarDeEscuchar();
    };
  }, []);

  // El recuadro de datos de prueba completa el formulario; el foco queda en "Ingresar".
  useEffect(() => {
    function usar(evento: Event) {
      const { email: nuevoEmail, clave: nuevaClave } = (evento as CustomEvent<CuentaParaUsar>).detail;
      setModo("ingreso");
      setEmail(nuevoEmail);
      setClave(nuevaClave);
      setErrores({});
      setErrorGeneral(null);
      requestAnimationFrame(() => botonIngresar.current?.focus());
    }
    window.addEventListener(EVENTO_CUENTA_PRUEBA, usar);
    return () => window.removeEventListener(EVENTO_CUENTA_PRUEBA, usar);
  }, []);

  // Al cambiar de modo, el foco va al primer campo o al aviso, para quien navega con teclado o lector.
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    if (modo === "enviado") aviso.current?.focus();
    else campoEmail.current?.focus();
  }, [modo]);

  function cambiarModo(nuevo: Modo) {
    setErrores({});
    setErrorGeneral(null);
    setModo(nuevo);
  }

  function validarEmail(valor: string) {
    if (!valor) return "Escriba el email de su cuenta.";
    if (!EMAIL_VALIDO.test(valor)) return "Revise el email: debe tener la forma nombre@empresa.com.ar.";
    return undefined;
  }

  async function ingresar(evento: FormEvent) {
    evento.preventDefault();
    const valor = email.trim();
    const encontrados = { email: validarEmail(valor), clave: clave ? undefined : "Escriba su contraseña." };
    setErrores(encontrados);
    setErrorGeneral(null);
    if (encontrados.email || encontrados.clave) {
      (encontrados.email ? campoEmail.current : document.getElementById("ingreso-clave"))?.focus();
      return;
    }
    setEnviando(true);
    try {
      const autenticacion = await obtenerAutenticacion();
      const nueva = await autenticacion.ingresar(valor, clave);
      router.replace(destinoDe(nueva.rol));
    } catch (error) {
      setErrorGeneral(mensajeDe(error));
      setEnviando(false);
    }
  }

  async function restablecer(evento: FormEvent) {
    evento.preventDefault();
    const valor = email.trim();
    const errorEmail = validarEmail(valor);
    setErrores({ email: errorEmail });
    setErrorGeneral(null);
    if (errorEmail) {
      campoEmail.current?.focus();
      return;
    }
    setEnviando(true);
    try {
      const autenticacion = await obtenerAutenticacion();
      await autenticacion.restablecerClave(valor);
      cambiarModo("enviado");
    } catch (error) {
      setErrorGeneral(mensajeDe(error));
    } finally {
      setEnviando(false);
    }
  }

  async function salir() {
    const autenticacion = await obtenerAutenticacion();
    await autenticacion.salir();
  }

  if (sesion) {
    return (
      <div role="status" className="flex flex-col items-start gap-5">
        <p className="text-lg">
          Ya ingresó como <strong className="font-semibold">{sesion.email}</strong>.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href={destinoDe(sesion.rol)} className="placa">
            {sesion.rol === "personal" ? "Ir al panel" : "Ir al portal"}
            <Flecha />
          </Link>
          <button type="button" onClick={salir} className="placa-secundaria">
            Salir
          </button>
        </div>
      </div>
    );
  }

  if (modo === "enviado") {
    return (
      <div ref={aviso} tabIndex={-1} role="status" className="flex flex-col items-start gap-5 outline-none">
        <p className="max-w-[44ch] text-lg">
          Si <strong className="font-semibold">{email.trim()}</strong> tiene una cuenta, le llegará un email con un enlace para
          elegir una contraseña nueva. Si no lo ve en unos minutos, revise la carpeta de spam.
        </p>
        <button type="button" onClick={() => cambiarModo("ingreso")} className="placa-secundaria">
          Volver al ingreso
        </button>
      </div>
    );
  }

  const restableciendo = modo === "restablecer";

  return (
    <form onSubmit={restableciendo ? restablecer : ingresar} noValidate aria-busy={enviando} className="flex flex-col gap-7">
      {restableciendo && (
        <p className="max-w-[44ch]">Escriba el email de su cuenta y le enviaremos un enlace para elegir una contraseña nueva.</p>
      )}
      {errorGeneral && (
        <p role="alert" className="flex max-w-[48ch] items-start gap-2 font-medium text-rojo">
          <Alerta className="mt-0.5 size-5 shrink-0" />
          {errorGeneral}
        </p>
      )}

      <div>
        <label htmlFor="ingreso-email" className="rotulo block text-[0.9375rem]">
          Email
        </label>
        <input
          ref={campoEmail}
          id="ingreso-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errores.email) setErrores((x) => ({ ...x, email: undefined }));
          }}
          aria-invalid={errores.email ? true : undefined}
          aria-describedby={errores.email ? "ingreso-email-error" : undefined}
          className="renglon mt-1"
        />
        {errores.email && <MensajeError id="ingreso-email-error" texto={errores.email} />}
      </div>

      {!restableciendo && (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="ingreso-clave" className="rotulo block text-[0.9375rem]">
              Contraseña
            </label>
            <button
              type="button"
              onClick={() => setVerClave((v) => !v)}
              aria-pressed={verClave}
              aria-controls="ingreso-clave"
              className="rotulo cursor-pointer text-[0.8125rem] underline decoration-naranja decoration-2 underline-offset-4"
            >
              {verClave ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <input
            id="ingreso-clave"
            name="clave"
            type={verClave ? "text" : "password"}
            autoComplete="current-password"
            value={clave}
            onChange={(e) => {
              setClave(e.target.value);
              if (errores.clave) setErrores((x) => ({ ...x, clave: undefined }));
            }}
            aria-invalid={errores.clave ? true : undefined}
            aria-describedby={errores.clave ? "ingreso-clave-error" : undefined}
            className="renglon mt-1"
          />
          {errores.clave && <MensajeError id="ingreso-clave-error" texto={errores.clave} />}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <button ref={botonIngresar} type="submit" className="placa" disabled={enviando}>
          {enviando ? (restableciendo ? "Enviando…" : "Ingresando…") : restableciendo ? "Enviar enlace" : "Ingresar"}
          {!enviando && <Flecha />}
        </button>
        <button
          type="button"
          onClick={() => cambiarModo(restableciendo ? "ingreso" : "restablecer")}
          className="cursor-pointer font-semibold underline decoration-naranja decoration-2 underline-offset-[0.2em]"
        >
          {restableciendo ? "Volver al ingreso" : "¿Olvidó su contraseña?"}
        </button>
      </div>
    </form>
  );
}
