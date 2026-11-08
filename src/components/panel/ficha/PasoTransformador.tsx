"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Flecha } from "@/components/iconos";
import { fechaParaCampo, formatearFecha } from "@/lib/dominio/fechas";
import { formatearNumero, NOMBRE_FASES } from "@/lib/dominio/placa";
import { activos, type Taller, type Transformador } from "@/lib/dominio/tipos";
import {
  buscarTransformadores,
  conMismoNumero,
  conNumeroT,
  nombreTrafo,
  normalizarNumero,
  numerosTAnteriores,
  ordenesDelTrafo,
  resumenChapa,
  siguienteProvisorio,
} from "@/lib/dominio/trafo";
import { ErrorFormulario, mensajeDeError } from "../Dialogo";
import { MarcaTemporal } from "../equipo/campos";
import {
  CampoNumeroT,
  datosDe,
  errorNumeroTOcupado,
  GruposChapa,
  IdentidadTransformador,
  liberarNumeroT,
  type Reemplazo,
} from "../equipo/CamposTransformador";
import { datosTransformador, revisar, valoresDe, type Errores, type Valores } from "../equipo/valores";
import { PiePaso, useSucio, type PropsPaso } from "./piezas";

const enlace = "font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/** Cuántos transformadores de la empresa se muestran antes de buscar: después, escribiendo se encuentra el resto. */
const A_LA_VISTA = 8;

/** El paso 2: qué transformador llegó. Una vez guardado no se cambia; su chapa y su N.º T sí se pueden corregir. */
export function PasoTransformador(props: PropsPaso & { trafoInicial?: Transformador }) {
  return props.equipo.faltaTrafo ? <ElegirTransformador {...props} /> : <TransformadorDeLaOrden {...props} />;
}

type Modo = { tipo: "buscar" } | { tipo: "existente"; id: string } | { tipo: "nuevo" };

/**
 * Se busca entre los de la empresa por N.º de trafo o N.º T: si ya pasó por el taller, se elige; si no, se da de
 * alta con su chapa. Al guardarlo, la empresa ve la O.T. como «Ingresado».
 */
function ElegirTransformador({ api, equipo, trafoInicial, onSeguir, onSucio }: PropsPaso & { trafoInicial?: Transformador }) {
  const id = useId();
  const hoy = fechaParaCampo(new Date());
  const { taller, acciones } = api;
  const puedeDarDeBaja = api.puede("baja-transformadores");
  const empresa = equipo.empresa;
  const empresaNombre = api.empresaDe(equipo);
  const [modo, setModo] = useState<Modo>(trafoInicial ? { tipo: "existente", id: trafoInicial.id } : { tipo: "buscar" });
  const [busqueda, setBusqueda] = useState("");
  const [valores, setValores] = useState<Valores>(() => valoresDe(undefined));
  const [reemplazo, setReemplazo] = useState<Reemplazo>("");
  // El N.º T con el que llegó un transformador que ya pasó por el taller, si no es el que tiene cargado.
  const [cambioT, setCambioT] = useState<string | null>(null);
  const [reemplazoT, setReemplazoT] = useState<Reemplazo>("");
  const [errorT, setErrorT] = useState<string | undefined>();
  const [errores, setErrores] = useState<Errores>({});
  const [errorTrafo, setErrorTrafo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(0);
  const formulario = useRef<HTMLFormElement>(null);
  useSucio(modo.tipo === "nuevo" || (modo.tipo === "existente" && !trafoInicial), onSucio);

  useEffect(() => {
    if (!intento) return;
    const primero = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
    primero?.focus({ preventScroll: true });
    primero?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [intento]);

  const elegido = modo.tipo === "existente" ? taller.transformadores.find((t) => t.id === modo.id) : undefined;
  const delCliente = taller.transformadores.filter((t) => t.empresa === empresa);
  const buscando = normalizarNumero(busqueda).length >= 2;
  const lista = useMemo(() => {
    if (modo.tipo !== "buscar") return [];
    if (buscando) return buscarTransformadores(taller, empresa, busqueda);
    return activos(taller.transformadores.filter((t) => t.empresa === empresa)).sort((a, b) => a.numero.localeCompare(b.numero, "es"));
  }, [modo.tipo, buscando, empresa, busqueda, taller]);
  const ocupadoPor = modo.tipo === "nuevo" ? conNumeroT(taller.transformadores, empresa, valores.numeroT) : undefined;
  const repetido = modo.tipo === "nuevo" && !valores.provisorio ? conMismoNumero(taller.transformadores, empresa, valores.numero) : undefined;
  const cambiaT = !!elegido && cambioT !== null && normalizarNumero(cambioT) !== normalizarNumero(elegido.numeroT ?? "");
  const ocupadoT = cambiaT ? conNumeroT(taller.transformadores, elegido.empresa, cambioT, elegido.id) : undefined;

  const quitarError = (clave: keyof Errores) =>
    setErrores((actuales) => {
      if (!actuales[clave]) return actuales;
      const resto = { ...actuales };
      delete resto[clave];
      return resto;
    });

  /** Deja el N.º T que tiene cargado el transformador elegido. */
  function dejarNumeroT() {
    setCambioT(null);
    setReemplazoT("");
    setErrorT(undefined);
  }

  function elegir(trafo: Transformador) {
    setModo({ tipo: "existente", id: trafo.id });
    dejarNumeroT();
    setErrorTrafo(null);
  }

  function volverABuscar() {
    setModo({ tipo: "buscar" });
    dejarNumeroT();
  }

  /** Es la primera vez que viene. Lo buscado no se copia: pudo ser el N.º T y no el de fábrica. */
  function darDeAlta() {
    setModo({ tipo: "nuevo" });
    setErrorTrafo(null);
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    const conErrores = modo.tipo === "nuevo" ? revisar(valores, { nuevo: true, hoy }) : {};
    if (modo.tipo === "nuevo" && ocupadoPor && !reemplazo) conErrores.numeroT = errorNumeroTOcupado;
    const conErrorT = ocupadoT && !reemplazoT ? errorNumeroTOcupado : undefined;
    const sinTrafo = modo.tipo === "buscar" || (modo.tipo === "existente" && !elegido);
    setErrores(conErrores);
    setErrorT(conErrorT);
    setErrorTrafo(sinTrafo ? "Diga qué transformador llegó: búsquelo o dé de alta uno nuevo." : null);
    if (Object.keys(conErrores).length || conErrorT || sinTrafo) {
      setIntento((n) => n + 1);
      return;
    }

    setGuardando(true);
    try {
      if (modo.tipo === "nuevo" && ocupadoPor && reemplazo) await liberarNumeroT(acciones, ocupadoPor, reemplazo);
      // Llegó con otro N.º T: se le cambia antes de asignarlo a la O.T., que guarda el N.º T con el que ingresó.
      if (elegido && cambiaT) {
        if (ocupadoT && reemplazoT) await liberarNumeroT(acciones, ocupadoT, reemplazoT);
        await acciones.editarTransformador(elegido.id, { ...datosDe(elegido), numeroT: cambioT?.trim() || undefined });
      }
      await acciones.asignarTrafo(equipo, modo.tipo === "existente" ? modo.id : { empresa, datos: datosTransformador(valores) });
      api.avisar("Se guardó el transformador. La empresa ya ve la O.T. como «Ingresado». Ya puede imprimir las etiquetas.");
      onSeguir();
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <form ref={formulario} onSubmit={guardar} noValidate>
      <div className="marco-cuerpo flex flex-col gap-6">
        {modo.tipo === "buscar" && (
          <Buscador
            id={id}
            taller={taller}
            empresaNombre={empresaNombre}
            delCliente={delCliente.length}
            busqueda={busqueda}
            onBusqueda={setBusqueda}
            buscando={buscando}
            lista={lista}
            onElegir={elegir}
            onNuevo={darDeAlta}
          />
        )}
        {elegido && (
          <Datos
            trafo={elegido}
            taller={taller}
            rotulo="Ya pasó por el taller"
            derecha={
              <button type="button" onClick={volverABuscar} className={`${enlace} cursor-pointer text-[0.9375rem]`}>
                Buscar otro
              </button>
            }
          >
            {cambioT === null ? (
              <p className="text-[0.9375rem]">
                {elegido.numeroT ? "¿Llegó con otro N.º T?" : "¿Llegó con un N.º T?"}{" "}
                <button type="button" onClick={() => setCambioT(elegido.numeroT ?? "")} className={`${enlace} cursor-pointer`}>
                  {elegido.numeroT ? "Cambiarlo" : "Cargarlo"}
                </button>
              </p>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <CampoNumeroT
                  id={`${id}-numeroTIngreso`}
                  valor={cambioT}
                  onCambio={(valor) => {
                    setCambioT(valor);
                    setErrorT(undefined);
                  }}
                  error={errorT}
                  ayuda={`El que trae pintado o en la etiqueta de la empresa. Queda en el transformador y en esta O.T.${elegido.numeroT ? `; el ${elegido.numeroT} sigue en el historial de sus O.T. anteriores` : ""}.`}
                  ocupadoPor={ocupadoT}
                  reemplazo={reemplazoT}
                  onReemplazo={(elegida) => {
                    setReemplazoT(elegida);
                    if (elegida) setErrorT(undefined);
                  }}
                  puedeDarDeBaja={puedeDarDeBaja}
                />
                <button type="button" onClick={dejarNumeroT} className={`${enlace} cursor-pointer text-[0.9375rem]`}>
                  {elegido.numeroT ? `Dejar el ${elegido.numeroT}` : "Dejarlo sin N.º T"}
                </button>
              </div>
            )}
          </Datos>
        )}
        {modo.tipo === "nuevo" && (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <p className="max-w-[56ch]">
                Es la primera vez que viene. Queda dado de alta como transformador de <strong className="font-semibold">{empresaNombre}</strong>.
              </p>
              <button type="button" onClick={volverABuscar} className={`${enlace} cursor-pointer text-[0.9375rem]`}>
                Volver a buscar
              </button>
            </div>
            <IdentidadTransformador
              id={id}
              valores={valores}
              setValores={setValores}
              errores={errores}
              quitarError={quitarError}
              nuevo
              provisorioSiguiente={siguienteProvisorio(taller.transformadores)}
              ocupadoPor={ocupadoPor}
              reemplazo={reemplazo}
              onReemplazo={(elegida) => {
                setReemplazo(elegida);
                if (elegida) quitarError("numeroT");
              }}
              puedeDarDeBaja={puedeDarDeBaja}
            />
            {repetido && <AvisoRepetido repetido={repetido} />}
          </>
        )}
        <ErrorFormulario texto={errorTrafo} />
      </div>
      {modo.tipo === "nuevo" && (
        <GruposChapa
          id={id}
          valores={valores}
          setValores={setValores}
          errores={errores}
          quitarError={quitarError}
          nuevo
          transformadores={taller.transformadores}
          primero={false}
        />
      )}
      <PiePaso guardando={guardando} error={error} nota="Al guardar, la empresa ve la O.T. como «Ingresado» y ya se pueden imprimir las etiquetas." />
    </form>
  );
}

function AvisoRepetido({ repetido }: { repetido: Transformador }) {
  return (
    <p className="max-w-[60ch] text-[0.9375rem] font-medium leading-snug">
      La empresa ya tiene un transformador con ese N.º de trafo:{" "}
      <Link href={`/panel/transformador?id=${repetido.id}`} target="_blank" className={enlace}>
        {nombreTrafo(repetido)}
        <span className="sr-only">, en otra pestaña</span>
      </Link>
      {repetido.baja ? ", dado de baja" : ""}. Revise que no sea el mismo antes de guardar.
    </p>
  );
}

/** El transformador ya guardado en la O.T.: sus datos a la vista y, si algo no coincide con la chapa, corregirlo acá mismo. */
function TransformadorDeLaOrden({ api, equipo, onSeguir, onSucio }: PropsPaso) {
  const [corrigiendo, setCorrigiendo] = useState(false);
  const trafo = api.taller.transformadores.find((t) => t.id === equipo.trafo);
  if (!trafo) {
    return <p className="marco-cuerpo">No se encontró el transformador de esta O.T.</p>;
  }
  if (corrigiendo) {
    return <CorregirTransformador api={api} trafo={trafo} onSucio={onSucio} onListo={() => setCorrigiendo(false)} />;
  }
  const cambioT = normalizarNumero(equipo.numeroTIngreso ?? "") !== normalizarNumero(trafo.numeroT ?? "");
  const cuantas = ordenesDelTrafo(api.taller.equipos, trafo.id).length;
  return (
    <div className="marco-cuerpo flex flex-col gap-6">
      <Datos
        trafo={trafo}
        taller={api.taller}
        rotulo="El transformador de esta O.T."
        conAvisoDeAbiertas={false}
        derecha={
          <Link href={`/panel/transformador?id=${trafo.id}`} className={`${enlace} text-[0.9375rem]`}>
            {cuantas > 1 ? `Ver sus ${cuantas} O.T.` : "Ver su ficha"}
          </Link>
        }
      >
        {cambioT && (
          <p className="text-[0.9375rem]">{equipo.numeroTIngreso ? `Esta O.T. ingresó con el N.º T ${equipo.numeroTIngreso}.` : "Esta O.T. ingresó sin N.º T."}</p>
        )}
      </Datos>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-acero pt-6">
        <button type="button" onClick={onSeguir} className="placa">
          Seguir
          <Flecha />
        </button>
        <button type="button" onClick={() => setCorrigiendo(true)} className="placa-secundaria">
          Corregir la chapa
        </button>
        <p className="min-w-[14rem] flex-1 text-[0.9375rem] leading-snug text-grafito">El transformador de una O.T. no se cambia; la chapa y el N.º T sí se pueden corregir.</p>
      </div>
    </div>
  );
}

/**
 * Corrige los datos y la chapa del transformador: todas sus O.T. muestran lo nuevo. Lo usan el paso 2 de la hoja y el
 * desplegable de datos de la ficha del transformador.
 */
export function CorregirTransformador({ api, trafo, onSucio, onListo }: { api: PropsPaso["api"]; trafo: Transformador; onSucio: (sucio: boolean) => void; onListo: () => void }) {
  const id = useId();
  const hoy = fechaParaCampo(new Date());
  const { taller, acciones } = api;
  const [inicial] = useState(() => valoresDe(trafo));
  const [valores, setValores] = useState<Valores>(inicial);
  const [errores, setErrores] = useState<Errores>({});
  const [reemplazo, setReemplazo] = useState<Reemplazo>("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(0);
  const formulario = useRef<HTMLFormElement>(null);
  useSucio(JSON.stringify(valores) !== JSON.stringify(inicial), onSucio);

  useEffect(() => {
    if (!intento) return;
    const primero = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    primero?.focus({ preventScroll: true });
    primero?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [intento]);

  const quitarError = (clave: keyof Errores) =>
    setErrores((actuales) => {
      if (!actuales[clave]) return actuales;
      const resto = { ...actuales };
      delete resto[clave];
      return resto;
    });
  const ocupadoPor = conNumeroT(taller.transformadores, trafo.empresa, valores.numeroT, trafo.id);
  const repetido = !valores.provisorio ? conMismoNumero(taller.transformadores, trafo.empresa, valores.numero, trafo.id) : undefined;

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    const conErrores = revisar(valores, { nuevo: false, hoy });
    if (ocupadoPor && !reemplazo) conErrores.numeroT = errorNumeroTOcupado;
    setErrores(conErrores);
    if (Object.keys(conErrores).length) {
      setIntento((n) => n + 1);
      return;
    }
    setGuardando(true);
    try {
      if (ocupadoPor && reemplazo) await liberarNumeroT(acciones, ocupadoPor, reemplazo);
      await acciones.editarTransformador(trafo.id, datosTransformador(valores));
      api.avisar("Se guardaron los datos del transformador. Todas sus O.T. muestran lo nuevo.");
      onListo();
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <form ref={formulario} onSubmit={guardar} noValidate>
      <div className="marco-cuerpo flex flex-col gap-6">
        <IdentidadTransformador
          id={id}
          valores={valores}
          setValores={setValores}
          errores={errores}
          quitarError={quitarError}
          nuevo={false}
          provisorioSiguiente={siguienteProvisorio(taller.transformadores)}
          ocupadoPor={ocupadoPor}
          reemplazo={reemplazo}
          onReemplazo={(elegido) => {
            setReemplazo(elegido);
            if (elegido) quitarError("numeroT");
          }}
          puedeDarDeBaja={api.puede("baja-transformadores")}
        />
        {repetido && <AvisoRepetido repetido={repetido} />}
      </div>
      <GruposChapa
        id={id}
        valores={valores}
        setValores={setValores}
        errores={errores}
        quitarError={quitarError}
        nuevo={false}
        transformadores={taller.transformadores}
        primero={false}
      />
      <PiePaso guardando={guardando} seguir="Guardar la chapa" error={error}>
        <button type="button" onClick={onListo} className="placa-secundaria max-sm:min-h-12 max-sm:px-3 max-sm:text-base" disabled={guardando}>
          Volver sin cambios
        </button>
      </PiePaso>
    </form>
  );
}

/** "¿Ya pasó por el taller?": los transformadores de la empresa; se buscan por N.º de trafo o N.º T. */
function Buscador({
  id,
  taller,
  empresaNombre,
  delCliente,
  busqueda,
  onBusqueda,
  buscando,
  lista,
  onElegir,
  onNuevo,
}: {
  id: string;
  taller: Taller;
  empresaNombre: string;
  delCliente: number;
  busqueda: string;
  onBusqueda: (texto: string) => void;
  buscando: boolean;
  lista: Transformador[];
  onElegir: (trafo: Transformador) => void;
  onNuevo: () => void;
}) {
  const visibles = buscando ? lista : lista.slice(0, A_LA_VISTA);
  const ocultos = lista.length - visibles.length;
  return (
    <>
      <p className="font-cartel text-[1.75rem] font-bold leading-[1.05]">¿Ya pasó por el taller?</p>
      {delCliente > 0 ? (
        <div>
          <label htmlFor={`${id}-buscar`} className="rotulo block text-[0.9375rem]">
            Buscar por N.º de trafo o N.º T
          </label>
          <input
            id={`${id}-buscar`}
            type="search"
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            onKeyDown={(e) => {
              // Enter acá busca: no tiene que guardar el paso antes de elegir el transformador.
              if (e.key === "Enter") e.preventDefault();
            }}
            autoComplete="off"
            className="renglon mt-1 max-w-[24rem]"
            aria-describedby={`${id}-buscar-ayuda`}
          />
          <p id={`${id}-buscar-ayuda`} className="mt-2 max-w-[60ch] text-[0.9375rem] leading-snug text-grafito">
            Entre los {delCliente === 1 ? "transformadores" : `${delCliente} transformadores`} de {empresaNombre}, también por un N.º T que tuvo antes. El N.º T
            lo pone la empresa y puede cambiar: confirme con el N.º de trafo de la chapa.
          </p>
        </div>
      ) : (
        <p className="max-w-[56ch]">{empresaNombre || "La empresa"} todavía no tiene transformadores en el taller: es uno nuevo.</p>
      )}

      {delCliente > 0 && (
        <div aria-live="polite">
          {buscando && (
            <p className="rotulo text-[0.8125rem] text-grafito">
              {lista.length === 0 ? "No se encontró ninguno" : lista.length === 1 ? "1 transformador encontrado" : `${lista.length} transformadores encontrados`}
            </p>
          )}
          {visibles.length > 0 && (
            <ul className="mt-2">
              {visibles.map((t) => (
                <Encontrado key={t.id} trafo={t} taller={taller} busqueda={busqueda} onElegir={() => onElegir(t)} />
              ))}
            </ul>
          )}
          {ocultos > 0 && <p className="mt-2 text-[0.9375rem] text-grafito">Y {ocultos === 1 ? "1 más" : `${ocultos} más`}: escriba su número para encontrarlo.</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t-2 border-acero pt-5">
        <p>{buscando && !lista.some((t) => !t.baja) ? "¿No es ninguno? Es la primera vez que viene." : "¿No está? Es la primera vez que viene."}</p>
        <button type="button" onClick={onNuevo} className="placa-secundaria">
          Es un transformador nuevo
        </button>
      </div>
    </>
  );
}

function Encontrado({ trafo, taller, busqueda, onElegir }: { trafo: Transformador; taller: Taller; busqueda: string; onElegir: () => void }) {
  const ordenes = ordenesDelTrafo(taller.equipos, trafo.id);
  const ultima = ordenes[0];
  const abiertas = ordenes.filter((o) => o.estado !== "entregado");
  // Si se lo encontró por un N.º T que tuvo antes, se dice: hoy puede tenerlo otro transformador.
  const buscado = normalizarNumero(busqueda);
  const contiene = (numero: string | undefined) => !!numero && normalizarNumero(numero).includes(buscado);
  const porAnterior = !buscado || contiene(trafo.numero) || contiene(trafo.numeroT) ? undefined : numerosTAnteriores(taller.equipos, trafo).find(contiene);
  return (
    <li className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-acero py-4 ${trafo.baja ? "text-grafito" : ""}`}>
      <div className="min-w-0">
        <p className="font-cartel text-[1.5rem] font-bold leading-tight">
          {trafo.baja ? <s>{nombreTrafo(trafo)}</s> : nombreTrafo(trafo)}
          {trafo.provisorio && <MarcaTemporal />}
        </p>
        {porAnterior && (
          <p className="text-[0.9375rem] font-medium leading-snug">
            Antes ingresó con el N.º T {porAnterior}; {trafo.numeroT ? `hoy tiene el ${trafo.numeroT}` : "hoy no tiene N.º T"}.
          </p>
        )}
        <p className="text-[0.9375rem] leading-snug">
          {resumenChapa(trafo)}
          {trafo.baja ? (
            <> · Dado de baja el {formatearFecha(trafo.baja)}</>
          ) : ultima ? (
            <>
              {" "}
              · Tiene {ordenes.length === 1 ? "1 O.T." : `${ordenes.length} O.T.`}, la última ingresó el{" "}
              {ultima.etapas.ingresado ? formatearFecha(ultima.etapas.ingresado) : "(sin fecha)"}
            </>
          ) : null}
        </p>
        {!trafo.baja && abiertas.length > 0 && (
          <p className="text-[0.9375rem] font-medium leading-snug">
            {abiertas.length === 1 ? "Tiene una O.T. que todavía no se entregó" : `Tiene ${abiertas.length} O.T. que todavía no se entregaron`}:
            revise que no sea el mismo ingreso.
          </p>
        )}
      </div>
      {trafo.baja ? (
        <Link href={`/panel/transformador?id=${trafo.id}`} target="_blank" className={`${enlace} text-[0.9375rem]`}>
          Ver su historial<span className="sr-only">, en otra pestaña</span>
        </Link>
      ) : (
        <button type="button" onClick={onElegir} className="placa-secundaria">
          Es este<span className="sr-only">: {nombreTrafo(trafo)}</span>
        </button>
      )}
    </li>
  );
}

/** Los números de un transformador y lo principal de su chapa, para revisarlos con el equipo a la vista. */
function Datos({
  trafo,
  taller,
  rotulo,
  derecha,
  conAvisoDeAbiertas = true,
  children,
}: {
  trafo: Transformador;
  taller: Taller;
  rotulo: string;
  derecha?: ReactNode;
  conAvisoDeAbiertas?: boolean;
  children?: ReactNode;
}) {
  const placa = trafo.placa;
  const abiertas = ordenesDelTrafo(taller.equipos, trafo.id).filter((o) => o.estado !== "entregado");
  const filas: [string, string | undefined][] = [
    ["N.º de trafo", trafo.provisorio ? `${trafo.numero} (temporal)` : trafo.numero],
    ["N.º T", trafo.numeroT],
    ["Fabricante", placa?.fabricante],
    ["Potencia", placa?.potencia ? `${formatearNumero(placa.potencia)} kVA${placa.fases ? ` · ${NOMBRE_FASES[placa.fases].toLowerCase()}` : ""}` : undefined],
    [
      "Tensiones",
      placa?.tensionPrimaria && placa.tensionSecundaria
        ? `${formatearNumero(placa.tensionPrimaria)} / ${formatearNumero(placa.tensionSecundaria)} V`
        : undefined,
    ],
    ["Año de fabricación", placa?.anio ? String(placa.anio) : undefined],
  ];
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="rotulo text-[0.8125rem] text-grafito">{rotulo}</p>
          <p className="mt-1 font-cartel text-[2rem] font-bold leading-none">
            {nombreTrafo(trafo)}
            {trafo.provisorio && <MarcaTemporal />}
          </p>
        </div>
        {derecha}
      </div>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
        {filas.map(([nombre, valor]) => (
          <div key={nombre}>
            <dt className="rotulo text-[0.8125rem] text-grafito">{nombre}</dt>
            <dd className={`mt-0.5 ${valor ? "" : "text-grafito"}`}>{valor ?? "Sin cargar"}</dd>
          </div>
        ))}
      </dl>
      {children}
      {conAvisoDeAbiertas && abiertas.length > 0 && (
        <p className="max-w-[60ch] font-medium">
          {abiertas.length === 1 ? "Tiene una O.T. que todavía no se entregó" : `Tiene ${abiertas.length} O.T. que todavía no se entregaron`}:
          revise que no esté registrando el mismo ingreso dos veces.
        </p>
      )}
    </>
  );
}
