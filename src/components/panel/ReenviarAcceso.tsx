"use client";

import { useState } from "react";
import type { ApiPanel } from "./PaginaPanel";

/**
 * Envía otra vez el email para elegir la contraseña. El enlace vence en poco tiempo y muchas veces el
 * cliente lo encuentra tarde, en la carpeta de spam: así no hace falta que lo pida desde el ingreso.
 */
export function ReenviarAcceso({ api, email, className }: { api: ApiPanel; email: string; className: string }) {
  const [enviando, setEnviando] = useState(false);

  async function reenviar() {
    setEnviando(true);
    await api.reenviarAcceso(email);
    setEnviando(false);
  }

  return (
    <button
      type="button"
      onClick={reenviar}
      disabled={enviando}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
      aria-label={`Reenviar a ${email} el email para elegir la contraseña`}
    >
      {enviando ? "Enviando…" : "Reenviar email de acceso"}
    </button>
  );
}
