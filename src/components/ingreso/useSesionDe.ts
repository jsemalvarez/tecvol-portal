"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { obtenerAutenticacion } from "@/lib/datos/repositorios";
import { esPersonal } from "@/lib/dominio/roles";
import type { Sesion } from "@/lib/dominio/tipos";
import { destinoDe } from "./FormularioIngreso";

/** Las dos partes privadas del sitio: el panel es del personal (cualquier rol); el portal, de los clientes. */
export type Area = "panel" | "portal";

const esDe = (area: Area, sesion: Sesion) => (area === "panel") === esPersonal(sesion.rol);

/**
 * Sesión de una página privada. Sin sesión vuelve a /ingresar; con una que no es de esta área, va a su destino.
 * Devuelve la sesión solo cuando es del área pedida (`null` mientras se verifica o se redirige).
 */
export function useSesionDe(area: Area) {
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
    else if (sesion && !esDe(area, sesion)) router.replace(destinoDe(sesion.rol));
  }, [sesion, area, router]);

  const salir = useCallback(async () => {
    const autenticacion = await obtenerAutenticacion();
    await autenticacion.salir();
  }, []);

  return { sesion: sesion && esDe(area, sesion) ? sesion : null, salir };
}
