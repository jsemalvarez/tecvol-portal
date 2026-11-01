"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { nombreDe, TextoEstado } from "@/components/portal/piezas";
import { Senal } from "@/components/senal/Senal";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { DEFINICIONES } from "@/lib/dominio/estados";
import { fechaDeCampo, fechaParaCampo, formatearFecha } from "@/lib/dominio/fechas";
import { describirEquipo, formatearNumero, NOMBRE_FASES } from "@/lib/dominio/placa";
import { activos, type DatosOrden, type DatosTransformador, type EquipoCliente, type EquipoTaller, type Taller, type Transformador } from "@/lib/dominio/tipos";
import {
  buscarTransformadores,
  conNumeroT,
  nombreTrafo,
  normalizarNumero,
  numerosTAnteriores,
  ordenesDelTrafo,
  siguienteOrdenTemporal,
  siguienteProvisorio,
} from "@/lib/dominio/trafo";
import { ErrorFormulario, MensajeCampo, mensajeDeError } from "../Dialogo";
import type { AccionesPanel } from "../usePanel";
import { BotonTemporal, CampoTexto, MarcaTemporal } from "./campos";
import {
  CampoNumeroT,
  ChapaTransformador,
  datosDe,
  errorNumeroTOcupado,
  IdentidadTransformador,
  liberarNumeroT,
  type Reemplazo,
} from "./CamposTransformador";
import { useAvisoAlSalir } from "./useAvisoAlSalir";
import {
  FALTA_NUMERO_ORDEN,
  NUEVA_EMPRESA,
  placaDe,
  revisar,
  revisarOrden,
  valoresDe,
  valoresOrdenDe,
  type Errores,
  type ErroresOrden,
  type Valores,
  type ValoresOrden,
} from "./valores";

const enlace = "font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/** "el cliente y las fases": lo que falta, en una frase. */
function enumerar(partes: string[]) {
  return partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
}

/** Los datos de un transformador para guardar. La descripción que ve el cliente se arma con la chapa. */
export function datosTransformador(valores: Valores): DatosTransformador {
  const placa = placaDe(valores);
  return {
    numero: valores.numero.trim(),
    provisorio: valores.provisorio || undefined,
    numeroT: valores.numeroT.trim() || undefined,
    equipo: describirEquipo(placa) ?? "Transformador",
    uso: valores.uso || undefined,
    placa: Object.keys(placa).length ? placa : undefined,
  };
}

/** "Trifásico 315 kVA · 13,2/0,4 kV": lo principal de la chapa, en una línea. */
export function resumenChapa(trafo: Transformador) {
  const resumen = (describirEquipo(trafo.placa) ?? trafo.equipo).replace(/^Transformador /, "");
  return resumen.charAt(0).toUpperCase() + resumen.slice(1);
}

/** Los datos de la orden para guardar. */
function datosOrden(orden: ValoresOrden): DatosOrden {
  return {
    numeroOrden: orden.numeroOrden.trim(),
    numeroOrdenTemporal: orden.numeroOrdenTemporal || undefined,
    referencia: orden.referencia.trim() || undefined,
    motivo: orden.motivo.trim() || undefined,
  };
}

/**
 * El N.º de O.T., obligatorio. Si todavía no llegó el del sistema de gestión, se usa uno temporal, que
 * queda marcado hasta que se escriba el verdadero. Si otra O.T. tiene el mismo número, solo se avisa: puede
 * ser un error de tipeo o varias facturadas juntas.
 */
function CampoNumeroOrden({
  id,
  orden,
  setOrden,
  error,
  quitarError,
  equipos,
  excepto,
}: {
  id: string;
  orden: ValoresOrden;
  setOrden: Dispatch<SetStateAction<ValoresOrden>>;
  error?: string;
  quitarError: () => void;
  /** Todas las órdenes, también las dadas de baja: el temporal que sigue no repite ninguno. */
  equipos: EquipoTaller[];
  /** La orden que se está editando. */
  excepto?: string;
}) {
  const mismaOrden = useMemo(() => {
    const numero = normalizarNumero(orden.numeroOrden);
    if (!numero || orden.numeroOrdenTemporal) return [];
    return activos(equipos).filter((e) => e.codigo !== excepto && e.numeroOrden && normalizarNumero(e.numeroOrden) === numero);
  }, [orden.numeroOrden, orden.numeroOrdenTemporal, equipos, excepto]);

  let ayuda: ReactNode = "El del sistema de gestión, con el que se factura.";
  if (orden.numeroOrdenTemporal) {
    ayuda = (
      <span>
        <span className="font-semibold text-tinta">N.º temporal.</span> Cuando tenga el del sistema de gestión, escríbalo en su lugar
        {excepto ? "." : " desde «Editar» en la O.T."}
      </span>
    );
  } else if (mismaOrden.length > 0) {
    ayuda = (
      <span className="font-medium text-tinta">
        Este número ya está en {enumerar(mismaOrden.map((e) => formatearCodigo(e.codigo)))}. Revíselo; si se facturan juntas, puede seguir.
      </span>
    );
  }

  return (
    <div>
      <CampoTexto
        id={id}
        etiqueta="N.º de O.T."
        obligatorio
        valor={orden.numeroOrden}
        onCambio={(valor) => {
          // Escribir encima del temporal es cargar el verdadero.
          setOrden((o) => ({ ...o, numeroOrden: valor, numeroOrdenTemporal: false }));
          quitarError();
        }}
        error={error}
        maxLength={30}
        ancho="max-w-[14rem]"
        ayuda={ayuda}
      />
      {!orden.numeroOrdenTemporal && !orden.numeroOrden.trim() && (
        <BotonTemporal
          cuando="Si todavía no lo tiene."
          onClick={() => {
            // Sin contar la que se edita: todavía tiene guardado el temporal que se acaba de borrar.
            const otras = equipos.filter((e) => e.codigo !== excepto);
            setOrden((o) => ({ ...o, numeroOrden: siguienteOrdenTemporal(otras), numeroOrdenTemporal: true }));
            quitarError();
          }}
        />
      )}
    </div>
  );
}

type Modo = { tipo: "buscar" } | { tipo: "existente"; id: string } | { tipo: "nuevo" };

/**
 * Una orden de trabajo nueva, en una sola pantalla: arriba la orden (el cliente primero) y abajo el
 * transformador que llegó. Se busca entre los del cliente por N.º de trafo o N.º T: si ya pasó por el
 * taller, se elige; si no, se da de alta con su chapa. Desde la ficha de un transformador llega elegido
 * (`trafoInicial`). Al costado, cómo lo va a ver el cliente.
 */
export function FormularioOT({
  taller,
  acciones,
  crearEmpresas,
  puedeDarDeBaja,
  trafoInicial,
  onRegistrado,
}: {
  taller: Taller;
  acciones: AccionesPanel;
  /** Si puede dar de alta un cliente nuevo desde acá. Si no, elige solo entre las empresas que ya existen. */
  crearEmpresas: boolean;
  puedeDarDeBaja: boolean;
  trafoInicial?: string;
  onRegistrado: (equipo: EquipoTaller) => void;
}) {
  const id = useId();
  const hoy = fechaParaCampo(new Date());
  const empresas = activos(taller.empresas);
  const elegidoInicial = trafoInicial ? taller.transformadores.find((t) => t.id === trafoInicial && !t.baja) : undefined;
  const empresaInicial = elegidoInicial?.empresa ?? (empresas.length || !crearEmpresas ? "" : NUEVA_EMPRESA);

  const [orden, setOrden] = useState<ValoresOrden>(() => valoresOrdenDe(undefined, hoy, empresaInicial));
  const [modo, setModo] = useState<Modo>(elegidoInicial ? { tipo: "existente", id: elegidoInicial.id } : { tipo: "buscar" });
  const [busqueda, setBusqueda] = useState("");
  const [valores, setValores] = useState<Valores>(() => valoresDe(undefined));
  const [reemplazo, setReemplazo] = useState<Reemplazo>("");
  // El N.º T con el que llegó un transformador que ya pasó por el taller, si no es el que tiene cargado.
  const [cambioT, setCambioT] = useState<string | null>(null);
  const [reemplazoT, setReemplazoT] = useState<Reemplazo>("");
  const [errorT, setErrorT] = useState<string | undefined>();
  const [erroresOrden, setErroresOrden] = useState<ErroresOrden>({});
  const [errores, setErrores] = useState<Errores>({});
  const [errorTrafo, setErrorTrafo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(0);
  const formulario = useRef<HTMLFormElement>(null);
  const seccionTrafo = useRef<HTMLElement>(null);

  const sucio =
    orden.numeroOrden !== "" || orden.referencia !== "" || orden.motivo !== "" || busqueda !== "" || modo.tipo === "nuevo";
  useAvisoAlSalir(sucio && !guardando);

  // Después de un intento con errores, el foco va al primero, para que se vea qué falta.
  useEffect(() => {
    if (!intento) return;
    const primero = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    primero?.focus({ preventScroll: true });
    primero?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [intento]);

  const empresa = orden.empresa === NUEVA_EMPRESA ? "" : orden.empresa;
  const empresaNombre =
    orden.empresa === NUEVA_EMPRESA ? orden.nombreEmpresa.trim() : taller.empresas.find((e) => e.id === orden.empresa)?.nombre ?? "";
  const elegido = modo.tipo === "existente" ? taller.transformadores.find((t) => t.id === modo.id) : undefined;
  const encontrados = useMemo(
    () => (modo.tipo === "buscar" && empresa ? buscarTransformadores(taller, empresa, busqueda) : []),
    [modo.tipo, empresa, busqueda, taller],
  );
  const delCliente = empresa ? taller.transformadores.filter((t) => t.empresa === empresa).length : 0;
  const ocupadoPor = modo.tipo === "nuevo" && empresa ? conNumeroT(taller.transformadores, empresa, valores.numeroT) : undefined;
  const cambiaT = !!elegido && cambioT !== null && normalizarNumero(cambioT) !== normalizarNumero(elegido.numeroT ?? "");
  const ocupadoT = cambiaT ? conNumeroT(taller.transformadores, elegido.empresa, cambioT, elegido.id) : undefined;

  const cambiarOrden = (campo: keyof ValoresOrden) => (valor: string) => {
    setOrden((o) => ({ ...o, [campo]: valor }));
    setErroresOrden((e) => ({ ...e, [campo]: undefined }));
  };

  const quitarError = (clave: keyof Errores) =>
    setErrores((actuales) => {
      if (!actuales[clave]) return actuales;
      const resto = { ...actuales };
      delete resto[clave];
      return resto;
    });

  /** Otro cliente: el transformador elegido era del anterior, así que se vuelve a buscar. */
  function cambiarEmpresa(valor: string) {
    cambiarOrden("empresa")(valor);
    if (modo.tipo === "existente") volverABuscar();
    setReemplazo("");
  }

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
    const conErroresOrden = revisarOrden(orden, { nuevo: true, hoy });
    const conErrores = modo.tipo === "nuevo" ? revisar(valores, { nuevo: true, hoy }) : {};
    if (modo.tipo === "nuevo" && ocupadoPor && !reemplazo) conErrores.numeroT = errorNumeroTOcupado;
    const conErrorT = ocupadoT && !reemplazoT ? errorNumeroTOcupado : undefined;
    setErroresOrden(conErroresOrden);
    setErrores(conErrores);
    setErrorT(conErrorT);
    const sinTrafo = modo.tipo === "buscar" || (modo.tipo === "existente" && !elegido);
    setErrorTrafo(sinTrafo ? "Diga qué transformador llegó: búsquelo o dé de alta uno nuevo." : null);
    if (Object.keys(conErroresOrden).some((c) => conErroresOrden[c as keyof ErroresOrden]) || Object.keys(conErrores).length || conErrorT) {
      setIntento((n) => n + 1);
      return;
    }
    if (sinTrafo) {
      seccionTrafo.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }

    setGuardando(true);
    try {
      let empresaId = orden.empresa;
      if (empresaId === NUEVA_EMPRESA) {
        // Desde acá solo el nombre: los datos de facturación se completan después en "Empresas y cuentas".
        empresaId = (await acciones.crearEmpresa({ nombre: orden.nombreEmpresa.trim() })).id;
        // Si lo que sigue falla, al reintentar se usa la empresa ya creada en vez de crear otra.
        setOrden((o) => ({ ...o, empresa: empresaId, nombreEmpresa: "" }));
      }
      if (modo.tipo === "nuevo" && ocupadoPor && reemplazo) await liberarNumeroT(acciones, ocupadoPor, reemplazo);
      // Llegó con otro N.º T: se le cambia antes de crear la O.T., que guarda el N.º T con el que ingresó.
      if (elegido && cambiaT) {
        if (ocupadoT && reemplazoT) await liberarNumeroT(acciones, ocupadoT, reemplazoT);
        await acciones.editarTransformador(elegido.id, { ...datosDe(elegido), numeroT: cambioT?.trim() || undefined });
      }
      const trafo = modo.tipo === "existente" ? modo.id : { empresa: empresaId, datos: datosTransformador(valores) };
      onRegistrado(await acciones.registrar(datosOrden(orden), fechaDeCampo(orden.ingreso) ?? new Date(), trafo));
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  const campoId = (campo: string) => `${id}-${campo}`;
  const descripcion = elegido?.equipo ?? (modo.tipo === "nuevo" ? datosTransformador(valores).equipo : "Transformador");
  const vistaPrevia: EquipoCliente = {
    codigo: "",
    estado: "ingresado",
    etapas: { ingresado: fechaDeCampo(orden.ingreso) ?? undefined },
    actualizado: null,
    equipo: descripcion,
    referencia: orden.referencia.trim() || undefined,
  };
  const definicion = DEFINICIONES[vistaPrevia.estado];
  const faltan: string[] = [];
  if (!orden.empresa || (orden.empresa === NUEVA_EMPRESA && !orden.nombreEmpresa.trim())) faltan.push("el cliente");
  if (!orden.numeroOrden.trim()) faltan.push("el N.º de O.T.");
  if (modo.tipo === "buscar") faltan.push("el transformador");
  if (modo.tipo === "nuevo" && !valores.numero.trim()) faltan.push("el N.º de trafo");
  if (modo.tipo === "nuevo" && !valores.fases) faltan.push("las fases");

  return (
    <form ref={formulario} onSubmit={guardar} noValidate className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="flex flex-col gap-10 lg:col-span-8">
        <section aria-labelledby={`${id}-orden`} className="marco">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 id={`${id}-orden`} className="rotulo text-base">
              1 · Orden de trabajo
            </h2>
          </div>
          <div className="marco-cuerpo">
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor={campoId("empresa")} className="rotulo block text-[0.9375rem]">
                  Cliente <span className="font-semibold normal-case tracking-normal text-grafito">(obligatorio)</span>
                </label>
                <select
                  id={campoId("empresa")}
                  value={orden.empresa}
                  onChange={(e) => cambiarEmpresa(e.target.value)}
                  aria-invalid={erroresOrden.empresa ? true : undefined}
                  aria-describedby={erroresOrden.empresa ? `${campoId("empresa")}-error` : `${campoId("empresa")}-ayuda`}
                  className="renglon mt-1 max-w-[32rem]"
                >
                  <option value="" disabled>
                    Elegir…
                  </option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                  {crearEmpresas && <option value={NUEVA_EMPRESA}>Otro cliente, nuevo…</option>}
                </select>
                <MensajeCampo id={`${campoId("empresa")}-error`} texto={erroresOrden.empresa} />
                <p id={`${campoId("empresa")}-ayuda`} className="mt-2 text-[0.9375rem] leading-snug text-grafito">
                  {crearEmpresas
                    ? "El dueño del transformador. Abajo se busca entre sus transformadores."
                    : "El dueño del transformador. ¿No está? Pídale a un administrador que lo dé de alta."}
                </p>
              </div>
              {orden.empresa === NUEVA_EMPRESA && (
                <CampoTexto
                  id={campoId("nombreEmpresa")}
                  etiqueta="Nombre del cliente nuevo"
                  obligatorio
                  valor={orden.nombreEmpresa}
                  onCambio={cambiarOrden("nombreEmpresa")}
                  error={erroresOrden.nombreEmpresa}
                  className="sm:col-span-2"
                />
              )}
              <CampoNumeroOrden
                id={campoId("numeroOrden")}
                orden={orden}
                setOrden={setOrden}
                error={erroresOrden.numeroOrden}
                quitarError={() => setErroresOrden((e) => ({ ...e, numeroOrden: undefined }))}
                equipos={taller.equipos}
              />
              <div>
                <label htmlFor={campoId("ingreso")} className="rotulo block text-[0.9375rem]">
                  Fecha de recepción <span className="font-semibold normal-case tracking-normal text-grafito">(obligatorio)</span>
                </label>
                <input
                  id={campoId("ingreso")}
                  type="date"
                  value={orden.ingreso}
                  max={hoy}
                  onChange={(e) => cambiarOrden("ingreso")(e.target.value)}
                  aria-invalid={erroresOrden.ingreso ? true : undefined}
                  aria-describedby={erroresOrden.ingreso ? `${campoId("ingreso")}-error` : undefined}
                  className="renglon mt-1 w-[11.5rem]"
                />
                <MensajeCampo id={`${campoId("ingreso")}-error`} texto={erroresOrden.ingreso} />
              </div>
              <CampoTexto
                id={campoId("referencia")}
                etiqueta="Referencia del cliente"
                valor={orden.referencia}
                onCambio={cambiarOrden("referencia")}
                className="sm:col-span-2"
                ayuda="Dónde estaba instalado o cómo lo llama el cliente. Por ejemplo: «Subestación Barrio Norte»."
              />
              <CampoTexto
                id={campoId("motivo")}
                etiqueta="Motivo del ingreso"
                valor={orden.motivo}
                onCambio={cambiarOrden("motivo")}
                maxLength={400}
                className="sm:col-span-2"
                ayuda="Lo que informa el cliente: una falla, pérdida de aceite, un mantenimiento…"
              />
            </div>
          </div>
        </section>

        <section ref={seccionTrafo} aria-labelledby={`${id}-trafo`} className="marco scroll-mt-6">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 id={`${id}-trafo`} className="rotulo text-base">
              2 · Transformador
            </h2>
            {elegido && <span className="etiqueta">Su {ordenesDelTrafo(taller.equipos, elegido.id).length + 1}.ª O.T.</span>}
            {modo.tipo === "nuevo" && <span className="etiqueta">Nuevo</span>}
          </div>
          <div className="marco-cuerpo flex flex-col gap-6">
            {modo.tipo === "buscar" && (
              <Buscador
                id={id}
                taller={taller}
                empresa={empresa}
                empresaNombre={empresaNombre}
                delCliente={delCliente}
                busqueda={busqueda}
                onBusqueda={setBusqueda}
                encontrados={encontrados}
                onElegir={elegir}
                onNuevo={darDeAlta}
              />
            )}
            {elegido && (
              <Elegido trafo={elegido} taller={taller} onCambiar={volverABuscar}>
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
                      id={campoId("numeroTIngreso")}
                      valor={cambioT}
                      onCambio={(valor) => {
                        setCambioT(valor);
                        setErrorT(undefined);
                      }}
                      error={errorT}
                      ayuda={`El que trae pintado o en la etiqueta del cliente. Queda en el transformador y en esta O.T.${elegido.numeroT ? `; el ${elegido.numeroT} sigue en el historial de sus O.T. anteriores` : ""}.`}
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
              </Elegido>
            )}
            {modo.tipo === "nuevo" && (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <p className="max-w-[56ch]">
                    Es la primera vez que viene. Queda dado de alta como transformador de{" "}
                    <strong className="font-semibold">{empresaNombre || "el cliente que elija arriba"}</strong>.
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
              </>
            )}
            <ErrorFormulario texto={errorTrafo} />
          </div>
        </section>

        {modo.tipo === "nuevo" && (
          <ChapaTransformador
            id={id}
            valores={valores}
            setValores={setValores}
            errores={errores}
            quitarError={quitarError}
            nuevo
            transformadores={taller.transformadores}
          />
        )}
      </div>

      <aside aria-labelledby={`${id}-cliente`} className="border-t-[3px] border-acero pt-5 lg:sticky lg:top-8 lg:col-span-4 lg:self-start">
        <h2 id={`${id}-cliente`} className="rotulo text-base">
          Así lo ve el cliente
        </h2>
        <div className="mt-4 flex items-start gap-4">
          <Senal forma={definicion.forma} pictograma={vistaPrevia.estado} simple className="size-12 shrink-0" />
          <div className="min-w-0">
            <p className="text-[0.9375rem] leading-snug">
              <TextoEstado equipo={vistaPrevia} />
            </p>
            <p className="mt-1 text-lg font-semibold leading-snug">{nombreDe(vistaPrevia)}</p>
            {vistaPrevia.referencia && <p className="leading-snug">{descripcion}</p>}
            <p className="text-[0.9375rem] leading-snug">{empresaNombre || <span className="text-grafito">Sin cliente</span>}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-start gap-4 border-t border-acero pt-6">
          <ErrorFormulario texto={error} />
          {faltan.length > 0 && <p className="text-[0.9375rem] leading-snug">Para crear la O.T. falta {enumerar(faltan)}.</p>}
          <button type="submit" className="placa" disabled={guardando}>
            {guardando ? "Guardando…" : "Crear O.T."}
          </button>
          <p className="max-w-[40ch] text-[0.9375rem] leading-snug">
            Entra como «Ingresado» con un código de seguimiento nuevo y queda en el historial del transformador.
          </p>
        </div>
      </aside>
    </form>
  );
}

/** "¿Ya pasó por el taller?": busca entre los transformadores del cliente por N.º de trafo o N.º T. */
function Buscador({
  id,
  taller,
  empresa,
  empresaNombre,
  delCliente,
  busqueda,
  onBusqueda,
  encontrados,
  onElegir,
  onNuevo,
}: {
  id: string;
  taller: Taller;
  empresa: string;
  empresaNombre: string;
  delCliente: number;
  busqueda: string;
  onBusqueda: (texto: string) => void;
  encontrados: Transformador[];
  onElegir: (trafo: Transformador) => void;
  onNuevo: () => void;
}) {
  const buscando = normalizarNumero(busqueda).length >= 2;
  return (
    <>
      <p className="font-cartel text-[1.75rem] font-bold leading-[1.05]">¿Ya pasó por el taller?</p>
      {empresa && delCliente > 0 ? (
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
              // Enter acá busca: no tiene que crear la O.T. antes de elegir el transformador.
              if (e.key === "Enter") e.preventDefault();
            }}
            autoComplete="off"
            className="renglon mt-1 max-w-[24rem]"
            aria-describedby={`${id}-buscar-ayuda`}
          />
          <p id={`${id}-buscar-ayuda`} className="mt-2 max-w-[60ch] text-[0.9375rem] leading-snug text-grafito">
            Entre los {delCliente === 1 ? "transformadores" : `${delCliente} transformadores`} de {empresaNombre}. Mírelos en la chapa o en la
            etiqueta del cliente. El N.º T lo pone el cliente y puede cambiar: confirme con el N.º de trafo de la chapa.
          </p>
        </div>
      ) : (
        <p className="max-w-[56ch]">
          {empresa
            ? `${empresaNombre} todavía no tiene transformadores en el taller: es uno nuevo.`
            : empresaNombre
              ? "Es un cliente nuevo: el transformador también."
              : "Elija primero el cliente: se busca entre sus transformadores."}
        </p>
      )}

      {buscando && (
        <div aria-live="polite">
          <p className="rotulo text-[0.8125rem] text-grafito">
            {encontrados.length === 0
              ? "No se encontró ninguno"
              : encontrados.length === 1
                ? "1 transformador encontrado"
                : `${encontrados.length} transformadores encontrados`}
          </p>
          {encontrados.length > 0 && (
            <ul className="mt-2">
              {encontrados.map((t) => (
                <Encontrado key={t.id} trafo={t} taller={taller} busqueda={busqueda} onElegir={() => onElegir(t)} />
              ))}
            </ul>
          )}
        </div>
      )}

      {(empresa || empresaNombre) && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t-2 border-acero pt-5">
          <p>{buscando && !encontrados.some((t) => !t.baja) ? "¿No es ninguno? Es la primera vez que viene." : "¿No está? Es la primera vez que viene."}</p>
          <button type="button" onClick={onNuevo} className="placa-secundaria">
            Es un transformador nuevo
          </button>
        </div>
      )}
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
  const porAnterior = contiene(trafo.numero) || contiene(trafo.numeroT) ? undefined : numerosTAnteriores(taller.equipos, trafo).find(contiene);
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

/**
 * El transformador elegido: sus números y lo principal de su chapa, para revisarlos con el equipo a la
 * vista. Debajo (`children`), cómo cargar el N.º T si llegó con otro.
 */
function Elegido({ trafo, taller, onCambiar, children }: { trafo: Transformador; taller: Taller; onCambiar: () => void; children: ReactNode }) {
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
          <p className="rotulo text-[0.8125rem] text-grafito">Ya pasó por el taller</p>
          <p className="mt-1 font-cartel text-[2rem] font-bold leading-none">{nombreTrafo(trafo)}</p>
        </div>
        <button type="button" onClick={onCambiar} className={`${enlace} cursor-pointer text-[0.9375rem]`}>
          Buscar otro
        </button>
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
      {abiertas.length > 0 && (
        <p className="max-w-[60ch] font-medium">
          {abiertas.length === 1 ? "Tiene una O.T. que todavía no se entregó" : `Tiene ${abiertas.length} O.T. que todavía no se entregaron`}:
          revise que no esté registrando el mismo ingreso dos veces.
        </p>
      )}
      <p className="text-[0.9375rem]">
        ¿Algo no coincide con la chapa?{" "}
        <Link href={`/panel/transformador/editar?id=${trafo.id}`} target="_blank" className={enlace}>
          Editar datos del transformador<span className="sr-only">, en otra pestaña</span>
        </Link>
      </p>
    </>
  );
}

/**
 * Corregir o completar los datos de una orden ya registrada: el N.º de O.T., la referencia y el motivo.
 * El cliente y la chapa son del transformador: se editan en su ficha.
 */
export function FormularioOrden({
  taller,
  acciones,
  equipo,
  onGuardado,
}: {
  taller: Taller;
  acciones: AccionesPanel;
  equipo: EquipoTaller;
  onGuardado: (equipo: EquipoTaller) => void;
}) {
  const id = useId();
  const [inicial] = useState(() => valoresOrdenDe(equipo, "", equipo.empresa));
  const [orden, setOrden] = useState(inicial);
  const [errorNumero, setErrorNumero] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  useAvisoAlSalir(JSON.stringify(orden) !== JSON.stringify(inicial) && !guardando);

  const trafo = taller.transformadores.find((t) => t.id === equipo.trafo);
  const empresa = taller.empresas.find((e) => e.id === equipo.empresa)?.nombre ?? "";
  const cambiar = (campo: keyof ValoresOrden) => (valor: string) => setOrden((o) => ({ ...o, [campo]: valor }));

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    if (!orden.numeroOrden.trim()) {
      setErrorNumero(FALTA_NUMERO_ORDEN);
      document.getElementById(`${id}-numeroOrden`)?.focus();
      return;
    }
    setGuardando(true);
    const datos = datosOrden(orden);
    try {
      await acciones.editar(equipo.codigo, datos);
      onGuardado({ ...equipo, ...datos });
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="flex flex-col gap-10 lg:col-span-8">
        <section aria-labelledby={`${id}-orden`} className="marco">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 id={`${id}-orden`} className="rotulo text-base">
              Orden de trabajo
            </h2>
          </div>
          <div className="marco-cuerpo grid gap-x-8 gap-y-7 sm:grid-cols-2">
            <CampoNumeroOrden
              id={`${id}-numeroOrden`}
              orden={orden}
              setOrden={setOrden}
              error={errorNumero}
              quitarError={() => setErrorNumero(undefined)}
              equipos={taller.equipos}
              excepto={equipo.codigo}
            />
            <div>
              <p className="rotulo text-[0.9375rem]">Fecha de recepción</p>
              <p className="mt-1 py-2 text-[1.125rem]">{equipo.etapas.ingresado ? formatearFecha(equipo.etapas.ingresado) : "Sin fecha"}</p>
              <p className="mt-1 text-[0.9375rem] leading-snug text-grafito">Se corrige desde «Cambiar estado».</p>
            </div>
            <CampoTexto
              id={`${id}-referencia`}
              etiqueta="Referencia del cliente"
              valor={orden.referencia}
              onCambio={cambiar("referencia")}
              className="sm:col-span-2"
              ayuda="Dónde estaba instalado o cómo lo llama el cliente."
            />
            <CampoTexto
              id={`${id}-motivo`}
              etiqueta="Motivo del ingreso"
              valor={orden.motivo}
              onCambio={cambiar("motivo")}
              maxLength={400}
              className="sm:col-span-2"
              ayuda="Lo que informó el cliente al mandarlo."
            />
          </div>
        </section>

        <section aria-labelledby={`${id}-trafo`} className="marco">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 id={`${id}-trafo`} className="rotulo text-base">
              Transformador
            </h2>
          </div>
          <div className="marco-cuerpo flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <div>
              <p className="font-cartel text-[1.75rem] font-bold leading-none">{trafo ? nombreTrafo(trafo) : "Sin transformador"}</p>
              <p className="mt-1 text-[0.9375rem]">
                {[trafo && resumenChapa(trafo), empresa].filter(Boolean).join(" · ")}
              </p>
              {trafo && (equipo.numeroTIngreso ?? "") !== (trafo.numeroT ?? "") && (
                <p className="mt-1 text-[0.9375rem]">
                  {equipo.numeroTIngreso ? `Esta O.T. ingresó con el N.º T ${equipo.numeroTIngreso}.` : "Esta O.T. ingresó sin N.º T."}
                </p>
              )}
            </div>
            {trafo && (
              <Link href={`/panel/transformador/editar?id=${trafo.id}`} className={enlace}>
                Editar sus datos y su chapa
              </Link>
            )}
          </div>
        </section>
      </div>

      <aside className="border-t-[3px] border-acero pt-5 lg:sticky lg:top-8 lg:col-span-4 lg:self-start">
        <div className="flex flex-col items-start gap-4">
          <p className="max-w-[40ch] text-[0.9375rem] leading-snug">El cliente, los números y la chapa son del transformador: se editan en su ficha.</p>
          <ErrorFormulario texto={error} />
          <button type="submit" className="placa" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </aside>
    </form>
  );
}
