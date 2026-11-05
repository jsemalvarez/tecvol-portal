"use client";

import type { ReactNode } from "react";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { formatearFecha } from "@/lib/dominio/fechas";
import { numeroParaCampo } from "@/lib/dominio/placa";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { ordenParaEtiqueta } from "@/lib/dominio/trafo";
import { CodigoQR } from "./Etiqueta";

/** Las dos etiquetas que imprime el taller para cada O.T. */
export type ClaseEtiqueta = "externa" | "interna";

export const TITULO_ETIQUETA: Record<ClaseEtiqueta, string> = {
  externa: "Etiqueta externa",
  interna: "Etiqueta interna",
};

/**
 * La etiqueta a tamaño real con su botón de imprimir: al imprimir sale solo ella, arriba a la izquierda de la
 * hoja (ver `.impresion`). En una pantalla angosta se corre de costado en lugar de achicarse.
 */
function VistaEtiqueta({ descripcion, nota, children }: { descripcion: string; nota?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-5">
      <p>{descripcion}</p>
      <div className="max-w-full overflow-x-auto">{children}</div>
      {nota && <p className="text-[0.9375rem] leading-snug text-grafito">{nota}</p>}
      <button type="button" onClick={() => window.print()} className="placa">
        Imprimir etiqueta
      </button>
    </div>
  );
}

/** La que va pegada en el transformador, a la vista: la razón social, el QR a la consulta pública y el código. */
export function EtiquetaExterna({ codigo }: { codigo: string }) {
  const origen = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <VistaEtiqueta descripcion="Se pega en el transformador. El QR abre la consulta pública del estado.">
      <div className="impresion flex h-[64mm] w-[50mm] flex-col items-center justify-between rounded-[2mm] border border-tinta bg-blanco py-[2.5mm] text-tinta">
        <p className="text-[4mm] font-bold leading-none tracking-[0.03em] underline underline-offset-[0.8mm]">TECVOL S.R.L.</p>
        <CodigoQR valor={`${origen}/seguimiento/${codigo}`} className="w-[46mm]" />
        <p className="text-[6.5mm] font-bold leading-none tracking-[0.03em]">{formatearCodigo(codigo)}</p>
      </div>
    </VistaEtiqueta>
  );
}

/** El símbolo de tierra de "AT/tierra" y "BT/tierra", como lo dibuja el taller. */
function Tierra() {
  return (
    <svg viewBox="0 0 12 13" role="img" aria-label="tierra" className="inline-block h-[3.4mm] w-[3.1mm] align-[-0.3mm]">
      <path d="M6 0v6M.5 6h11M2.5 9h7M4.5 12h3" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

const CELDA = "border border-tinta p-0 text-center align-middle";
const ROTULO = "rotulo text-[4mm]";

/** La letra de un dato: el nombre largo de una empresa entra achicándola, en lugar de cortarse. */
const tamanoDato = (valor = "") => (valor.length > 60 ? "text-[2.7mm]" : valor.length > 34 ? "text-[3.5mm]" : "text-[4.4mm]");

/**
 * La que acompaña al transformador en el taller cuando se desarma, según la nota del jefe de taller y con sus
 * palabras: los datos para reconocerlo a la izquierda y, a la derecha, las mediciones de aislación y de relación
 * de transformación, que se completan a mano. Lo que no está cargado sale en blanco, para escribirlo.
 */
export function EtiquetaInterna({ equipo, empresa }: { equipo: EquipoTaller; empresa: string }) {
  const potencia = equipo.placa?.potencia;
  const ingreso = equipo.etapas.ingresado;
  const datos: { nombre: string; valor?: string; falta?: string }[] = [
    { nombre: "OT", valor: ordenParaEtiqueta(equipo), falta: equipo.numeroOrdenTemporal ? "OT (la que tiene es temporal)" : undefined },
    { nombre: "Marca", valor: equipo.placa?.fabricante },
    { nombre: "Potencia", valor: potencia == null ? undefined : `${numeroParaCampo(potencia)} kVA` },
    { nombre: "N.º fábrica", valor: equipo.serie },
    { nombre: "Historial T", valor: equipo.numeroT ?? equipo.numeroTIngreso },
    { nombre: "F. ingreso", valor: ingreso && formatearFecha(ingreso) },
    { nombre: "F. compromiso", valor: equipo.compromiso && formatearFecha(equipo.compromiso) },
    { nombre: "Cliente", valor: empresa },
  ];
  const faltan = datos.filter((d) => !d.valor).map((d) => d.falta ?? d.nombre);

  return (
    <VistaEtiqueta
      descripcion="Acompaña al transformador en el taller cuando se desarma. Las mediciones se completan a mano."
      nota={
        faltan.length > 0
          ? `Sin cargar: ${faltan.join(", ")}. ${faltan.length === 1 ? "Queda en blanco, para escribirlo" : "Quedan en blanco, para escribirlos"} a mano.`
          : undefined
      }
    >
      <div className="impresion grid h-[105mm] w-[148mm] grid-cols-[70mm_minmax(0,1fr)] grid-rows-1 overflow-hidden border border-tinta bg-blanco text-tinta">
        <dl className="grid min-h-0 grid-rows-8 border-r-2 border-tinta">
          {datos.map(({ nombre, valor }) => (
            <div key={nombre} className="grid min-h-0 grid-cols-[26.5mm_minmax(0,1fr)] items-center gap-[1.5mm] overflow-hidden border-b border-tinta px-[2mm] last:border-b-0">
              <dt className={ROTULO}>{nombre}</dt>
              <dd className={`break-words font-bold leading-[1.1] ${tamanoDato(valor)}`}>{valor}</dd>
            </div>
          ))}
        </dl>
        <table className="h-full w-full table-fixed border-collapse border-hidden">
          <colgroup>
            <col className="w-[17mm]" />
          </colgroup>
          <thead>
            <tr className="h-[11.5mm]">
              <td className={CELDA} />
              <th scope="col" className={`${CELDA} ${ROTULO}`}>
                AT/
                <Tierra />
              </th>
              <th scope="col" className={`${CELDA} ${ROTULO}`}>
                BT/
                <Tierra />
              </th>
              <th scope="col" className={`${CELDA} ${ROTULO}`}>
                AT/BT
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="h-[11.5mm]">
              <th scope="row" className={`${CELDA} rotulo text-[3.4mm]`}>
                Aislación
              </th>
              <td className={CELDA} />
              <td className={CELDA} />
              <td className={CELDA} />
            </tr>
            <tr className="h-[11.5mm]">
              <th scope="colgroup" colSpan={4} className={`${CELDA} ${ROTULO} border-t-2`}>
                Relación de transformación
              </th>
            </tr>
            <tr className="h-[11.5mm]">
              <td className={CELDA} />
              <th scope="col" className={`${CELDA} ${ROTULO}`}>
                U
              </th>
              <th scope="col" className={`${CELDA} ${ROTULO}`}>
                V
              </th>
              <th scope="col" className={`${CELDA} ${ROTULO}`}>
                W
              </th>
            </tr>
            {[1, 2, 3, 4, 5].map((punto) => (
              <tr key={punto} className="h-[11.5mm]">
                <th scope="row" className={`${CELDA} ${ROTULO}`}>
                  {punto})
                </th>
                <td className={CELDA} />
                <td className={CELDA} />
                <td className={CELDA} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </VistaEtiqueta>
  );
}
