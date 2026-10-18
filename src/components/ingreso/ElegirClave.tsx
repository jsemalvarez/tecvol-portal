"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alerta, Flecha } from "@/components/iconos";
import { ErrorDeEnlace, modoDatos, obtenerAutenticacion, type MotivoErrorDeEnlace } from "@/lib/datos/repositorios";
import { destinoDe, FormularioIngreso } from "./FormularioIngreso";
import { EsqueletoAcceso } from "./piezas";

const LARGO_MINIMO = 8;

type SinServir = Exclude<MotivoErrorDeEnlace, "debil"> | "incompleto";

type Estado =
  | { fase: "verificando" }
  | { fase: "elegir"; email: string }
  | { fase: "sin-servir"; motivo: SinServir }
  | { fase: "guardada"; email: string };

/** Por qué el enlace no sirve y qué hacer. La primera frase va destacada. */
const SIN_SERVIR: Record<SinServir, [string, string]> = {
  vencido: ["El enlace venció.", "Por seguridad dura poco tiempo. Pida uno nuevo y úselo apenas le llegue."],
  usado: ["Este enlace ya no sirve.", "Ya se usó, o lo reemplazó uno más nuevo: cada email anula el anterior. Use el último que recibió o pida otro."],
  incompleto: ["El enlace está incompleto.", "Ábralo de nuevo desde el email o pida uno nuevo."],
  deshabilitada: ["La cuenta está deshabilitada.", "Comuníquese con el taller."],
  conexion: ["No se pudo verificar el enlace.", "Revise su conexión y vuelva a abrirlo."],
  desconocido: ["No se pudo verificar el enlace.", "Pida uno nuevo."],
};

const motivoDe = (error: unknown): MotivoErrorDeEnlace => (error instanceof ErrorDeEnlace ? error.motivo : "desconocido");

/**
 * Página a la que lleva el email para elegir la contraseña (la acción de los emails de Firebase apunta
 * acá). Firebase agrega `mode=resetPassword` y el código del enlace en `oobCode`. Si el enlace venció o
 * ya no sirve, lo dice y deja pedir otro en el mismo lugar; si sirve, guarda la contraseña e ingresa.
 */
export function ElegirClave() {
  const parametros = useSearchParams();
  const codigo = parametros.get("oobCode");
  const modo = parametros.get("mode");
  const valido = !!codigo && (!modo || modo === "resetPassword");
  const [estado, setEstado] = useState<Estado>(valido ? { fase: "verificando" } : { fase: "sin-servir", motivo: "incompleto" });

  useEffect(() => {
    if (!valido || !codigo) return;
    let activo = true;
    obtenerAutenticacion()
      .then((autenticacion) => autenticacion.verificarEnlaceClave(codigo))
      .then(
        (email) => activo && setEstado({ fase: "elegir", email }),
        (error) => {
          const motivo = motivoDe(error);
          if (activo) setEstado({ fase: "sin-servir", motivo: motivo === "debil" ? "desconocido" : motivo });
        },
      );
    return () => {
      activo = false;
    };
  }, [codigo, valido]);

  let contenido;
  if (estado.fase === "verificando") {
    contenido = (
      <p role="status" className="text-lg">
        Verificando el enlace…
      </p>
    );
  } else if (estado.fase === "elegir" && codigo) {
    contenido = (
      <FormularioClave
        codigo={codigo}
        email={estado.email}
        onGuardada={() => setEstado({ fase: "guardada", email: estado.email })}
        onSinServir={(motivo) => setEstado({ fase: "sin-servir", motivo })}
      />
    );
  } else if (estado.fase === "guardada") {
    contenido = (
      <div role="status" className="flex flex-col items-start gap-5">
        <p className="max-w-[44ch] text-lg">
          Se guardó la contraseña de <strong className="font-semibold">{estado.email}</strong>. Ya puede ingresar con ella.
        </p>
        {modoDatos === "local" && (
          <p className="max-w-[44ch] text-[0.9375rem] text-grafito">Con datos de prueba la contraseña no cambia: entre con la de prueba.</p>
        )}
        <Link href="/ingresar" className="placa">
          Ingresar
          <Flecha />
        </Link>
      </div>
    );
  } else if (estado.fase === "sin-servir") {
    const [titulo, detalle] = SIN_SERVIR[estado.motivo];
    contenido = (
      <div className="flex flex-col gap-8">
        <p role="alert" className="flex max-w-[48ch] items-start gap-2 text-lg">
          <Alerta className="mt-1 size-5 shrink-0 text-rojo" />
          <span>
            <strong className="font-semibold">{titulo}</strong> {detalle}
          </span>
        </p>
        {estado.motivo === "conexion" ? (
          <button type="button" onClick={() => window.location.reload()} className="placa-secundaria self-start">
            Reintentar
          </button>
        ) : estado.motivo !== "deshabilitada" ? (
          <FormularioIngreso modoInicial="restablecer" />
        ) : null}
      </div>
    );
  }

  return (
    <EsqueletoAcceso>
      <section aria-labelledby="titulo-clave" className="mx-auto flex w-full max-w-[34rem] flex-1 flex-col justify-center px-7 py-12">
        <p className="rotulo text-[0.9375rem] text-grafito">Portal de clientes · Panel del taller</p>
        <h1 id="titulo-clave" className="mt-2 font-cartel text-[3rem] font-bold leading-[0.92] sm:text-[4rem]">
          Elegir contraseña
        </h1>
        <div className="mt-8">{contenido}</div>
      </section>
    </EsqueletoAcceso>
  );
}

/** La contraseña nueva. Al guardarla, ingresa con ella y va al portal o al panel según la cuenta. */
function FormularioClave({
  codigo,
  email,
  onGuardada,
  onSinServir,
}: {
  codigo: string;
  email: string;
  onGuardada: () => void;
  onSinServir: (motivo: SinServir) => void;
}) {
  const router = useRouter();
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setErrorGeneral(null);
    if (clave.length < LARGO_MINIMO) {
      setErrorClave(clave ? `Use al menos ${LARGO_MINIMO} caracteres.` : "Escriba la contraseña nueva.");
      campo.current?.focus();
      return;
    }
    setErrorClave(null);
    setGuardando(true);
    const autenticacion = await obtenerAutenticacion();
    try {
      await autenticacion.elegirClave(codigo, clave);
    } catch (error) {
      const motivo = motivoDe(error);
      setGuardando(false);
      if (motivo === "debil") {
        setErrorClave("Elija una contraseña más segura: más larga, con letras y números.");
        campo.current?.focus();
      } else if (motivo === "conexion") {
        setErrorGeneral("No se pudo conectar. Revise su conexión e intente de nuevo.");
      } else {
        onSinServir(motivo);
      }
      return;
    }
    try {
      const sesion = await autenticacion.ingresar(email, clave);
      router.replace(destinoDe(sesion.rol));
    } catch {
      // La contraseña ya quedó guardada: si el ingreso falla, que entre desde /ingresar.
      onGuardada();
    }
  }

  return (
    <form onSubmit={guardar} noValidate aria-busy={guardando} className="flex flex-col gap-7">
      <p className="max-w-[44ch]">
        Cuenta de <strong className="font-semibold">{email}</strong>. Elija la contraseña con la que va a ingresar al sitio.
      </p>
      {errorGeneral && (
        <p role="alert" className="flex max-w-[48ch] items-start gap-2 font-medium text-rojo">
          <Alerta className="mt-0.5 size-5 shrink-0" />
          {errorGeneral}
        </p>
      )}
      {/* Para que el administrador de contraseñas del navegador la guarde con el email correcto. */}
      <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="clave-nueva" className="rotulo block text-[0.9375rem]">
            Contraseña nueva
          </label>
          <button
            type="button"
            onClick={() => setVerClave((v) => !v)}
            aria-pressed={verClave}
            aria-controls="clave-nueva"
            className="rotulo cursor-pointer text-[0.8125rem] underline decoration-naranja decoration-2 underline-offset-4"
          >
            {verClave ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <input
          ref={campo}
          id="clave-nueva"
          name="clave"
          type={verClave ? "text" : "password"}
          autoComplete="new-password"
          autoFocus
          value={clave}
          onChange={(e) => {
            setClave(e.target.value);
            if (errorClave) setErrorClave(null);
          }}
          aria-invalid={errorClave ? true : undefined}
          aria-describedby="clave-nueva-ayuda"
          className="renglon mt-1"
        />
        {errorClave ? (
          <p id="clave-nueva-ayuda" className="mt-2 flex items-start gap-2 text-[0.9375rem] font-medium text-rojo">
            <Alerta className="mt-0.5 size-[1.125rem] shrink-0" />
            {errorClave}
          </p>
        ) : (
          <p id="clave-nueva-ayuda" className="mt-2 text-[0.9375rem] text-grafito">
            Al menos {LARGO_MINIMO} caracteres.
          </p>
        )}
      </div>
      <button type="submit" className="placa self-start" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar e ingresar"}
        {!guardando && <Flecha />}
      </button>
    </form>
  );
}
