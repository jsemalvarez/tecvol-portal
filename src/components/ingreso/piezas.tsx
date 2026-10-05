import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { IlustracionAtardecer } from "@/components/inicio/IlustracionAtardecer";
import { modoDatos } from "@/lib/datos/repositorios";
import { CUENTAS_DE_PRUEBA } from "@/lib/datos/local/autenticacion";

/** Cabecera de las páginas de acceso: la placa del logo lleva al inicio. */
function CabeceraIngreso({ derecha }: { derecha?: ReactNode }) {
  return (
    <header className="flex items-center gap-4">
      <Link href="/" className="flex min-w-0 items-center gap-4 no-underline">
        <span className="placa-logo">
          <Image src="/marca/tecvol-logo.png" alt="Tecvol, ir al inicio" width={1600} height={379} priority unoptimized className="h-7 w-auto lg:h-8" />
        </span>
        <span className="rotulo hidden truncate text-base font-semibold sm:block">Reparación de transformadores</span>
      </Link>
      <div className="ml-auto">
        {derecha ?? (
          <Link href="/" className="rotulo text-[0.9375rem] font-semibold">
            Volver al inicio
          </Link>
        )}
      </div>
    </header>
  );
}

/**
 * Esqueleto de las páginas de acceso: la cabecera, el contenido centrado y abajo el horizonte del pie del
 * inicio sobre su banda durazno. Sin `banda`, la banda queda como una franja de suelo.
 */
export function EsqueletoAcceso({ derecha, banda, children }: { derecha?: ReactNode; banda?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col bg-esmalte">
      <div className="mx-auto w-full max-w-[1500px] px-7 pt-8 sm:px-12 xl:px-24">
        <CabeceraIngreso derecha={derecha} />
      </div>
      {children}
      <IlustracionAtardecer className="block h-[110px] w-full sm:h-[150px]" />
      <div className="bg-durazno">
        {banda ? (
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-start justify-between gap-6 px-7 py-8 sm:px-12 xl:px-24">{banda}</div>
        ) : (
          <div className="h-8" />
        )}
      </div>
    </main>
  );
}

/** Quién crea las cuentas y qué hacer sin una. */
export function NotaCuentas({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-2 text-[0.9375rem] ${className}`}>
      <p>
        <strong className="font-semibold">¿No tiene cuenta?</strong> Las cuentas las crea el taller al registrar a su empresa.{" "}
        <Link href="/#consulta" className="font-semibold underline">
          Escríbanos desde el formulario de consulta
        </Link>
        .
      </p>
      <p>
        Para ver el estado de un equipo alcanza con su código:{" "}
        <Link href="/" className="font-semibold underline">
          consultar sin ingresar
        </Link>
        .
      </p>
    </div>
  );
}

/** En modo local, las cuentas de prueba para la demo. Borde punteado: es un dato provisorio. */
export function AvisoCuentasPrueba({ className = "" }: { className?: string }) {
  if (modoDatos !== "local") return null;
  return (
    <div className={`rounded-[0.25rem] border-2 border-dashed border-acero px-4 py-3 text-[0.9375rem] ${className}`}>
      <p className="rotulo text-[0.8125rem]">Modo local, sin Firebase · Cuentas de prueba</p>
      <ul className="mt-1.5 space-y-0.5">
        {CUENTAS_DE_PRUEBA.map((c) => (
          <li key={c.email}>
            <span className="font-semibold">{c.rol === "personal" ? "Personal" : "Cliente"}:</span> {c.email} · {c.clave}
          </li>
        ))}
      </ul>
    </div>
  );
}
