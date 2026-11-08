"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Desplegar } from "@/components/iconos";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { formatearKV, formatearNumero, intensidadNominal, NOMBRE_FASES, NOMBRE_USOS, type Placa } from "@/lib/dominio/placa";
import type { Transformador } from "@/lib/dominio/tipos";
import { Grupo, MarcaTemporal } from "../equipo/campos";
import { useAvisoAlSalir } from "../equipo/useAvisoAlSalir";
import { CorregirTransformador } from "../ficha/PasoTransformador";
import type { ApiPanel } from "../PaginaPanel";

/**
 * Los datos y la chapa del transformador, en una placa que se despliega como los pasos de la hoja de la O.T.
 * Cerrada dice cuánto de la chapa está cargado; abierta, todo, agrupado como en la chapa, y al final el botón que
 * abre ahí mismo el formulario para corregirlos (el mismo del paso 2): lo que se cambia se ve en todas sus O.T.
 */
export function DatosYChapa({ api, trafo, empresa, anteriores }: { api: ApiPanel; trafo: Transformador; empresa: string; anteriores: string[] }) {
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [sucio, setSucio] = useState(false);
  // Cada vez que se pasa de leer a corregir (o al revés) se vuelve al comienzo del desplegable.
  const [cambios, setCambios] = useState(0);
  const seccion = useRef<HTMLElement>(null);
  const cabecera = useRef<HTMLButtonElement>(null);
  useAvisoAlSalir(sucio);
  // Dado de baja se ve, pero no se corrige: primero se reactiva.
  const puedeEditar = !trafo.baja;

  // El botón de corregir está abajo de todo y el formulario empieza arriba: sin esto quedaría a mitad de camino.
  // El foco va a la cabecera, como al pasar de un paso a otro en la hoja: en el celular no abre el teclado. Sube
  // de un salto: el contenido cambia entero, y una subida suave la corta el navegador al reacomodar la página.
  useEffect(() => {
    if (!cambios) return;
    cabecera.current?.focus({ preventScroll: true });
    seccion.current?.scrollIntoView({ block: "start" });
  }, [cambios]);

  const pasarA = (corregir: boolean) => {
    setEditando(corregir);
    setCambios((n) => n + 1);
  };

  return (
    <section ref={seccion} aria-labelledby="datos-trafo-titulo" className={`marco scroll-mt-4 overflow-clip [&>.marco-tornillo]:z-20 ${abierto ? "border-tinta" : ""}`}>
      <TornillosMarco />
      {/* Toda la cabecera abre y cierra, como la de los pasos de la hoja. */}
      <h2>
        <button
          ref={cabecera}
          type="button"
          onClick={() => setAbierto(!abierto)}
          aria-expanded={abierto}
          aria-controls="datos-trafo-cuerpo"
          className="group flex min-h-[5.5rem] w-full cursor-pointer items-center gap-4 px-[var(--marco-px)] py-4 text-left sm:gap-5"
        >
          <span className="min-w-0">
            <span
              id="datos-trafo-titulo"
              className="block font-cartel text-[1.375rem] font-bold uppercase leading-[1.1] tracking-[0.04em] decoration-naranja decoration-2 underline-offset-4 group-hover:underline sm:text-[1.5625rem]"
            >
              Datos y chapa
            </span>
            <span className="mt-0.5 block leading-snug text-grafito">{cuantoCargado(trafo)}</span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-3.5">
            {sucio && !abierto && <span className="tarjeta-bloqueo">Sin guardar</span>}
            <Desplegar className={`size-6 transition-transform ${abierto ? "rotate-180" : ""}`} />
          </span>
        </button>
      </h2>
      {/* No se desmonta al cerrar: lo escrito sin guardar sigue ahí al volver. Un campo con foco no queda bajo la barra de guardar. */}
      <div id="datos-trafo-cuerpo" hidden={!abierto} className="border-t-2 border-acero [&_:is(input,select,textarea)]:scroll-mb-28">
        {editando ? (
          <CorregirTransformador api={api} trafo={trafo} onSucio={setSucio} onListo={() => pasarA(false)} />
        ) : (
          <>
            <Lectura trafo={trafo} empresa={empresa} anteriores={anteriores} />
            {/* Al final: primero se ve todo lo cargado y después se decide corregir. */}
            {puedeEditar && (
              <div className="marco-pie px-[var(--marco-px)] py-5">
                <button type="button" onClick={() => pasarA(true)} className="placa-secundaria cursor-pointer">
                  Editar datos de chapa
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** Los datos de la chapa, en el orden del formulario. El conmutador cuenta si tiene algún punto. */
const CAMPOS_CHAPA = [
  "fabricante",
  "anio",
  "tipo",
  "norma",
  "fases",
  "potencia",
  "frecuencia",
  "tensionCortocircuito",
  "grupoConexion",
  "servicio",
  "enfriamiento",
  "tensionPrimaria",
  "tensionSecundaria",
  "conmutador",
  "aceite",
  "masa",
  "materialBobinados",
] as const satisfies readonly (keyof Placa)[];

function cuantoCargado({ placa, equipo }: Pick<Transformador, "placa" | "equipo">) {
  const cargados = CAMPOS_CHAPA.filter((campo) => {
    const valor = placa?.[campo];
    return Array.isArray(valor) ? valor.some((v) => v != null) : valor != null && valor !== "";
  }).length;
  // Los que vinieron de las O.T. de antes pueden tener la descripción escrita a mano y nada de la chapa. Sin
  // chapa, la descripción que se arma sola es solo "Transformador".
  if (cargados === 0) {
    return equipo.trim() && equipo.trim() !== "Transformador" ? "Solo tiene la descripción de arriba: la chapa está sin cargar." : "La chapa todavía no se cargó.";
  }
  if (cargados === CAMPOS_CHAPA.length) return "Todos los datos de la chapa cargados.";
  return `${cargados} de los ${CAMPOS_CHAPA.length} datos de la chapa cargados.`;
}

interface Fila {
  nombre: string;
  valor?: ReactNode;
  /** Qué dice si está vacío. */
  vacio?: string;
  nota?: string;
}

const conUnidad = (numero: number | undefined, unidad: string) => (numero == null ? undefined : `${formatearNumero(numero)} ${unidad}`);

/** Todo lo cargado, agrupado como en la chapa. Lo que falta dice "Sin cargar". */
function Lectura({ trafo, empresa, anteriores }: { trafo: Transformador; empresa: string; anteriores: string[] }) {
  const placa = trafo.placa ?? {};
  const tension = (voltios: number | undefined) => (voltios ? `${formatearNumero(voltios)} V (${formatearKV(voltios)} kV)` : undefined);
  const intensidad = (voltios: number | undefined) =>
    placa.potencia && voltios && placa.fases ? `${formatearNumero(intensidadNominal(placa.potencia, voltios, placa.fases))} A` : undefined;
  const puntos = placa.conmutador?.some((p) => p != null) ? placa.conmutador : undefined;

  return (
    <>
      <Grupo titulo="Números y uso" primero>
        <Filas
          filas={[
            {
              nombre: "N.º de trafo",
              valor: (
                <>
                  {trafo.numero}
                  {trafo.provisorio && <MarcaTemporal />}
                </>
              ),
            },
            { nombre: "N.º T", valor: trafo.numeroT },
            ...(anteriores.length ? [{ nombre: "N.º T que tuvo antes", valor: anteriores.join(", ") }] : []),
            { nombre: "Empresa", valor: empresa },
            { nombre: "Uso", valor: trafo.uso ? NOMBRE_USOS[trafo.uso] : undefined, vacio: "Sin indicar" },
          ]}
        />
      </Grupo>
      <Grupo titulo="Identificación">
        <Filas
          filas={[
            { nombre: "Fabricante", valor: placa.fabricante },
            { nombre: "Año de fabricación", valor: placa.anio ? String(placa.anio) : undefined },
            { nombre: "Tipo", valor: placa.tipo },
            { nombre: "Norma", valor: placa.norma },
          ]}
        />
      </Grupo>
      <Grupo titulo="Características">
        <Filas
          filas={[
            { nombre: "Fases", valor: placa.fases ? NOMBRE_FASES[placa.fases] : undefined },
            { nombre: "Potencia nominal", valor: conUnidad(placa.potencia, "kVA") },
            { nombre: "Frecuencia", valor: conUnidad(placa.frecuencia, "Hz") },
            { nombre: "Tensión de cortocircuito", valor: conUnidad(placa.tensionCortocircuito, "%") },
            { nombre: "Grupo de conexiones", valor: placa.grupoConexion },
            { nombre: "Servicio", valor: placa.servicio },
            { nombre: "Sistema de enfriamiento", valor: placa.enfriamiento },
          ]}
        />
      </Grupo>
      <Grupo titulo="Tensiones nominales" ayuda="La intensidad se calcula con la potencia, la tensión y las fases.">
        <Filas
          columnas="sm:grid-cols-2"
          filas={[
            { nombre: "Tensión del primario", valor: tension(placa.tensionPrimaria) },
            { nombre: "Tensión del secundario", valor: tension(placa.tensionSecundaria) },
            { nombre: "Intensidad del primario", valor: intensidad(placa.tensionPrimaria), vacio: "Sin calcular" },
            { nombre: "Intensidad del secundario", valor: intensidad(placa.tensionSecundaria), vacio: "Sin calcular" },
          ]}
        />
      </Grupo>
      <Grupo titulo="Conmutador sin tensión" ayuda="La tensión de cada punto, como en la tabla de la chapa.">
        {puntos ? (
          <Filas
            columnas="grid-cols-2 sm:grid-cols-5"
            filas={puntos.map((punto, i) => ({
              nombre: `Punto ${i + 1}`,
              valor: conUnidad(punto ?? undefined, "V"),
              vacio: "No figura",
              nota: punto != null && punto === placa.tensionPrimaria ? "Nominal" : undefined,
            }))}
          />
        ) : (
          <p className="text-grafito">Sin cargar</p>
        )}
      </Grupo>
      <Grupo titulo="Aceite y masa">
        <Filas
          filas={[
            { nombre: "Aceite aislante", valor: conUnidad(placa.aceite, "L") },
            { nombre: "Masa total", valor: conUnidad(placa.masa, "kg") },
            { nombre: "Material de los bobinados", valor: placa.materialBobinados },
          ]}
        />
      </Grupo>
    </>
  );
}

function Filas({ filas, columnas = "sm:grid-cols-2 lg:grid-cols-3" }: { filas: Fila[]; columnas?: string }) {
  return (
    <dl className={`grid gap-x-8 gap-y-5 ${columnas}`}>
      {filas.map(({ nombre, valor, vacio = "Sin cargar", nota }) => (
        <div key={nombre}>
          <dt className="rotulo text-[0.8125rem] text-grafito">{nombre}</dt>
          <dd className={`mt-0.5 ${valor ? "" : "text-grafito"}`}>
            {valor ?? vacio}
            {nota && <span className="block text-[0.9375rem] text-grafito">{nota}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
