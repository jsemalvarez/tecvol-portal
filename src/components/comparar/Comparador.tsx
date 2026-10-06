"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Selector flotante para comparar versiones de una página. Temporal: se borra al elegir una. */
export function Comparador({ versiones }: { versiones: { href: string; nombre: string }[] }) {
  const ruta = usePathname();
  return (
    <nav
      aria-label="Comparar diseños"
      className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-1.5 rounded-[0.25rem] border-2 border-acero bg-blanco p-1.5 shadow-placa"
    >
      <span className="rotulo px-2 text-[0.8125rem]">Diseño</span>
      {versiones.map((v, i) => {
        const actual = ruta === v.href;
        return (
          <Link
            key={v.href}
            href={v.href}
            aria-current={actual ? "page" : undefined}
            className={`rotulo rounded-[0.125rem] px-2.5 py-1.5 text-[0.8125rem] no-underline ${actual ? "bg-naranja text-tinta" : "hover:bg-esmalte"}`}
          >
            {i + 1} · {v.nombre}
          </Link>
        );
      })}
    </nav>
  );
}
