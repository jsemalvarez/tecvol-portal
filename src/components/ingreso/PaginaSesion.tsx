"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { obtenerAutenticacion } from "@/lib/datos/repositorios";
import type { Rol, Sesion } from "@/lib/dominio/tipos";
import { destinoDe } from "./FormularioIngreso";
import { EsqueletoAcceso } from "./piezas";

/**
 * Destino provisorio después de ingresar, hasta que se construyan el portal y el panel. Sin sesión
 * vuelve a /ingresar; con la sesión del otro rol, va a su destino.
 */
export function PaginaSesion({ rol, titulo, texto }: { rol: Rol; titulo: string; texto: string }) {
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null | undefined>(undefined);

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

  useEffect(() => {
    if (sesion === null) router.replace("/ingresar");
    else if (sesion && sesion.rol !== rol) router.replace(destinoDe(sesion.rol));
  }, [sesion, rol, router]);

  async function salir() {
    const autenticacion = await obtenerAutenticacion();
    await autenticacion.salir();
  }

  const lista = sesion && sesion.rol === rol;

  return (
    <EsqueletoAcceso
      derecha={
        lista ? (
          <button type="button" onClick={salir} className="placa-secundaria">
            Salir
          </button>
        ) : null
      }
    >
      <section
        aria-labelledby="titulo-sesion"
        aria-busy={!lista}
        className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col justify-center px-7 py-12"
      >
        {lista ? (
          <>
            <p className="rotulo text-[0.9375rem] text-grafito">Ingresó como {sesion.email}</p>
            <h1 id="titulo-sesion" className="mt-2 font-cartel text-[3rem] font-bold leading-[0.92] sm:text-[4rem]">
              {titulo}
            </h1>
            <p className="mt-6 flex max-w-[56ch] flex-wrap items-center gap-x-3 gap-y-2 text-lg">
              <span className="tarjeta-bloqueo">En preparación</span>
              {texto}
            </p>
          </>
        ) : (
          <p id="titulo-sesion" className="text-lg">
            Verificando la sesión…
          </p>
        )}
      </section>
    </EsqueletoAcceso>
  );
}
