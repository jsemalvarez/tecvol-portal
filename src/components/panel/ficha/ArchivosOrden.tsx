"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { abrirEnPestana } from "@/components/abrirArchivo";
import { Alerta } from "@/components/iconos";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { archivosActivos, formatearTamano, revisarPdf, TAMANO_MAXIMO, type MotivoArchivoRechazado } from "@/lib/dominio/archivos";
import { formatearFecha } from "@/lib/dominio/fechas";
import type { ArchivoOrden, EquipoTaller } from "@/lib/dominio/tipos";
import { mensajeDeError } from "../Dialogo";
import { useAvisoAlSalir } from "../equipo/useAvisoAlSalir";
import type { ApiPanel } from "../PaginaPanel";

const enlace = "font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/** Un PDF que se está subiendo, o que no se pudo subir (con el motivo). */
interface Subida {
  clave: string;
  nombre: string;
  fraccion: number;
  error?: string;
}

const RECHAZOS: Record<MotivoArchivoRechazado, (archivo: File) => string> = {
  vacio: () => "Está vacío.",
  "muy-grande": (archivo) => `Pesa ${formatearTamano(archivo.size)}: el máximo es ${formatearTamano(TAMANO_MAXIMO)}.`,
  "no-es-pdf": () => "No es un PDF.",
};

/**
 * Los PDF de la orden: ensayos, presupuestos, informes… Se arrastran al recuadro o se eligen, y se suben de a
 * uno con su barra de avance. Los ve también el cliente en su portal; uno subido por error se da de baja.
 */
export function ArchivosOrden({ equipo, api }: { equipo: EquipoTaller; api: ApiPanel }) {
  const [subidas, setSubidas] = useState<Subida[]>([]);
  const [encima, setEncima] = useState(false);
  const [verBajas, setVerBajas] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const activos = archivosActivos(equipo.archivos);
  const bajas = (equipo.archivos ?? []).filter((a) => a.baja);
  const subiendo = subidas.some((s) => !s.error);
  useAvisoAlSalir(subiendo, "Hay PDF subiéndose. ¿Salir igual y cortar la subida?");

  // Un PDF soltado fuera del recuadro no tiene que reemplazar el panel por el visor del navegador.
  useEffect(() => {
    const evitar = (evento: globalThis.DragEvent) => {
      if (evento.dataTransfer?.types.includes("Files")) evento.preventDefault();
    };
    window.addEventListener("dragover", evitar);
    window.addEventListener("drop", evitar);
    return () => {
      window.removeEventListener("dragover", evitar);
      window.removeEventListener("drop", evitar);
    };
  }, []);

  const cambiar = (clave: string, cambios: Partial<Subida>) => setSubidas((actuales) => actuales.map((s) => (s.clave === clave ? { ...s, ...cambios } : s)));

  async function subir(archivos: File[]) {
    const nuevas = archivos.map((archivo) => ({ archivo, subida: { clave: crypto.randomUUID(), nombre: archivo.name, fraccion: 0 } }));
    setSubidas((actuales) => [...actuales, ...nuevas.map((n) => n.subida)]);
    // De a uno: así cada barra avanza a su turno y la conexión del taller no se reparte.
    for (const { archivo, subida } of nuevas) {
      const rechazo = await revisarPdf(archivo);
      if (rechazo) {
        cambiar(subida.clave, { error: RECHAZOS[rechazo](archivo) });
        continue;
      }
      try {
        await api.acciones.subirArchivo(equipo.codigo, archivo, (fraccion) => cambiar(subida.clave, { fraccion }));
        setSubidas((actuales) => actuales.filter((s) => s.clave !== subida.clave));
        api.avisar(`Se subió ${archivo.name}. El cliente ya lo ve en su portal.`);
      } catch (error) {
        cambiar(subida.clave, { error: mensajeDeError(error) });
      }
    }
  }

  function alSoltar(evento: DragEvent) {
    evento.preventDefault();
    setEncima(false);
    const archivos = Array.from(evento.dataTransfer.files);
    if (archivos.length) subir(archivos);
  }

  async function abrir(archivo: ArchivoOrden) {
    try {
      await abrirEnPestana(() => api.acciones.enlaceArchivo(equipo.codigo, archivo.id));
    } catch (error) {
      api.avisar(mensajeDeError(error));
    }
  }

  async function cambiarBaja(archivo: ArchivoOrden, baja: boolean) {
    const deshacer = () => api.acciones.cambiarBajaArchivo(equipo.codigo, archivo.id, !baja);
    try {
      await api.acciones.cambiarBajaArchivo(equipo.codigo, archivo.id, baja);
      api.avisar(baja ? `Se dio de baja ${archivo.nombre}: el cliente ya no lo ve.` : `Se reactivó ${archivo.nombre}.`, deshacer);
    } catch (error) {
      api.avisar(mensajeDeError(error));
    }
  }

  return (
    <section aria-labelledby="archivos-orden" className="marco">
      <TornillosMarco />
      <div className="marco-cabecera">
        <h2 id="archivos-orden" className="rotulo text-base">
          Archivos PDF
        </h2>
        {activos.length > 0 && <span className="rotulo text-base">{activos.length}</span>}
      </div>
      <div className="marco-cuerpo">
        {equipo.baja ? (
          <p className="text-[0.9375rem] text-grafito">La orden está dada de baja: no se le suben PDF.</p>
        ) : (
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setEncima(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEncima(false);
            }}
            onDrop={alSoltar}
            className={`rounded-[var(--radius-placa)] border-2 px-6 py-7 text-center transition-colors ${
              encima ? "border-solid border-tinta bg-blanco" : "border-dashed border-acero bg-esmalte/60"
            }`}
          >
            <p className="text-lg font-semibold pointer-coarse:hidden">{encima ? "Suelte los PDF para subirlos" : "Arrastre los PDF a este recuadro"}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 pointer-coarse:mt-0">
              <span className="text-[0.9375rem] pointer-coarse:hidden">o</span>
              <button type="button" onClick={() => entrada.current?.click()} className="placa-secundaria">
                Elegir PDF
              </button>
            </div>
            <p className="mx-auto mt-3 max-w-[48ch] text-[0.9375rem] text-grafito">
              Hasta {formatearTamano(TAMANO_MAXIMO)} cada uno. Los ve también el cliente en su portal.
            </p>
            <input
              ref={entrada}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              hidden
              onChange={(e) => {
                const archivos = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (archivos.length) subir(archivos);
              }}
            />
          </div>
        )}

        {subidas.length > 0 && (
          <ul aria-label="PDF que se están subiendo" className="mt-5">
            {subidas.map((s) => (
              <FilaSubida key={s.clave} subida={s} onQuitar={() => setSubidas((actuales) => actuales.filter((x) => x.clave !== s.clave))} />
            ))}
          </ul>
        )}

        {activos.length > 0 ? (
          <ul aria-label="PDF de la orden" className="mt-5">
            {activos.map((a) => (
              <FilaArchivo key={a.id} archivo={a} onAbrir={() => abrir(a)}>
                {!equipo.baja && (
                  <button type="button" onClick={() => cambiarBaja(a, true)} className={`${enlace} cursor-pointer text-[0.9375rem]`} aria-label={`Dar de baja ${a.nombre}`}>
                    Dar de baja
                  </button>
                )}
              </FilaArchivo>
            ))}
          </ul>
        ) : (
          subidas.length === 0 && <p className="mt-5 text-[0.9375rem] text-grafito">Todavía no tiene PDF.</p>
        )}

        {bajas.length > 0 && (
          <div className="mt-5 border-t border-acero pt-4">
            <button type="button" aria-expanded={verBajas} onClick={() => setVerBajas(!verBajas)} className="cursor-pointer text-[0.9375rem] font-semibold underline underline-offset-4">
              {verBajas ? "Ocultar" : "Ver"} {bajas.length === 1 ? "1 dado de baja" : `${bajas.length} dados de baja`}
            </button>
            {verBajas && (
              <ul aria-label="PDF dados de baja" className="mt-2">
                {bajas.map((a) => (
                  <FilaArchivo key={a.id} archivo={a} onAbrir={() => abrir(a)}>
                    <button type="button" onClick={() => cambiarBaja(a, false)} className={`${enlace} cursor-pointer text-[0.9375rem]`} aria-label={`Reactivar ${a.nombre}`}>
                      Reactivar
                    </button>
                  </FilaArchivo>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function FilaArchivo({ archivo, onAbrir, children }: { archivo: ArchivoOrden; onAbrir: () => void; children?: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-acero py-3 last:border-b-0">
      <div className="min-w-0">
        <button type="button" onClick={onAbrir} className={`${enlace} cursor-pointer break-all text-left`}>
          {archivo.nombre}
        </button>
        <p className="text-[0.9375rem] text-grafito">
          {formatearTamano(archivo.tamano)} · subido el {formatearFecha(archivo.subido)}
          {archivo.por && <> por {archivo.por}</>}
          {archivo.baja && <> · dado de baja el {formatearFecha(archivo.baja)}</>}
        </p>
      </div>
      {children}
    </li>
  );
}

function FilaSubida({ subida, onQuitar }: { subida: Subida; onQuitar: () => void }) {
  const porcentaje = Math.round(subida.fraccion * 100);
  return (
    <li className="border-b border-acero py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6">
        <p className="min-w-0 break-all font-semibold">{subida.nombre}</p>
        {subida.error ? (
          <button type="button" onClick={onQuitar} className="cursor-pointer text-[0.9375rem] font-semibold underline underline-offset-4">
            Quitar
          </button>
        ) : (
          <span className="text-[0.9375rem] text-grafito">{porcentaje === 0 ? "Esperando…" : `Subiendo… ${porcentaje} %`}</span>
        )}
      </div>
      {subida.error ? (
        <p role="alert" className="mt-1 flex items-start gap-2 text-[0.9375rem] font-medium text-rojo">
          <Alerta className="mt-0.5 size-[1.125rem] shrink-0" />
          No se subió. {subida.error}
        </p>
      ) : (
        <div
          role="progressbar"
          aria-label={`Subiendo ${subida.nombre}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={porcentaje}
          className="mt-2 h-2 overflow-hidden rounded-[0.125rem] bg-acero/25"
        >
          <div className="h-full bg-naranja transition-[width] duration-200" style={{ width: `${porcentaje}%` }} />
        </div>
      )}
    </li>
  );
}
