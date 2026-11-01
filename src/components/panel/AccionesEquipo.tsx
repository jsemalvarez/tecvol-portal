"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Desplegar } from "@/components/iconos";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import type { ApiPanel } from "./PaginaPanel";

/** Una acción sobre un equipo: un enlace a otra página o algo que pasa en esta (abrir una ventana). */
export interface AccionEquipo {
  id: string;
  texto: string;
  href?: string;
  alElegir?: () => void;
}

/**
 * Lo que se puede hacer con un equipo, aparte de cambiar su estado, en un solo lugar: lo usan el menú
 * "Más" de la lista y la ficha del equipo. Una acción nueva se agrega acá y aparece en los dos.
 */
export function accionesDe(equipo: EquipoTaller, api: ApiPanel, { conFicha = true }: { conFicha?: boolean } = {}): AccionEquipo[] {
  const codigo = equipo.codigo;
  return [
    ...(conFicha ? [{ id: "ficha", texto: "Ver la O.T.", href: `/panel/equipo?codigo=${codigo}` }] : []),
    { id: "editar", texto: "Editar datos de la O.T.", href: `/panel/editar?codigo=${codigo}` },
    { id: "informe", texto: "Informe de diagnóstico", href: `/panel/informe?codigo=${codigo}` },
    { id: "datos-taller", texto: "Datos del taller", href: `/panel/datos-taller?codigo=${codigo}` },
    { id: "trafo", texto: "Ver el transformador", href: `/panel/transformador?id=${equipo.trafo}` },
    { id: "etiqueta", texto: "Etiqueta", alElegir: () => api.abrirEtiqueta(equipo) },
  ];
}

const DISTANCIA = 6;
const BORDE = 8;

/**
 * Botón "Más" que despliega acciones. El menú es un popover del navegador: se dibuja por encima de todo
 * (los marcos recortan lo que sobresale), se cierra con Esc o tocando afuera y devuelve el foco al botón.
 * Se ubica debajo del botón, o arriba si abajo no entra; se maneja con las flechas.
 */
export function MenuAcciones({ etiqueta, acciones, className = "" }: { etiqueta: string; acciones: AccionEquipo[]; className?: string }) {
  const id = useId();
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const elemento = menu.current;
    if (!elemento) return;
    const cerrar = () => elemento.hidePopover();
    // Hasta que se ubica junto al botón, el menú abierto no se ve: así no aparece un instante en otro lado.
    const antesDeCambiar = (evento: Event) => {
      if ((evento as ToggleEvent).newState === "open") elemento.style.visibility = "hidden";
    };
    const alCambiar = (evento: Event) => {
      const abre = (evento as ToggleEvent).newState === "open";
      setAbierto(abre);
      if (!abre) {
        window.removeEventListener("scroll", cerrar, true);
        window.removeEventListener("resize", cerrar);
        return;
      }
      ubicar();
      elemento.style.visibility = "";
      elemento.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
      // Si la página se mueve, el menú quedaría flotando lejos del botón: se cierra.
      window.addEventListener("scroll", cerrar, true);
      window.addEventListener("resize", cerrar);
    };
    elemento.addEventListener("beforetoggle", antesDeCambiar);
    elemento.addEventListener("toggle", alCambiar);
    return () => {
      elemento.removeEventListener("beforetoggle", antesDeCambiar);
      elemento.removeEventListener("toggle", alCambiar);
      window.removeEventListener("scroll", cerrar, true);
      window.removeEventListener("resize", cerrar);
    };
  }, []);

  function ubicar() {
    const b = boton.current?.getBoundingClientRect();
    const m = menu.current;
    if (!b || !m) return;
    const alto = m.offsetHeight;
    const ancho = m.offsetWidth;
    const entraAbajo = b.bottom + DISTANCIA + alto <= window.innerHeight - BORDE;
    const top = entraAbajo || b.top - DISTANCIA - alto < BORDE ? b.bottom + DISTANCIA : b.top - DISTANCIA - alto;
    const left = Math.max(BORDE, Math.min(b.right - ancho, window.innerWidth - ancho - BORDE));
    m.style.top = `${top}px`;
    m.style.left = `${left}px`;
  }

  function moverFoco(evento: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const actual = items.indexOf(document.activeElement as HTMLElement);
    const destino = { ArrowDown: actual + 1, ArrowUp: actual - 1, Home: 0, End: items.length - 1 }[evento.key];
    if (evento.key === "Tab") return menu.current?.hidePopover();
    if (destino === undefined) return;
    evento.preventDefault();
    items[(destino + items.length) % items.length]?.focus();
  }

  const item =
    "block w-full cursor-pointer rounded-[0.125rem] px-3.5 py-2.5 text-left text-[0.9375rem] font-semibold text-tinta no-underline hover:bg-esmalte focus-visible:bg-esmalte focus-visible:outline-none";

  return (
    <>
      <button
        ref={boton}
        type="button"
        popoverTarget={id}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={id}
        aria-label={etiqueta}
        className={`placa-secundaria gap-1.5 whitespace-nowrap ${className}`}
      >
        Más
        <Desplegar className={`size-4 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>
      <div
        ref={menu}
        id={id}
        popover="auto"
        role="menu"
        aria-label={etiqueta}
        onKeyDown={moverFoco}
        className="m-0 min-w-[15rem] rounded-[0.25rem] border-2 border-tinta bg-blanco p-1.5 shadow-placa [inset:auto]"
      >
        {acciones.map((accion) =>
          accion.href ? (
            <Link key={accion.id} href={accion.href} role="menuitem" onClick={() => menu.current?.hidePopover()} className={item}>
              {accion.texto}
            </Link>
          ) : (
            <button
              key={accion.id}
              type="button"
              role="menuitem"
              onClick={() => {
                menu.current?.hidePopover();
                accion.alElegir?.();
              }}
              className={item}
            >
              {accion.texto}
            </button>
          ),
        )}
      </div>
    </>
  );
}
