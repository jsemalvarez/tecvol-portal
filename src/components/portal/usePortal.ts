"use client";

import { useCallback, useEffect, useState } from "react";
import { useSesionDe } from "@/components/ingreso/useSesionDe";
import { obtenerPortal } from "@/lib/datos/repositorios";
import type { PortalCliente, Sesion } from "@/lib/dominio/tipos";

export type EstadoPortal =
  | { fase: "verificando" }
  | { fase: "cargando"; sesion: Sesion }
  | { fase: "sin-empresa"; sesion: Sesion }
  | { fase: "error"; sesion: Sesion }
  | { fase: "listo"; sesion: Sesion; portal: PortalCliente };

/** Sesión del cliente y datos del portal: su empresa y sus equipos. */
export function usePortal() {
  const { sesion, salir } = useSesionDe("cliente");
  const [carga, setCarga] = useState<
    { uid: string; fase: "sin-empresa" | "error" } | { uid: string; fase: "listo"; portal: PortalCliente } | null
  >(null);
  const [intento, setIntento] = useState(0);
  const uid = sesion?.uid ?? null;

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

  let estado: EstadoPortal = { fase: "verificando" };
  if (sesion) {
    if (!carga || carga.uid !== sesion.uid) estado = { fase: "cargando", sesion };
    else if (carga.fase === "listo") estado = { fase: "listo", sesion, portal: carga.portal };
    else estado = { fase: carga.fase, sesion };
  }

  return { estado, reintentar, salir };
}
