"use client";

import { useEffect, type ReactNode } from "react";
import { useInstalacion } from "@/lib/instalacion";

/*
 * Convite de instalación: una placa de esmalte que aparece abajo a los tres segundos,
 * se descarta por siete días y no vuelve una vez que la app está instalada.
 * También registra el service worker, que en desarrollo queda apagado para no
 * servir pantallas viejas encima de la recarga en caliente.
 */

function Identificacion() {
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/android-chrome-192x192.png" alt="" width={44} height={44} className="size-11 rounded-full" />
      <div>
        <p className="rotulo text-lg">Tecvol Transformadores</p>
        <p className="text-sm text-grafito">Pantalla de inicio</p>
      </div>
    </div>
  );
}

function Placa({ titulo, onDescartar, children }: { titulo: string; onDescartar: () => void; children: ReactNode }) {
  return (
    <div
      role="dialog"
      aria-labelledby="convite-titulo"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-(--radius-placa) border-t-[6px] border-naranja bg-blanco p-5 shadow-placa sm:bottom-6"
    >
      <div className="flex items-start justify-between gap-4">
        <Identificacion />
        <button
          type="button"
          onClick={onDescartar}
          aria-label="Cerrar"
          className="-m-2 grid size-11 shrink-0 place-items-center text-grafito hover:text-tinta"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <p id="convite-titulo" className="mt-4">
        {titulo}
      </p>
      {children}
    </div>
  );
}

export function Instalar() {
  const { sePuedeInstalar, esIOS, yaInstalada, mostrar, instalar, descartar } = useInstalacion();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      /* Sin service worker la app sigue funcionando; solo pierde la página sin conexión. */
    });
  }, []);

  if (yaInstalada || !mostrar) return null;

  if (sePuedeInstalar) {
    return (
      <Placa titulo="Instálela en su dispositivo: abre en pantalla propia, sin la barra del navegador." onDescartar={descartar}>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button type="button" onClick={descartar} className="min-h-11 px-3 font-semibold text-grafito hover:text-tinta">
            Ahora no
          </button>
          <button type="button" onClick={instalar} className="placa-banda">
            Instalar
          </button>
        </div>
      </Placa>
    );
  }

  if (esIOS) {
    return (
      <Placa titulo="Tres pasos, una sola vez." onDescartar={descartar}>
        <ol className="mt-3 space-y-2">
          <li>
            <span className="rotulo mr-2 text-grafito">01</span>Toque <strong>Compartir</strong> en la barra de Safari.
          </li>
          <li>
            <span className="rotulo mr-2 text-grafito">02</span>Elija <strong>Agregar a pantalla de inicio</strong>.
          </li>
          <li>
            <span className="rotulo mr-2 text-grafito">03</span>Confirme con <strong>Agregar</strong>.
          </li>
        </ol>
      </Placa>
    );
  }

  return null;
}
