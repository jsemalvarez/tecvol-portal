"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { destinoDe } from "@/components/ingreso/FormularioIngreso";
import { obtenerAutenticacion, obtenerPortal } from "@/lib/datos/repositorios";
import type { PortalCliente, Sesion } from "@/lib/dominio/tipos";

export type EstadoPortal =
  | { fase: "verificando" }
  | { fase: "cargando"; sesion: Sesion }
  | { fase: "sin-empresa"; sesion: Sesion }
  | { fase: "error"; sesion: Sesion }
  | { fase: "listo"; sesion: Sesion; portal: PortalCliente };

/**
 * Sesión y datos del portal. Sin sesión vuelve a /ingresar y con la del personal va al panel;
 * con la de un cliente, carga su empresa y sus equipos.
 */
export function usePortal() {
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null | undefined>(undefined);
  const [carga, setCarga] = useState<
    { uid: string; fase: "sin-empresa" | "error" } | { uid: string; fase: "listo"; portal: PortalCliente } | null
  >(null);
  const [intento, setIntento] = useState(0);

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
    else if (sesion && sesion.rol !== "cliente") router.replace(destinoDe(sesion.rol));
  }, [sesion, router]);

  const uid = sesion?.rol === "cliente" ? sesion.uid : null;

  useEffect(() => {
    if (!uid) return;
    let activo = true;
    obtenerPortal()
      .then((repositorio) => repositorio.obtenerPortal(uid))
      .then((portal) => {
        if (activo) setCarga(portal ? { uid, fase: "listo", portal } : { uid, fase: "sin-empresa" });
      })
      .catch(() => {
        if (activo) setCarga({ uid, fase: "error" });
      });
    return () => {
      activo = false;
    };
  }, [uid, intento]);

  const reintentar = useCallback(() => {
    setCarga(null);
    setIntento((n) => n + 1);
  }, []);

  const salir = useCallback(async () => {
    const autenticacion = await obtenerAutenticacion();
    await autenticacion.salir();
  }, []);

  let estado: EstadoPortal = { fase: "verificando" };
  if (sesion && uid) {
    if (!carga || carga.uid !== uid) estado = { fase: "cargando", sesion };
    else if (carga.fase === "listo") estado = { fase: "listo", sesion, portal: carga.portal };
    else estado = { fase: carga.fase, sesion };
  }

  return { estado, reintentar, salir };
}
