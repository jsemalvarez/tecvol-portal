"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Alerta } from "@/components/iconos";
import { EsqueletoAcceso } from "@/components/ingreso/piezas";
import { nombreDe } from "@/components/portal/piezas";
import { reiniciarDatos } from "@/lib/datos/local/datos";
import { modoDatos } from "@/lib/datos/repositorios";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES, type EstadoReparacion } from "@/lib/dominio/estados";
import type { Empresa, EquipoTaller, Taller } from "@/lib/dominio/tipos";
import { Dialogo } from "./Dialogo";
import { Etiqueta } from "./Etiqueta";
import { FormularioEquipo } from "./FormularioEquipo";
import { FormularioEstado } from "./FormularioEstado";
import { FormularioCuenta, FormularioEmpresa } from "./FormulariosEmpresa";
import { usePanel, type AccionesPanel, type EstadoAnterior } from "./usePanel";

/** Lo que cada sección del panel puede usar: los datos, las acciones y las ventanas. */
export interface ApiPanel {
  taller: Taller;
  acciones: AccionesPanel;
  empresaDe: (equipo: EquipoTaller) => string;
  abrirEstado: (equipo: EquipoTaller) => void;
  abrirEditar: (equipo: EquipoTaller) => void;
  abrirEtiqueta: (equipo: EquipoTaller) => void;
  abrirCuenta: (empresa: Empresa) => void;
}

type Ventana =
  | { tipo: "estado" | "editar" | "etiqueta" | "registrado"; codigo: string }
  | { tipo: "registrar" | "empresa" }
  | { tipo: "cuenta"; empresa: Empresa };

interface Aviso {
  id: number;
  texto: string;
  deshacer?: () => Promise<void>;
}

const SECCIONES = [
  { id: "equipos", href: "/panel", nombre: "Equipos", titulo: "Equipos" },
  { id: "empresas", href: "/panel/empresas", nombre: "Empresas y cuentas", titulo: "Empresas y cuentas" },
] as const;

/**
 * Página del panel del taller: la sesión del personal, las secciones, los estados de carga, las ventanas
 * para cargar datos y los avisos. Cada sección recibe la API y muestra sus datos.
 */
export function PaginaPanel({ seccion, children }: { seccion: "equipos" | "empresas"; children: (api: ApiPanel) => ReactNode }) {
  const { estado, acciones, reintentar, salir } = usePanel();
  const [ventana, setVentana] = useState<Ventana | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const sesion = estado.fase === "verificando" ? null : estado.sesion;
  const taller = estado.fase === "listo" ? estado.taller : null;

  useEffect(() => {
    if (!aviso) return;
    const reloj = setTimeout(() => setAviso((actual) => (actual?.id === aviso.id ? null : actual)), 8000);
    return () => clearTimeout(reloj);
  }, [aviso]);

  const avisar = useCallback((texto: string, deshacer?: () => Promise<void>) => setAviso({ id: Date.now(), texto, deshacer }), []);
  const cerrar = useCallback(() => setVentana(null), []);
  const equipoDe = (codigo: string) => taller?.equipos.find((e) => e.codigo === codigo) ?? null;
  const nombreEmpresa = (id: string) => taller?.empresas.find((e) => e.id === id)?.nombre ?? "";

  function avisarCambio(anterior: EstadoAnterior, equipo: EquipoTaller, nuevo: EstadoReparacion) {
    avisar(`${nombreDe(equipo)} pasó a ${DEFINICIONES[nuevo].nombre}.`, () => acciones.restaurar(anterior));
  }

  const api: ApiPanel | null = taller && {
    taller,
    acciones,
    empresaDe: (equipo) => nombreEmpresa(equipo.empresa),
    abrirEstado: (equipo) => setVentana({ tipo: "estado", codigo: equipo.codigo }),
    abrirEditar: (equipo) => setVentana({ tipo: "editar", codigo: equipo.codigo }),
    abrirEtiqueta: (equipo) => setVentana({ tipo: "etiqueta", codigo: equipo.codigo }),
    abrirCuenta: (empresa) => setVentana({ tipo: "cuenta", empresa }),
  };

  const actual = SECCIONES.find((s) => s.id === seccion)!;
  const enVentana = ventana && "codigo" in ventana ? equipoDe(ventana.codigo) : null;

  let contenido: ReactNode;
  if (estado.fase === "verificando" || estado.fase === "cargando") {
    contenido = (
      <p role="status" className="mt-10 text-lg">
        Cargando los datos del taller…
      </p>
    );
  } else if (estado.fase === "error") {
    contenido = (
      <div className="mt-8 flex flex-col items-start gap-5">
        <p role="alert" className="flex max-w-[52ch] items-start gap-2 text-lg font-medium text-rojo">
          <Alerta className="mt-1 size-5 shrink-0" />
          No se pudieron cargar los datos del taller. Revise su conexión e intente de nuevo.
        </p>
        <button type="button" onClick={reintentar} className="placa-secundaria">
          Reintentar
        </button>
      </div>
    );
  } else if (api) {
    contenido = children(api);
  }

  const enTaller = taller?.equipos.filter((e) => e.estado !== "entregado") ?? [];
  const esperanCliente = enTaller.filter((e) => ["obligacion", "seguridad"].includes(DEFINICIONES[e.estado].forma));

  return (
    <EsqueletoAcceso
      derecha={
        sesion ? (
          <div className="flex items-center gap-5">
            <span className="hidden text-[0.9375rem] md:inline">{sesion.email}</span>
            <button type="button" onClick={salir} className="placa-secundaria">
              Salir
            </button>
          </div>
        ) : null
      }
      banda={
        <>
          <p className="max-w-[60ch] text-[0.9375rem]">
            <strong className="font-semibold">Lo que se carga acá lo ve el cliente</strong> en su portal, y cualquiera con el
            código en la consulta pública: el estado, las fechas y la descripción del equipo.
          </p>
          {modoDatos === "local" && (
            <div className="rounded-[0.25rem] border-2 border-dashed border-acero px-4 py-3 text-[0.9375rem]">
              <p className="rotulo text-[0.8125rem]">Datos de prueba</p>
              <p>Los cambios se guardan solo en este navegador.</p>
              <button
                type="button"
                onClick={() => {
                  reiniciarDatos();
                  window.location.reload();
                }}
                className="mt-1 cursor-pointer font-semibold underline decoration-naranja decoration-2 underline-offset-4"
              >
                Volver a los datos de prueba
              </button>
            </div>
          )}
        </>
      }
    >
      <section
        aria-labelledby="titulo-panel"
        aria-busy={estado.fase === "verificando" || estado.fase === "cargando"}
        className="mx-auto w-full max-w-[1500px] flex-1 px-7 pb-20 pt-8 sm:px-12 sm:pt-10 xl:px-24"
      >
        <nav aria-label="Secciones del panel" className="flex flex-wrap gap-x-7 gap-y-2">
          {SECCIONES.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              aria-current={s.id === seccion ? "page" : undefined}
              className={`rotulo border-b-[3px] pb-1 text-[0.9375rem] no-underline ${
                s.id === seccion ? "border-naranja" : "border-transparent text-grafito hover:border-acero"
              }`}
            >
              {s.nombre}
            </Link>
          ))}
        </nav>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div>
            <p className="rotulo text-[0.9375rem] text-grafito">Panel del taller</p>
            <h1 id="titulo-panel" className="mt-2 font-cartel text-[3rem] font-bold leading-[0.92] sm:text-[4rem]">
              {actual.titulo}
            </h1>
          </div>
          {taller && (
            <button type="button" onClick={() => setVentana({ tipo: seccion === "equipos" ? "registrar" : "empresa" })} className="placa">
              {seccion === "equipos" ? "Registrar equipo" : "Nueva empresa"}
            </button>
          )}
        </div>
        {taller && seccion === "equipos" && (
          <p className="mt-4 text-lg">
            {enTaller.length} en el taller
            {esperanCliente.length > 0 && (
              <>
                {" · "}
                <strong className="font-semibold">
                  {esperanCliente.length} {esperanCliente.length === 1 ? "espera" : "esperan"} al cliente
                </strong>
              </>
            )}
            {" · "}
            {taller.equipos.length - enTaller.length} entregados
          </p>
        )}
        {taller && seccion === "empresas" && (
          <p className="mt-4 text-lg">
            {taller.empresas.length} {taller.empresas.length === 1 ? "empresa" : "empresas"} · {taller.cuentas.length}{" "}
            {taller.cuentas.length === 1 ? "cuenta" : "cuentas"} de clientes
          </p>
        )}
        {contenido}
      </section>

      {taller && (
        <>
          <Dialogo
            abierto={ventana?.tipo === "estado" && !!enVentana}
            titulo={enVentana ? `Estado · ${formatearCodigo(enVentana.codigo)}` : "Estado"}
            onCerrar={cerrar}
            ancho="max-w-[44rem]"
          >
            {enVentana && ventana?.tipo === "estado" && (
              <>
                <EncabezadoEquipo equipo={enVentana} empresa={nombreEmpresa(enVentana.empresa)} />
                <FormularioEstado
                  equipo={enVentana}
                  acciones={acciones}
                  onGuardado={(anterior, nuevo) => {
                    avisarCambio(anterior, enVentana, nuevo);
                    cerrar();
                  }}
                />
              </>
            )}
          </Dialogo>

          <Dialogo
            abierto={ventana?.tipo === "editar" && !!enVentana}
            titulo={enVentana ? `Datos del equipo · ${formatearCodigo(enVentana.codigo)}` : "Datos del equipo"}
            onCerrar={cerrar}
          >
            {enVentana && ventana?.tipo === "editar" && (
              <FormularioEquipo
                taller={taller}
                acciones={acciones}
                equipo={enVentana}
                onGuardado={() => {
                  avisar(`Se guardaron los datos de ${nombreDe(enVentana)}.`);
                  cerrar();
                }}
              />
            )}
          </Dialogo>

          <Dialogo abierto={ventana?.tipo === "registrar"} titulo="Registrar equipo" onCerrar={cerrar}>
            {ventana?.tipo === "registrar" && (
              <FormularioEquipo
                taller={taller}
                acciones={acciones}
                onRegistrado={(equipo) => setVentana({ tipo: "registrado", codigo: equipo.codigo })}
              />
            )}
          </Dialogo>

          <Dialogo
            abierto={(ventana?.tipo === "registrado" || ventana?.tipo === "etiqueta") && !!enVentana}
            titulo={ventana?.tipo === "registrado" ? "Equipo registrado" : "Etiqueta del equipo"}
            onCerrar={cerrar}
            ancho="max-w-[34rem]"
          >
            {enVentana && (ventana?.tipo === "registrado" || ventana?.tipo === "etiqueta") && (
              <>
                {ventana.tipo === "registrado" && (
                  <p role="status" className="mb-5 max-w-[48ch]">
                    Quedó registrado como <strong className="font-semibold">Ingresado</strong> con el código{" "}
                    <strong className="font-semibold tracking-[0.04em]">{formatearCodigo(enVentana.codigo)}</strong>. Imprima la
                    etiqueta para el equipo o la orden de ingreso.
                  </p>
                )}
                <Etiqueta equipo={enVentana} empresa={nombreEmpresa(enVentana.empresa)} />
              </>
            )}
          </Dialogo>

          <Dialogo abierto={ventana?.tipo === "empresa"} titulo="Nueva empresa" onCerrar={cerrar}>
            {ventana?.tipo === "empresa" && (
              <FormularioEmpresa
                acciones={acciones}
                onCreada={(empresa) => {
                  avisar(`Se creó ${empresa.nombre}. Ahora puede agregarle cuentas.`);
                  cerrar();
                }}
              />
            )}
          </Dialogo>

          <Dialogo abierto={ventana?.tipo === "cuenta"} titulo="Nueva cuenta de cliente" onCerrar={cerrar}>
            {ventana?.tipo === "cuenta" && (
              <FormularioCuenta
                empresa={ventana.empresa}
                acciones={acciones}
                onCreada={(cuenta) => {
                  avisar(
                    modoDatos === "local"
                      ? `Se registró la cuenta de ${cuenta.email} (con datos de prueba no se envía el email).`
                      : `Se creó la cuenta de ${cuenta.email}. Le llegó un email para elegir su contraseña.`,
                  );
                  cerrar();
                }}
              />
            )}
          </Dialogo>
        </>
      )}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
        {aviso && (
          <div className="sobre-tinta pointer-events-auto flex max-w-[40rem] flex-wrap items-center gap-x-5 gap-y-2 rounded-[0.25rem] bg-tinta px-5 py-3.5 text-esmalte shadow-placa">
            <p>{aviso.texto}</p>
            {aviso.deshacer && (
              <button
                type="button"
                onClick={async () => {
                  const deshacer = aviso.deshacer!;
                  setAviso(null);
                  try {
                    await deshacer();
                    avisar("Se deshizo el cambio.");
                  } catch {
                    avisar("No se pudo deshacer el cambio. Corríjalo a mano.");
                  }
                }}
                className="rotulo cursor-pointer text-[0.9375rem] underline decoration-naranja decoration-2 underline-offset-4"
              >
                Deshacer
              </button>
            )}
          </div>
        )}
      </div>
    </EsqueletoAcceso>
  );
}

/** Para qué equipo es la ventana: la referencia, la descripción y la empresa. */
function EncabezadoEquipo({ equipo, empresa }: { equipo: EquipoTaller; empresa: string }) {
  return (
    <div className="mb-6">
      <p className="font-cartel text-[1.75rem] font-bold leading-[1.05]">{nombreDe(equipo)}</p>
      <p className="mt-1 text-[0.9375rem]">
        {[equipo.referencia ? equipo.equipo : null, empresa].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}
