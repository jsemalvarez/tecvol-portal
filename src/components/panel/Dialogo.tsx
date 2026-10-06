"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Alerta } from "@/components/iconos";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { ErrorDePanel, ServicioNoConfiguradoError, type MotivoErrorDePanel } from "@/lib/datos/repositorios";

/**
 * Ventana del panel: una placa atornillada sobre la página, con la banda gris del título. Se cierra
 * con "Cerrar" o con Escape; tocar afuera no la cierra, para no perder un formulario a medias.
 */
export function Dialogo({
  abierto,
  titulo,
  onCerrar,
  ancho = "max-w-[40rem]",
  children,
}: {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  ancho?: string;
  children: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  // Un cierre que pide la página (porque se abre otra ventana) no se avisa como si lo hubiera hecho la persona.
  const cierrePropio = useRef(false);
  const id = useId();

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    else if (!abierto && d.open) {
      cierrePropio.current = true;
      d.close();
    }
  }, [abierto]);

  return (
    <dialog
      ref={dialogo}
      onClose={() => {
        if (cierrePropio.current) cierrePropio.current = false;
        else onCerrar();
      }}
      aria-labelledby={id}
      className={`m-auto w-[calc(100%-2rem)] ${ancho} overflow-visible bg-transparent p-0 text-tinta backdrop:bg-tinta/50`}
    >
      {abierto && (
        <div className="marco max-h-[calc(100svh-2rem)] !overflow-y-auto">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 id={id} className="rotulo text-base">
              {titulo}
            </h2>
            <button type="button" onClick={() => dialogo.current?.close()} className="rotulo cursor-pointer text-base underline underline-offset-4">
              Cerrar
            </button>
          </div>
          <div className="marco-cuerpo">{children}</div>
        </div>
      )}
    </dialog>
  );
}

const MENSAJES: Record<MotivoErrorDePanel, string> = {
  "email-en-uso": "Ya hay una cuenta con ese email.",
  "email-invalido": "Revise el email: debe tener la forma nombre@empresa.com.ar.",
  "altas-deshabilitadas": "Firebase no permite crear cuentas desde la app. Habilítelo en la consola (vea el README).",
  permiso: "Su cuenta no tiene permiso para hacer este cambio.",
  conexion: "No se pudo conectar. Revise su conexión e intente de nuevo.",
  desconocido: "No se pudo guardar. Intente de nuevo en unos minutos.",
};

export function mensajeDeError(error: unknown) {
  if (error instanceof ErrorDePanel) return MENSAJES[error.motivo];
  if (error instanceof ServicioNoConfiguradoError) return "Firebase no está configurado para este entorno.";
  return MENSAJES.desconocido;
}

export function ErrorFormulario({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="flex max-w-[52ch] items-start gap-2 font-medium text-rojo">
      <Alerta className="mt-0.5 size-5 shrink-0" />
      {texto}
    </p>
  );
}

export function MensajeCampo({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="mt-2 flex items-start gap-2 text-[0.9375rem] font-medium text-rojo">
      <Alerta className="mt-0.5 size-[1.125rem] shrink-0" />
      {texto}
    </p>
  );
}
