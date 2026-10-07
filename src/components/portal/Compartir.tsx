"use client";

import { useId, useRef, useState } from "react";
import { Etiqueta } from "@/components/panel/Etiqueta";
import { formatearCodigo } from "@/lib/dominio/codigo";
import type { EquipoCliente } from "@/lib/dominio/tipos";
import { nombreDe } from "./piezas";

/** En el celular, el menú de compartir del teléfono (WhatsApp, mail…); en la computadora, copiar. */
function usaMenuDelTelefono() {
  return typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Para pasarle el seguimiento de un equipo a otra persona, por ejemplo un operario: la etiqueta con
 * el QR, para mostrarla o imprimirla, y el enlace a la consulta pública. Quien lo abre ve lo mismo
 * que con el código.
 */
export function Compartir({ equipo, empresa }: { equipo: EquipoCliente; empresa: string }) {
  const enlace = `${window.location.origin}/seguimiento/${formatearCodigo(equipo.codigo)}`;
  const [telefono] = useState(usaMenuDelTelefono);
  const [aviso, setAviso] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  const id = useId();

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setAviso("Enlace copiado. Péguelo en el mensaje que quiera enviar.");
    } catch {
      campo.current?.select();
      setAviso("No se pudo copiar solo. El enlace quedó seleccionado: cópielo con Ctrl+C.");
    }
  }

  async function enviar() {
    if (!telefono) return copiar();
    try {
      await navigator.share({
        title: "Seguimiento de reparación · Tecvol",
        text: `${nombreDe(equipo)} · código ${formatearCodigo(equipo.codigo)}`,
        url: enlace,
      });
    } catch (error) {
      // Cerrar el menú sin elegir no es un error.
      if (!(error instanceof DOMException && error.name === "AbortError")) await copiar();
    }
  }

  return (
    <>
      <p className="mb-5 max-w-[48ch]">
        Quien abra el enlace o escanee el QR ve el estado de este equipo y la fecha de cada etapa, sin ingresar. No ve sus
        otros equipos.
      </p>
      <Etiqueta equipo={equipo} empresa={empresa}>
        <button type="button" onClick={enviar} className="placa">
          {telefono ? "Enviar enlace" : "Copiar enlace"}
        </button>
      </Etiqueta>
      <div className="mt-6">
        <label htmlFor={`${id}-enlace`} className="rotulo block text-[0.8125rem]">
          Enlace
        </label>
        <input
          ref={campo}
          id={`${id}-enlace`}
          readOnly
          value={enlace}
          onFocus={(e) => e.currentTarget.select()}
          className="renglon mt-0.5 w-full text-base"
        />
        <p role="status" className="mt-2 text-[0.9375rem] font-medium">
          {aviso}
        </p>
      </div>
    </>
  );
}
