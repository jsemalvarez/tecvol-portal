"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { obtenerAutenticacion } from "@/lib/datos/repositorios";
import type { Rol, Sesion } from "@/lib/dominio/tipos";
import { destinoDe } from "./FormularioIngreso";

/**
 * Sesión de una página privada. Sin sesión vuelve a /ingresar; con la de otro rol, va a su destino.
 * Devuelve la sesión solo cuando es del rol pedido (`null` mientras se verifica o se redirige).
 */
export function useSesionDe(rol: Rol) {
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

  const salir = useCallback(async () => {
    const autenticacion = await obtenerAutenticacion();
    await autenticacion.salir();
  }, []);

  return { sesion: sesion?.rol === rol ? sesion : null, salir };
}
