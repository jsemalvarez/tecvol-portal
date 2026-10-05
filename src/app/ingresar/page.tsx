import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ingresar · Tecvol",
  robots: { index: false, follow: false },
};

/** Lugar reservado para el acceso de clientes y personal, que se construye en la próxima etapa. */
export default function PaginaIngresar() {
  return (
    <main className="mx-auto flex min-h-svh max-w-[1680px] p-2.5 sm:p-4 lg:p-6">
      <section
        aria-labelledby="titulo-ingresar"
        className="flex flex-1 flex-col overflow-hidden rounded-cartel border-[5px] border-acero bg-blanco shadow-cartel lg:border-[6px]"
      >
        <header className="sobre-tinta flex items-center bg-acero px-4 py-3 text-blanco sm:px-6 lg:px-8 lg:py-4">
          <Link href="/" className="placa-logo no-underline">
            <Image src="/marca/tecvol-logo.png" alt="Tecvol" width={1600} height={379} priority unoptimized className="h-7 w-auto lg:h-9" />
          </Link>
        </header>
        <div className="flex flex-1 flex-col items-start justify-center gap-6 px-5 py-12 sm:px-10 lg:px-16">
          <h1 id="titulo-ingresar" className="font-cartel text-[2.75rem] font-bold leading-[0.95] sm:text-[3.5rem]">
            Acceso al portal
          </h1>
          <p className="max-w-[48ch] text-lg">
            El ingreso para clientes y personal del taller se habilita en la próxima etapa de esta demo. Mientras tanto,
            puede consultar el estado de un equipo con su código de seguimiento.
          </p>
          <span className="tarjeta-bloqueo">En preparación</span>
          <Link href="/" className="placa mt-2">
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
