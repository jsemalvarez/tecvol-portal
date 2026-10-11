"use client";

import { useEffect } from "react";

/** Avisa antes de salir de la página (enlaces, recarga o cierre) si hay datos sin guardar. */
export function useAvisoAlSalir(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const antesDeDescargar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    // En captura, antes de que el enlace de Next navegue: si la persona se queda, el clic no sigue.
    const alHacerClic = (evento: MouseEvent) => {
      const enlace = (evento.target as Element | null)?.closest?.("a[href]");
      if (!enlace || enlace.getAttribute("target") === "_blank") return;
      if (!window.confirm("Hay datos sin guardar. ¿Salir igual y perderlos?")) {
        evento.preventDefault();
        evento.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", antesDeDescargar);
    document.addEventListener("click", alHacerClic, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeDescargar);
      document.removeEventListener("click", alHacerClic, true);
    };
  }, [activo]);
}
