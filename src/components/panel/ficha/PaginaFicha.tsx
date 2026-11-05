"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Alerta, Flecha } from "@/components/iconos";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { TextoEstado } from "@/components/portal/piezas";
import { Senal } from "@/components/senal/Senal";
import { ErrorDePanel } from "@/lib/datos/repositorios";
import { diasEntre } from "@/lib/dominio/avisos";
import { formatearCodigo, normalizarCodigo } from "@/lib/dominio/codigo";
import { datosTallerVacios, type DatosTallerGuardados } from "@/lib/dominio/datos-taller";
import { DEFINICIONES, ESTADOS, indiceEstado, type EstadoReparacion } from "@/lib/dominio/estados";
import { formatearFecha } from "@/lib/dominio/fechas";
import type { InformeGuardado } from "@/lib/dominio/informe";
import type { ProtocoloGuardado } from "@/lib/dominio/protocolo";
import { esPaso, faltaCorta, faltaPara, pasoCompleto, pasoSalteado, PASOS, proximoPaso, rotuloSalteado, situacionPaso, textoPaso, type DatosHoja, type NumeroPaso } from "@/lib/dominio/pasos";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { nombreOrden, ordenesDelTrafo, resumenChapa, trafoDeOrden } from "@/lib/dominio/trafo";
import { Dialogo, ErrorFormulario, mensajeDeError } from "../Dialogo";
import { TITULO_ETIQUETA } from "../EtiquetasTaller";
import { MarcaTemporal } from "../equipo/campos";
import { HistorialTrafo } from "../equipo/HistorialTrafo";
import { useAvisoAlSalir } from "../equipo/useAvisoAlSalir";
import { dejarAviso, PaginaPanel, type ApiPanel } from "../PaginaPanel";
import { dias, TextoDemoras } from "../Planilla";
import { ArchivosOrden } from "./ArchivosOrden";
import { PasoDiagnostico } from "./PasoDiagnostico";
import { PasoEnsayos } from "./PasoEnsayos";
import { PasoOrden } from "./PasoOrden";
import { PasoReparacion, type DatosTallerAnteriores } from "./PasoReparacion";
import { PasoEntrega, PasoPresupuesto } from "./PasosConFechas";
import { PasoTransformador } from "./PasoTransformador";
import { Paso, VaDespues } from "./piezas";

const enlace = "font-semibold underline decoration-naranja decoration-2 underline-offset-4";

const NOTA = (
  <>
    <strong className="font-semibold">Lo que se carga acá lo ve la empresa</strong> en su portal: el estado, las fechas y los archivos de cada O.T. El
    diagnóstico, los datos del taller y el protocolo de ensayo los ve solo el personal.
  </>
);

/** El título de la página: el N.º de la O.T., que sale de los datos. */
const tituloDe = (codigo: string) => (api: ApiPanel | null) => {
  const equipo = api?.taller.equipos.find((e) => e.codigo === codigo);
  if (!equipo) return "Orden de trabajo";
  return (
    <>
      {nombreOrden(equipo)}
      {equipo.numeroOrdenTemporal && <MarcaTemporal className="ml-3" />}
    </>
  );
};

/**
 * Una orden de trabajo: todo lo de un ingreso al taller en una sola página, en el orden de carga. `?paso=` abre
 * uno en particular. Cada paso se despliega, se guarda por su cuenta y lleva al que sigue.
 */
export function PanelFicha() {
  const parametros = useSearchParams();
  const codigo = normalizarCodigo(parametros.get("codigo") ?? "");
  const paso = Number(parametros.get("paso"));
  return (
    <PaginaPanel seccion="equipos" titulo={tituloDe(codigo)} nota={NOTA} conBarraAbajo>
      {(api) => <Hoja key={codigo} api={api} codigo={codigo} pasoInicial={esPaso(paso) ? paso : undefined} />}
    </PaginaPanel>
  );
}

/**
 * Una orden de trabajo nueva: la misma hoja, vacía. Al guardar el paso 1 ya existe, y la dirección pasa a ser la
 * suya sin volver a cargar la página. Desde la ficha de un transformador llega elegido (`?trafo=`).
 */
export function PanelRegistrar() {
  const parametros = useSearchParams();
  // Al guardar el paso 1 cambia la dirección: el transformador se lee una sola vez.
  const [trafo] = useState(() => parametros.get("trafo") ?? undefined);
  // Con "Atrás", el navegador vuelve a esta página con la dirección de la O.T. ya guardada: es esa, no una nueva.
  const [codigo, setCodigo] = useState(() => normalizarCodigo(parametros.get("codigo") ?? "") || undefined);
  const [recienGuardada, setRecienGuardada] = useState(false);

  useEffect(() => {
    if (codigo) document.title = "Orden de trabajo · Panel · Tecvol";
  }, [codigo]);

  return (
    <PaginaPanel seccion="equipos" titulo={codigo ? tituloDe(codigo) : "Nueva O.T."} nota={NOTA} conBarraAbajo>
      {(api) => (
        <Hoja
          key={codigo ?? "nueva"}
          api={api}
          codigo={codigo}
          trafoInicial={trafo}
          pasoInicial={recienGuardada ? 2 : undefined}
          onCreada={(equipo) => {
            window.history.replaceState(null, "", `/panel/equipo?codigo=${equipo.codigo}`);
            setRecienGuardada(true);
            setCodigo(equipo.codigo);
          }}
        />
      )}
    </PaginaPanel>
  );
}

type FallaDeCarga = "error" | "permiso";

const fallaDeCarga = (e: unknown): FallaDeCarga => (e instanceof ErrorDePanel && e.motivo === "permiso" ? "permiso" : "error");

type Carga = {
  informe: InformeGuardado | null;
  datosTaller: DatosTallerGuardados | null;
  anterior: DatosTallerAnteriores | null;
  protocolo: ProtocoloGuardado | null | FallaDeCarga;
};

const SIN_CARGAR: Carga = { informe: null, datosTaller: null, anterior: null, protocolo: null };

/** El protocolo, si se pudo leer y ya tiene algo guardado. */
const protocoloDe = (carga: Carga | null) => (carga?.protocolo && typeof carga.protocolo === "object" ? carga.protocolo : null);

/** El informe, los datos del taller y el protocolo de la O.T., que están aparte. Una O.T. sin transformador todavía no tiene. */
function useCarga(api: ApiPanel, equipo: EquipoTaller | undefined) {
  const [carga, setCarga] = useState<Carga | "error" | "permiso" | null>(null);
  const [intento, setIntento] = useState(0);
  const { obtenerInforme, obtenerDatosTaller, obtenerProtocolo } = api.acciones;
  const conTrafo = !!equipo && !equipo.faltaTrafo;
  // Otras órdenes del mismo transformador, de la más nueva a la más vieja.
  const anteriores = conTrafo ? ordenesDelTrafo(api.taller.equipos, equipo.trafo, { excepto: equipo.codigo }) : [];
  const claveAnteriores = anteriores.map((e) => e.codigo).join(",");

  useEffect(() => {
    if (!conTrafo) return;
    let activo = true;
    Promise.all([
      obtenerInforme(equipo.codigo),
      obtenerDatosTaller(equipo.codigo),
      Promise.all(anteriores.map((e) => obtenerDatosTaller(e.codigo))),
      // Si no se puede leer, se pierde solo el paso 6: los pasos 3 y 5 siguen andando.
      obtenerProtocolo(equipo.codigo).catch(fallaDeCarga),
    ])
      .then(([informe, datosTaller, previos, protocolo]) => {
        // La reparación anterior más nueva que tenga algo cargado.
        const i = previos.findIndex((d) => d && !datosTallerVacios(d));
        if (activo) setCarga({ informe, datosTaller, anterior: i >= 0 ? { equipo: anteriores[i], datos: previos[i]! } : null, protocolo });
      })
      .catch((e) => activo && setCarga(fallaDeCarga(e)));
    return () => {
      activo = false;
    };
    // Las acciones y `anteriores` cambian en cada render del panel; alcanza con los códigos y los reintentos.
  }, [equipo?.codigo, conTrafo, claveAnteriores, intento]);

  return {
    carga: conTrafo ? carga : SIN_CARGAR,
    setCarga,
    reintentar() {
      setCarga(null);
      setIntento((n) => n + 1);
    },
  };
}

/** De qué transformador es la O.T., debajo del título. */
function Identidad({ equipo }: { equipo: EquipoTaller }) {
  return (
    <p className="mt-3 max-w-[70ch] text-lg">
      {equipo.faltaTrafo ? (
        <strong className="font-semibold">Falta el transformador</strong>
      ) : (
        <>
          <strong className="font-semibold">{trafoDeOrden(equipo)}</strong> · {resumenChapa(equipo)}
          {equipo.referencia && ` · ${equipo.referencia}`}
        </>
      )}
    </p>
  );
}

function irAlPaso(n: NumeroPaso) {
  const paso = document.getElementById(`paso-${n}`);
  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  paso?.scrollIntoView({ block: "start", behavior: reducido ? "auto" : "smooth" });
  paso?.querySelector("button")?.focus({ preventScroll: true });
}

function Hoja({
  api,
  codigo,
  trafoInicial,
  pasoInicial,
  onCreada,
}: {
  api: ApiPanel;
  /** `undefined`: una O.T. nueva, que todavía no se guardó. */
  codigo?: string;
  trafoInicial?: string;
  pasoInicial?: NumeroPaso;
  onCreada?: (equipo: EquipoTaller) => void;
}) {
  const equipo = codigo === undefined ? undefined : api.taller.equipos.find((e) => e.codigo === codigo);
  const { carga, setCarga, reintentar } = useCarga(api, equipo);
  const lista = carga && carga !== "error" && carga !== "permiso" ? carga : null;
  const datos: DatosHoja = { equipo, informe: lista?.informe ?? null, datosTaller: lista?.datosTaller ?? null, protocolo: protocoloDe(lista)?.celdas ?? null, sinLeer: !lista };

  // Hasta que se termina de leer no se sabe cuál abrir. Después, el primero que queda por hacer (ver `yaLlego`).
  const [abierto, setAbierto] = useState<NumeroPaso | null | undefined>(pasoInicial);
  const [aviso, setAviso] = useState<NumeroPaso | null>(null);
  const [seguirDesde, setSeguirDesde] = useState<NumeroPaso | null>(null);
  const [irA, setIrA] = useState<NumeroPaso | null>(pasoInicial ?? null);
  const [sucios, setSucios] = useState<ReadonlySet<NumeroPaso>>(new Set());
  const enPantalla = abierto !== undefined ? abierto : lista ? proximoPaso(datos) : null;
  useAvisoAlSalir(sucios.size > 0);

  const marcarSucio = useCallback((n: NumeroPaso, sucio: boolean) => {
    setSucios((actuales) => {
      if (actuales.has(n) === sucio) return actuales;
      const nuevos = new Set(actuales);
      if (sucio) nuevos.add(n);
      else nuevos.delete(n);
      return nuevos;
    });
  }, []);

  // Después de abrirlo, con la página ya acomodada: el paso queda arriba y con el foco.
  useEffect(() => {
    if (!irA) return;
    irAlPaso(irA);
    setIrA(null);
  }, [irA]);

  // Al llegar a una O.T. ya empezada, con todo leído: si el paso en el que se sigue quedó lejos, baja hasta ahí. Si
  // la página ya no está arriba (volvió con "Atrás" al lugar donde estaba), no la mueve.
  const yaLlego = useRef(codigo === undefined || pasoInicial !== undefined);
  useEffect(() => {
    if (yaLlego.current || !lista) return;
    yaLlego.current = true;
    const paso = proximoPaso(datos);
    // Queda fijo: al guardar sin seguir, el paso sigue abierto aunque ya no sea el próximo.
    setAbierto(paso);
    if (!paso || equipo?.baja || window.scrollY > 40) return;
    const altura = document.getElementById(`paso-${paso}`)?.getBoundingClientRect().top ?? 0;
    if (altura > window.innerHeight * 0.4) irAlPaso(paso);
    // Se mira una sola vez, cuando terminan de leerse los datos.
  }, [lista]);

  // Después de guardar: con los datos ya al día, se abre el próximo paso sin completar.
  useEffect(() => {
    if (seguirDesde === null) return;
    const siguiente = proximoPaso(datos, seguirDesde);
    setSeguirDesde(null);
    setAbierto(siguiente);
    setIrA(siguiente);
    // `datos` cambia en cada render: alcanza con el pedido de seguir.
  }, [seguirDesde]);

  if (codigo !== undefined && !equipo) {
    return (
      <p className="mt-6 max-w-[56ch] text-lg">
        No se encontró la orden de trabajo{codigo ? ` ${formatearCodigo(codigo)}` : ""}.{" "}
        <Link href="/panel" className={enlace}>
          Volver a las órdenes de trabajo
        </Link>
        .
      </p>
    );
  }

  const empresa = equipo ? api.empresaDe(equipo) : "";
  const trafoElegido = trafoInicial ? api.taller.transformadores.find((t) => t.id === trafoInicial && !t.baja) : undefined;
  const pendiente = proximoPaso(datos);

  function abrir(n: NumeroPaso) {
    setAbierto(n);
    setAviso(null);
    setIrA(n);
  }

  /** Lo que comparten los pasos con una O.T. ya guardada. */
  const deLaOrden = (n: NumeroPaso, orden: EquipoTaller) => ({
    api,
    equipo: orden,
    onSeguir: () => setSeguirDesde(n),
    onSucio: (sucio: boolean) => marcarSucio(n, sucio),
  });

  /** El aviso de un paso que por el orden del taller va más adelante. */
  const nota = (n: NumeroPaso, texto: string) => (situacionPaso(n, datos) === "despues" ? <VaDespues>{texto}</VaDespues> : undefined);

  function cuerpo(n: NumeroPaso): ReactNode {
    if (n === 1) {
      return <PasoOrden api={api} equipo={equipo} trafoInicial={trafoElegido} onCreada={(creada) => onCreada?.(creada)} onSeguir={() => setSeguirDesde(1)} onSucio={(sucio) => marcarSucio(1, sucio)} />;
    }
    if (!equipo) return null;
    const comun = deLaOrden(n, equipo);
    switch (n) {
      case 2:
        // Un transformador elegido era de la empresa anterior: con otra empresa se vuelve a buscar.
        return <PasoTransformador key={equipo.empresa} {...comun} trafoInicial={trafoElegido} />;
      case 3:
      case 5:
      case 6: {
        const falla = carga === "error" || carga === "permiso" ? carga : n === 6 && typeof lista?.protocolo === "string" ? lista.protocolo : null;
        if (falla) {
          return (
            <div className="marco-cuerpo flex flex-col items-start gap-5">
              <p role="alert" className="flex max-w-[52ch] items-start gap-2 text-lg font-medium text-rojo">
                <Alerta className="mt-1 size-5 shrink-0" />
                {falla === "permiso"
                  ? "Su cuenta no tiene permiso para ver estos datos. Avise a quien administra el sistema."
                  : "No se pudieron cargar estos datos. Revise su conexión e intente de nuevo."}
              </p>
              <button type="button" onClick={reintentar} className="placa-secundaria">
                Reintentar
              </button>
            </div>
          );
        }
        if (!lista) {
          return (
            <p role="status" className="marco-cuerpo text-lg">
              Cargando…
            </p>
          );
        }
        if (n === 3) return <PasoDiagnostico {...comun} guardado={lista.informe} onGuardado={(informe) => setCarga({ ...lista, informe })} />;
        if (n === 6) {
          return (
            <PasoEnsayos
              {...comun}
              guardado={protocoloDe(lista)}
              vaDespues={nota(6, "Los ensayos van después de la reparación, pero puede cargarlos igual.")}
              onGuardado={(protocolo) => setCarga({ ...lista, protocolo })}
            />
          );
        }
        return (
          <PasoReparacion
            {...comun}
            guardado={lista.datosTaller}
            anterior={lista.anterior}
            vaDespues={nota(5, "El taller lo carga con el presupuesto aprobado, pero puede cargarlo igual.")}
            onGuardado={(datosTaller) => setCarga({ ...lista, datosTaller })}
          />
        );
      }
      case 4:
        return <PasoPresupuesto {...comun} informe={lista?.informe ?? null} vaDespues={nota(4, "Normalmente se anota con el diagnóstico terminado, pero puede cargarlo igual.")} />;
      case 7:
        return <PasoEntrega {...comun} vaDespues={nota(7, "La entrega va después de los ensayos, pero puede cargarla igual.")} />;
    }
  }

  const otras = equipo && !equipo.faltaTrafo ? ordenesDelTrafo(api.taller.equipos, equipo.trafo, { excepto: equipo.codigo }) : [];

  return (
    <>
      {equipo && <Identidad equipo={equipo} />}
      <p className={`${equipo ? "mt-1" : "mt-3"} max-w-[70ch] text-lg`}>
        {equipo ? (
          <>
            {empresa || "Sin empresa"} · código <span className="tracking-[0.04em]">{formatearCodigo(equipo.codigo)}</span>
            {equipo.etapas.ingresado && <> · ingresó el {formatearFecha(equipo.etapas.ingresado)}</>}
          </>
        ) : (
          "Se completa en orden y cada paso se guarda al seguir. Con el transformador cargado se habilita lo demás."
        )}
      </p>
      {equipo && !equipo.baja && (equipo.numeroOrdenTemporal || !equipo.numeroOrden) && (
        <p className="mt-3 max-w-[64ch] font-medium">
          {equipo.numeroOrdenTemporal ? "El N.º de O.T. es temporal." : "Falta el N.º de O.T."} Cuando tenga el del sistema de gestión,{" "}
          <button type="button" onClick={() => abrir(1)} className={`${enlace} cursor-pointer`}>
            cárguelo
          </button>
          .
        </p>
      )}
      <div className="mt-9 flex flex-col gap-10">
        <Resumen api={api} equipo={equipo} datos={datos} abierto={enPantalla} />
        <div className="flex min-w-0 flex-col gap-5">
          {PASOS.map((n) => {
            const situacion = situacionPaso(n, datos);
            const { texto, cargado } = textoPaso(n, datos, empresa);
            return (
              <Paso
                key={n}
                n={n}
                situacion={situacion}
                abierto={enPantalla === n}
                texto={texto}
                cargado={cargado}
                salteado={situacion === "salteado" ? rotuloSalteado(n, datos) : undefined}
                sinGuardar={sucios.has(n)}
                soloLectura={!!equipo?.baja}
                aviso={aviso === n}
                falta={faltaPara(n)}
                faltaCorta={faltaCorta(n)}
                irA={pendiente === 1 ? "Empezar por el paso 1" : `Ir al paso ${pendiente ?? 1}`}
                onAlternar={() => {
                  if (situacion === "bloqueado") {
                    setAviso(aviso === n ? null : n);
                    return;
                  }
                  setAviso(null);
                  setAbierto(enPantalla === n ? null : n);
                }}
                onIr={() => abrir(pendiente ?? 1)}
              >
                {cuerpo(n)}
              </Paso>
            );
          })}

          <div className="mt-3 flex flex-col gap-10">
            {equipo && !equipo.faltaTrafo ? (
              <ArchivosOrden equipo={equipo} api={api} />
            ) : (
              <section aria-label="Archivos para la empresa" className="marco border-dashed bg-esmalte shadow-none">
                <TornillosMarco />
                <div className="marco-cuerpo py-5 sm:py-5">
                  <p className="font-cartel text-[1.375rem] font-bold uppercase leading-tight tracking-[0.04em] text-grafito">Archivos para la empresa</p>
                  <p className="mt-0.5 leading-snug text-grafito">Se habilitan con el transformador cargado.</p>
                </div>
              </section>
            )}
            {equipo && otras.length > 0 && <HistorialTrafo trafo={equipo.trafo} ordenes={otras} />}
            {equipo && !equipo.baja && api.puede("baja-equipos") && <BajaEquipo equipo={equipo} api={api} />}
          </div>
        </div>
      </div>
    </>
  );
}

/** Cuántos pasos están completos, y cuántos quedaron atrás sin completar. */
function textoAvance(datos: DatosHoja) {
  const hechos = PASOS.filter((n) => pasoCompleto(n, datos)).length;
  const sinCargar = PASOS.filter((n) => pasoSalteado(n, datos)).length;
  const completos = hechos === 0 ? "Ningún paso completo todavía." : hechos === PASOS.length ? "Los 7 pasos completos." : `${hechos} de ${PASOS.length} pasos completos.`;
  return sinCargar > 0 ? `${completos} ${sinCargar === 1 ? "1 quedó" : `${sinCargar} quedaron`} sin completar.` : completos;
}

/** Los siete pasos en una tira. Toma el color del texto para invertirse junto con el botón que la lleva. */
function TiraPasos({ datos, abierto, className = "" }: { datos: DatosHoja; abierto: NumeroPaso | null; className?: string }) {
  return (
    <span aria-hidden="true" className={`grid grid-cols-7 gap-1 ${className}`}>
      {PASOS.map((n) => (
        <span key={n} className={`block h-1.5 rounded-[0.0625rem] ${pasoCompleto(n, datos) ? "bg-current" : abierto === n ? "bg-naranja" : pasoSalteado(n, datos) ? "bg-acero" : "bg-current opacity-30"}`} />
      ))}
    </span>
  );
}

/**
 * Arriba de los pasos: dónde está la O.T. y cuánto lleva, y lo que se hace con ella sin cargar nada. El estado sale
 * de las fechas de cada paso: acá solo se muestra.
 */
function Resumen({ api, equipo, datos, abierto }: { api: ApiPanel; equipo?: EquipoTaller; datos: DatosHoja; abierto: NumeroPaso | null }) {
  const conTrafo = !!equipo && !equipo.faltaTrafo;
  const definicion = conTrafo ? DEFINICIONES[equipo.estado] : null;
  return (
    <div className="grid items-start gap-x-8 gap-y-7 md:grid-cols-2">
      <section aria-labelledby="estado-ot" className="border-t-[3px] border-acero pt-4">
        <h2 id="estado-ot" className="rotulo text-base">
          Estado
        </h2>
        <div className="mt-3 flex items-center gap-4">
          {definicion && equipo ? (
            <Senal forma={definicion.forma} pictograma={equipo.estado} simple className="size-14 shrink-0" />
          ) : (
            <span aria-hidden="true" className="block size-14 shrink-0 rounded-[var(--radius-placa)] border-2 border-dashed border-acero" />
          )}
          <div className="min-w-0 leading-snug">
            {conTrafo && equipo ? (
              <>
                <p className="text-lg font-semibold">
                  <TextoEstado equipo={equipo} />
                </p>
                <div className="text-[0.9375rem]">
                  <TextoDemoras equipo={equipo} api={api} />
                </div>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold">{equipo ? "Falta el transformador" : "Todavía no se guardó"}</p>
                <p className="text-[0.9375rem] text-grafito">
                  {equipo
                    ? "La O.T. ya está guardada en el panel. La empresa la ve cuando cargue el transformador en el paso 2."
                    : "Se guarda al terminar el paso 1. La empresa la ve cuando tenga el transformador."}
                </p>
              </>
            )}
          </div>
        </div>
        {equipo?.baja && (
          <p className="mt-5 max-w-[44ch]">
            <strong className="font-semibold">Está dada de baja</strong> desde el {formatearFecha(equipo.baja)}: la empresa no la ve y no se edita.
            {api.puede("baja-equipos") && (
              <>
                {" "}
                <button type="button" onClick={() => api.reactivar("equipo", equipo.codigo, nombreOrden(equipo))} className={`${enlace} cursor-pointer`}>
                  Reactivar
                </button>
              </>
            )}
          </p>
        )}
      </section>

      {conTrafo && equipo ? (
        <AccionesOrden api={api} equipo={equipo} datos={datos} abierto={abierto} />
      ) : (
        // Sin transformador no hay recorrido, ni etiquetas, ni a dónde ir: el avance se muestra y nada más.
        <section aria-labelledby="avance-ot" className="border-t-[3px] border-acero pt-4">
          <h2 id="avance-ot" className="rotulo text-base">
            Avance
          </h2>
          <p className="mt-2">{textoAvance(datos)}</p>
          <TiraPasos datos={datos} abierto={abierto} className="mt-2.5" />
        </section>
      )}
    </div>
  );
}

const CELDA = "placa-secundaria min-h-[3.25rem] w-full px-3 text-left leading-tight no-underline";
const ETIQUETAS = ["interna", "externa"] as const;

/**
 * Lo que se hace con la O.T. sin cargar nada, en dos filas y dos columnas: a la izquierda el avance y el
 * transformador, a la derecha las dos etiquetas. Se recorre por columnas, para que las etiquetas queden seguidas.
 */
function AccionesOrden({ api, equipo, datos, abierto }: { api: ApiPanel; equipo: EquipoTaller; datos: DatosHoja; abierto: NumeroPaso | null }) {
  const [viendoAvance, setViendoAvance] = useState(false);
  const hechos = PASOS.filter((n) => pasoCompleto(n, datos)).length;
  return (
    <section aria-labelledby="acciones-ot-titulo" className="border-t-[3px] border-acero pt-4">
      <h2 id="acciones-ot-titulo" className="rotulo text-base">
        Esta O.T.
      </h2>
      <div id="acciones-ot" className="mt-3 grid grid-flow-col grid-cols-2 grid-rows-2 gap-2.5">
        <button
          type="button"
          onClick={() => setViendoAvance(true)}
          aria-haspopup="dialog"
          aria-label={`Avance: ${hechos} de ${PASOS.length} pasos completos. Ver el recorrido.`}
          className={`${CELDA} flex-col items-stretch justify-center gap-1.5 py-1.5`}
        >
          <span className="flex items-baseline justify-between gap-2">
            Avance
            <span className="whitespace-nowrap font-sans font-medium normal-case tracking-normal">
              {hechos} de {PASOS.length}
            </span>
          </span>
          <TiraPasos datos={datos} abierto={abierto} />
        </button>
        <Link href={`/panel/transformador?id=${equipo.trafo}`} className={`${CELDA} justify-between gap-2`}>
          Ver trafo
          <Flecha className="size-5 shrink-0" />
        </Link>
        {ETIQUETAS.map((clase) => (
          <button key={clase} type="button" aria-haspopup="dialog" onClick={() => api.abrirEtiqueta(equipo, clase)} className={CELDA}>
            {TITULO_ETIQUETA[clase]}
          </button>
        ))}
      </div>
      <Dialogo abierto={viendoAvance} titulo="Avance" ancho="max-w-[36rem]" onCerrar={() => setViendoAvance(false)}>
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="rotulo text-base">Pasos</h3>
            <p className="mt-2">{textoAvance(datos)}</p>
            <TiraPasos datos={datos} abierto={abierto} className="mt-2.5" />
          </div>
          <div className="border-t-2 border-acero pt-6">
            <Recorrido equipo={equipo} />
          </div>
        </div>
      </Dialogo>
    </section>
  );
}

/**
 * Dar de baja una orden, con confirmación: la empresa deja de verla y el código deja de funcionar. Nada se
 * borra: queda en la vista "Dados de baja" de la lista, desde donde se reactiva.
 */
function BajaEquipo({ equipo, api }: { equipo: EquipoTaller; api: ApiPanel }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setGuardando(true);
    setError(null);
    try {
      await api.acciones.darDeBaja("equipo", equipo.codigo);
      dejarAviso(`Se dio de baja la ${nombreOrden(equipo)}. Para reactivarla, elija la vista "Dados de baja".`);
      router.push("/panel");
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <section aria-labelledby="baja-equipo" className="max-w-[60ch] border-t-[3px] border-acero pt-6">
      <h2 id="baja-equipo" className="rotulo text-base">
        Dar de baja
      </h2>
      <p className="mt-2">
        Para una O.T. cargada por error o que ya no corresponde seguir. La empresa deja de verla en su portal y el código deja de
        funcionar en la consulta pública. Nada se borra: se puede reactivar.
      </p>
      <button type="button" onClick={() => setConfirmando(true)} className="placa-secundaria mt-4">
        Dar de baja la O.T.
      </button>
      <Dialogo abierto={confirmando} titulo="Dar de baja la O.T." onCerrar={() => setConfirmando(false)}>
        <div className="flex flex-col gap-5">
          <p className="max-w-[56ch]">
            ¿Dar de baja la <strong className="font-semibold">{nombreOrden(equipo)}</strong> ({formatearCodigo(equipo.codigo)})? Los cambios sin guardar de esta
            página se pierden.
          </p>
          <ErrorFormulario texto={error} />
          <button type="button" onClick={confirmar} className="placa self-start" disabled={guardando}>
            {guardando ? "Dando de baja…" : "Sí, dar de baja"}
          </button>
        </div>
      </Dialogo>
    </section>
  );
}

type Situacion = "pasada" | "actual" | "salteada" | "pendiente";

interface EtapaRecorrida {
  estado: EstadoReparacion;
  situacion: Situacion;
  fecha?: Date;
  /** Cuánto duró la etapa (hasta la siguiente con fecha) o, en la actual, cuánto lleva. */
  dias?: number;
}

/** Cada etapa con su fecha y su duración. Una etapa sin fecha antes de la actual se salteó. */
function recorridoDe(equipo: EquipoTaller, hoy: Date): EtapaRecorrida[] {
  const actual = indiceEstado(equipo.estado);
  return ESTADOS.map((estado, i) => {
    const fecha = equipo.etapas[estado];
    if (i > actual) return { estado, situacion: "pendiente" };
    if (!fecha) return { estado, situacion: i === actual ? "actual" : "salteada" };
    if (i === actual) return { estado, situacion: "actual", fecha, dias: estado === "entregado" ? undefined : diasEntre(fecha, hoy) };
    const siguiente = ESTADOS.slice(i + 1, actual + 1)
      .map((e) => equipo.etapas[e])
      .find(Boolean);
    return { estado, situacion: "pasada", fecha, dias: siguiente ? diasEntre(fecha, siguiente) : undefined };
  });
}

function Recorrido({ equipo }: { equipo: EquipoTaller }) {
  const hoy = new Date();
  const etapas = recorridoDe(equipo, hoy);
  const ingreso = equipo.etapas.ingresado;
  const entrega = equipo.estado === "entregado" ? equipo.etapas.entregado : undefined;
  const total = ingreso ? diasEntre(ingreso, entrega ?? hoy) : undefined;

  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="rotulo text-base">Recorrido</h3>
        {total !== undefined && <span className="rotulo text-base">{dias(total)}</span>}
      </div>
      <p className="mt-2 text-[0.9375rem]">
        {!ingreso
          ? "No tiene fecha de ingreso."
          : entrega
            ? `Ingresó el ${formatearFecha(ingreso)} y se entregó el ${formatearFecha(entrega)}: ${dias(total!)} en el taller.`
            : total === 0
              ? "Ingresó hoy."
              : `Ingresó el ${formatearFecha(ingreso)}: lleva ${dias(total!)} en el taller.`}
      </p>
      <ol aria-label="Etapas de la reparación" className="mt-5">
        {etapas.map((etapa, i) => {
          const definicion = DEFINICIONES[etapa.estado];
          const ultimo = i === etapas.length - 1;
          return (
            <li key={etapa.estado} aria-current={etapa.situacion === "actual" ? "step" : undefined} className="relative flex gap-4 pb-5 last:pb-0">
              {/* La línea que une las etapas: llena en lo recorrido, punteada en lo que falta. */}
              {!ultimo && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[1.0625rem] top-10 bottom-0 w-0 border-l-2 ${
                    etapa.situacion === "pendiente" || etapa.situacion === "actual" ? "border-dashed border-acero/60" : "border-acero"
                  }`}
                />
              )}
              <Senal
                forma={definicion.forma}
                pictograma={etapa.estado}
                variante={etapa.situacion === "actual" ? "activa" : etapa.situacion === "pendiente" || etapa.situacion === "salteada" ? "futura" : "pasada"}
                simple
                className="relative size-9 shrink-0 bg-blanco"
              />
              <div className="min-w-0 pt-1 leading-snug">
                <p className={etapa.situacion === "actual" ? "font-bold" : etapa.situacion === "pasada" ? "font-semibold" : "text-grafito"}>
                  {definicion.nombre}
                  {etapa.situacion === "actual" && <span className="font-normal text-grafito"> · actual</span>}
                </p>
                <p className="text-[0.9375rem] text-grafito">{detalle(etapa)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function detalle(etapa: EtapaRecorrida): string {
  switch (etapa.situacion) {
    case "pendiente":
      return "Pendiente";
    case "salteada":
      return "Sin fecha: se salteó";
    case "actual":
      if (!etapa.fecha) return "Sin fecha";
      if (etapa.dias === undefined) return `El ${formatearFecha(etapa.fecha)}`;
      return `Desde el ${formatearFecha(etapa.fecha)} · ${etapa.dias === 0 ? "empezó hoy" : `lleva ${dias(etapa.dias)}`}`;
    case "pasada":
      if (etapa.dias === undefined) return `El ${formatearFecha(etapa.fecha!)}`;
      return `Desde el ${formatearFecha(etapa.fecha!)} · ${etapa.dias === 0 ? "menos de 1 día" : dias(etapa.dias)}`;
  }
}
