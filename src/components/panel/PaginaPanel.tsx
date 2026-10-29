"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Alerta, Flecha } from "@/components/iconos";
import { EsqueletoAcceso } from "@/components/ingreso/piezas";
import { nombreDe } from "@/components/portal/piezas";
import { CLAVE_CUENTAS_NUEVAS, reiniciarDatos } from "@/lib/datos/local/datos";
import { modoDatos } from "@/lib/datos/repositorios";
import { conAviso } from "@/lib/dominio/avisos";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES, type EstadoReparacion } from "@/lib/dominio/estados";
import { NOMBRES_ROL, puede, type Permiso } from "@/lib/dominio/roles";
import { activos, type CuentaCliente, type CuentaPersonal, type Empresa, type EquipoTaller, type Registro, type RolPersonal, type Taller } from "@/lib/dominio/tipos";
import { Dialogo, mensajeDeError } from "./Dialogo";
import { Etiqueta } from "./Etiqueta";
import { FormularioAvisos } from "./FormularioAvisos";
import { FormularioEstado } from "./FormularioEstado";
import { FormularioCuenta, FormularioEditarCuenta, FormularioEmpresa } from "./FormulariosEmpresa";
import { FormularioPersonal } from "./FormularioPersonal";
import { usePanel, type AccionesPanel, type EstadoAnterior } from "./usePanel";

/** Lo que cada sección del panel puede usar: los datos, las acciones y las ventanas. */
export interface ApiPanel {
  taller: Taller;
  acciones: AccionesPanel;
  /** Email, UID y rol de quien tiene la sesión abierta. */
  email: string;
  uid: string;
  rol: RolPersonal;
  puede: (permiso: Permiso) => boolean;
  empresaDe: (equipo: EquipoTaller) => string;
  abrirEstado: (equipo: EquipoTaller) => void;
  abrirEtiqueta: (equipo: EquipoTaller) => void;
  abrirCuenta: (empresa: Empresa) => void;
  abrir: (ventana: Ventana) => void;
  avisar: (texto: string, deshacer?: () => Promise<void>) => void;
  /** Da de baja y avisa, con la opción de deshacer. Si falla, avisa el motivo. */
  darDeBaja: (registro: Registro, id: string, nombre: string) => Promise<void>;
  reactivar: (registro: Registro, id: string, nombre: string) => Promise<void>;
  /** Envía otra vez el email para elegir la contraseña y avisa el resultado. */
  reenviarAcceso: (email: string) => Promise<void>;
}

export type Ventana =
  | { tipo: "estado" | "etiqueta"; codigo: string }
  | { tipo: "empresa" }
  | { tipo: "editar-empresa"; empresa: Empresa }
  | { tipo: "cuenta"; empresa: Empresa }
  | { tipo: "editar-cuenta"; cuenta: CuentaCliente }
  | { tipo: "personal" }
  | { tipo: "editar-personal"; cuenta: CuentaPersonal }
  | { tipo: "avisos" };

interface Aviso {
  id: number;
  texto: string;
  deshacer?: () => Promise<void>;
}

type Seccion = "equipos" | "empresas" | "personal";

/** Cada sección se ve solo con su permiso: el jefe de taller ve solo los equipos. */
const SECCIONES: { id: Seccion; href: string; nombre: string; permiso: Permiso }[] = [
  { id: "equipos", href: "/panel", nombre: "Equipos", permiso: "equipos" },
  { id: "empresas", href: "/panel/empresas", nombre: "Empresas y cuentas", permiso: "empresas" },
  { id: "personal", href: "/panel/personal", nombre: "Personal", permiso: "cuentas" },
];

const CLAVE_AVISO = "tecvol-aviso-panel";

/** Deja un aviso para la próxima página del panel, por ejemplo al volver a la lista después de guardar. */
export function dejarAviso(texto: string) {
  try {
    window.sessionStorage.setItem(CLAVE_AVISO, texto);
  } catch {
    // Sin almacenamiento, el aviso no llega: los datos igual quedaron guardados.
  }
}

function tomarAviso(): string | null {
  try {
    const texto = window.sessionStorage.getItem(CLAVE_AVISO);
    window.sessionStorage.removeItem(CLAVE_AVISO);
    return texto;
  } catch {
    return null;
  }
}

/**
 * Página del panel del taller: la sesión del personal, las secciones, los estados de carga, las ventanas
 * para cargar datos y los avisos. Cada sección recibe la API y muestra sus datos. Con `titulo`, es una
 * página dentro de la sección (registrar o editar un equipo): lleva ese título y el enlace para volver.
 */
export function PaginaPanel({
  seccion,
  titulo,
  nota,
  children,
}: {
  seccion: Seccion;
  titulo?: string;
  /** Qué ve el cliente de lo que se carga en esta página, si no es lo de siempre. Va en la banda de abajo. */
  nota?: ReactNode;
  children: (api: ApiPanel) => ReactNode;
}) {
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

  useEffect(() => {
    const pendiente = tomarAviso();
    if (pendiente) avisar(pendiente);
  }, [avisar]);

  const cerrar = useCallback(() => setVentana(null), []);
  const equipoDe = (codigo: string) => taller?.equipos.find((e) => e.codigo === codigo) ?? null;
  const nombreEmpresa = (id: string) => taller?.empresas.find((e) => e.id === id)?.nombre ?? "";

  function avisarCambio(anterior: EstadoAnterior, equipo: EquipoTaller, nuevo: EstadoReparacion) {
    avisar(`${nombreDe(equipo)} pasó a ${DEFINICIONES[nuevo].nombre}.`, () => acciones.restaurar(anterior));
  }

  const api: ApiPanel | null = taller &&
    sesion && {
      taller,
      acciones,
      email: sesion.email,
      uid: sesion.uid,
      rol: sesion.rol,
      puede: (permiso) => puede(sesion.rol, permiso),
      empresaDe: (equipo) => nombreEmpresa(equipo.empresa),
      abrirEstado: (equipo) => setVentana({ tipo: "estado", codigo: equipo.codigo }),
      abrirEtiqueta: (equipo) => setVentana({ tipo: "etiqueta", codigo: equipo.codigo }),
      abrirCuenta: (empresa) => setVentana({ tipo: "cuenta", empresa }),
      abrir: setVentana,
      avisar,
      async darDeBaja(registro, id, nombre) {
        try {
          await acciones.darDeBaja(registro, id);
          avisar(`Se dio de baja ${nombre}.`, () => acciones.reactivar(registro, id));
        } catch (e) {
          avisar(mensajeDeError(e));
        }
      },
      async reactivar(registro, id, nombre) {
        try {
          await acciones.reactivar(registro, id);
          avisar(`Se reactivó ${nombre}.`, () => acciones.darDeBaja(registro, id));
        } catch (e) {
          avisar(mensajeDeError(e));
        }
      },
      async reenviarAcceso(email) {
        try {
          await acciones.reenviarAcceso(email);
          avisar(
            modoDatos === "local"
              ? `Con datos de prueba no se envían emails: ${email} entra con su contraseña de prueba.`
              : `Se envió a ${email} un email nuevo para elegir su contraseña. El enlace anterior ya no sirve.`,
          );
        } catch (e) {
          avisar(mensajeDeError(e));
        }
      },
    };

  const actual = SECCIONES.find((s) => s.id === seccion)!;
  const visibles = sesion ? SECCIONES.filter((s) => puede(sesion.rol, s.permiso)) : [];
  const permitida = !sesion || puede(sesion.rol, actual.permiso);
  const enVentana = ventana && "codigo" in ventana ? equipoDe(ventana.codigo) : null;

  let contenido: ReactNode;
  if (!permitida) {
    contenido = (
      <p className="mt-10 max-w-[56ch] text-lg">
        Esta sección es solo para administradores.{" "}
        <Link href="/panel" className="font-semibold underline decoration-naranja decoration-2 underline-offset-4">
          Ir a los equipos
        </Link>
        .
      </p>
    );
  } else if (estado.fase === "verificando" || estado.fase === "cargando") {
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

  // Lo dado de baja no cuenta: sigue guardado, pero ya no es parte del trabajo del taller.
  const equipos = activos(taller?.equipos ?? []);
  const enTaller = equipos.filter((e) => e.estado !== "entregado");
  const esperanCliente = enTaller.filter((e) => ["obligacion", "seguridad"].includes(DEFINICIONES[e.estado].forma));
  const hoy = new Date();
  const demorados = taller ? enTaller.filter((e) => conAviso(e, taller.avisos, hoy)) : [];
  const empresas = activos(taller?.empresas ?? []);
  const cuentas = activos(taller?.cuentas ?? []);
  const personal = activos(taller?.personal ?? []);
  const conEncabezado = taller && !titulo && permitida;

  return (
    <EsqueletoAcceso
      derecha={
        sesion ? (
          <div className="flex items-center gap-5">
            <span className="hidden text-right text-[0.9375rem] leading-tight md:block">
              {sesion.email}
              <span className="block text-grafito">{NOMBRES_ROL[sesion.rol]}</span>
            </span>
            <button type="button" onClick={salir} className="placa-secundaria">
              Salir
            </button>
          </div>
        ) : null
      }
      banda={
        <>
          <p className="max-w-[60ch] text-[0.9375rem]">
            {nota ?? (
              <>
                <strong className="font-semibold">Lo que se carga acá lo ve el cliente</strong> en su portal, y cualquiera con el
                código en la consulta pública: el estado, las fechas y la descripción del equipo.
              </>
            )}
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
        {/* Con una sola sección (el jefe de taller ve solo los equipos) no hace falta el menú. */}
        {visibles.length > 1 && (
          <nav aria-label="Secciones del panel" className="flex flex-wrap gap-x-7 gap-y-2">
            {visibles.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                aria-current={s.id === seccion ? (titulo ? "true" : "page") : undefined}
                className={`rotulo border-b-[3px] pb-1 text-[0.9375rem] no-underline ${
                  s.id === seccion ? "border-naranja" : "border-transparent text-grafito hover:border-acero"
                }`}
              >
                {s.nombre}
              </Link>
            ))}
          </nav>
        )}
        <div className={`${visibles.length > 1 ? "mt-8" : ""} flex flex-wrap items-end justify-between gap-x-8 gap-y-5`}>
          <div>
            {titulo ? (
              <Link href={actual.href} className="rotulo inline-flex items-center gap-2 text-[0.9375rem] text-grafito no-underline hover:text-tinta">
                <Flecha className="size-4 rotate-180" />
                Volver a {actual.nombre.toLowerCase()}
              </Link>
            ) : (
              <p className="rotulo text-[0.9375rem] text-grafito">Panel del taller</p>
            )}
            <h1 id="titulo-panel" className="mt-2 font-cartel text-[3rem] font-bold leading-[0.92] sm:text-[4rem]">
              {titulo ?? actual.nombre}
            </h1>
          </div>
          {conEncabezado && seccion === "equipos" && (
            <Link href="/panel/registrar" className="placa">
              Registrar equipo
            </Link>
          )}
          {conEncabezado && seccion === "empresas" && (
            <button type="button" onClick={() => setVentana({ tipo: "empresa" })} className="placa">
              Nueva empresa
            </button>
          )}
          {conEncabezado && seccion === "personal" && (
            <button type="button" onClick={() => setVentana({ tipo: "personal" })} className="placa">
              Nueva cuenta del personal
            </button>
          )}
        </div>
        {conEncabezado && seccion === "equipos" && (
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
            {demorados.length > 0 && (
              <>
                {" · "}
                <strong className="inline-flex items-baseline gap-1.5 font-semibold text-rojo">
                  <Alerta className="size-[1.0625rem] shrink-0 self-center" />
                  {demorados.length} con aviso de demora
                </strong>
              </>
            )}
            {" · "}
            {equipos.length - enTaller.length} entregados
          </p>
        )}
        {conEncabezado && seccion === "empresas" && (
          <p className="mt-4 text-lg">
            {empresas.length} {empresas.length === 1 ? "empresa" : "empresas"} · {cuentas.length}{" "}
            {cuentas.length === 1 ? "cuenta" : "cuentas"} de clientes
          </p>
        )}
        {conEncabezado && seccion === "personal" && (
          <p className="mt-4 text-lg">
            {personal.length} {personal.length === 1 ? "cuenta activa" : "cuentas activas"} ·{" "}
            {personal.filter((p) => p.rol === "administrador").length} con rol de administrador
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
                  onFechasCorregidas={(anterior) => {
                    avisar(`Se corrigieron las fechas de ${nombreDe(enVentana)}.`, () => acciones.restaurar(anterior));
                    cerrar();
                  }}
                />
              </>
            )}
          </Dialogo>

          <Dialogo
            abierto={ventana?.tipo === "etiqueta" && !!enVentana}
            titulo="Etiqueta del equipo"
            onCerrar={cerrar}
            ancho="max-w-[34rem]"
          >
            {enVentana && ventana?.tipo === "etiqueta" && (
              <Etiqueta equipo={enVentana} empresa={nombreEmpresa(enVentana.empresa)} orden={enVentana.numeroOrden} />
            )}
          </Dialogo>

          <Dialogo abierto={ventana?.tipo === "avisos"} titulo="Avisos de demora" onCerrar={cerrar}>
            {ventana?.tipo === "avisos" && (
              <FormularioAvisos
                limites={taller.avisos}
                acciones={acciones}
                onGuardados={(limites) => {
                  avisar(`Ahora avisa a los ${limites.ingreso} días en el taller y a los ${limites.aprobacion} desde la aprobación.`);
                  cerrar();
                }}
              />
            )}
          </Dialogo>

          <Dialogo abierto={ventana?.tipo === "empresa"} titulo="Nueva empresa" onCerrar={cerrar}>
            {ventana?.tipo === "empresa" && (
              <FormularioEmpresa
                acciones={acciones}
                onGuardada={(empresa) => {
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
                  avisar(avisoCuentaCreada(cuenta.email));
                  cerrar();
                }}
              />
            )}
          </Dialogo>

          <Dialogo abierto={ventana?.tipo === "editar-empresa"} titulo="Editar empresa" onCerrar={cerrar}>
            {ventana?.tipo === "editar-empresa" && (
              <FormularioEmpresa
                empresa={ventana.empresa}
                acciones={acciones}
                onGuardada={(empresa) => {
                  avisar(`Se guardaron los datos de ${empresa.nombre}.`);
                  cerrar();
                }}
              />
            )}
          </Dialogo>

          <Dialogo abierto={ventana?.tipo === "editar-cuenta"} titulo="Cambiar de empresa" onCerrar={cerrar}>
            {ventana?.tipo === "editar-cuenta" && (
              <FormularioEditarCuenta
                cuenta={ventana.cuenta}
                empresas={activos(taller.empresas)}
                acciones={acciones}
                onGuardada={(cuenta) => {
                  avisar(`${cuenta.email} ahora ve los equipos de ${nombreEmpresa(cuenta.empresa)}.`);
                  cerrar();
                }}
              />
            )}
          </Dialogo>

          <Dialogo
            abierto={ventana?.tipo === "personal" || ventana?.tipo === "editar-personal"}
            titulo={ventana?.tipo === "editar-personal" ? "Cambiar el rol" : "Nueva cuenta del personal"}
            onCerrar={cerrar}
          >
            {(ventana?.tipo === "personal" || ventana?.tipo === "editar-personal") && (
              <FormularioPersonal
                cuenta={ventana.tipo === "editar-personal" ? ventana.cuenta : undefined}
                acciones={acciones}
                onGuardada={(cuenta, nueva) => {
                  avisar(nueva ? avisoCuentaCreada(cuenta.email) : `${cuenta.email} ahora es ${NOMBRES_ROL[cuenta.rol].toLowerCase()}.`);
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

function avisoCuentaCreada(email: string) {
  return modoDatos === "local"
    ? `Se registró la cuenta de ${email}. Con datos de prueba entra con la contraseña ${CLAVE_CUENTAS_NUEVAS}.`
    : `Se creó la cuenta de ${email}. Se le envió un email para elegir su contraseña: avísele que lo use cuanto antes, porque vence.`;
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
