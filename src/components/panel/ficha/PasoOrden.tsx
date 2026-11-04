"use client";

import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { fechaDeCampo, fechaParaCampo } from "@/lib/dominio/fechas";
import { erroresDeFechas, etapasConFechas } from "@/lib/dominio/pasos";
import { activos, type DatosOrden, type EquipoTaller, type Transformador } from "@/lib/dominio/tipos";
import { normalizarNumero, siguienteOrdenTemporal } from "@/lib/dominio/trafo";
import { MensajeCampo, mensajeDeError } from "../Dialogo";
import { BotonTemporal, CampoTexto, NoEstaLaEmpresa } from "../equipo/campos";
import { revisarOrden, valoresOrdenDe, type ErroresOrden, type ValoresOrden } from "../equipo/valores";
import type { ApiPanel } from "../PaginaPanel";
import { PiePaso, useSucio } from "./piezas";

/** "5001, 5002 y 5003": varias en una frase. */
function enumerar(partes: string[]) {
  return partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
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
        <span className="font-semibold text-tinta">N.º temporal.</span> Cuando tenga el del sistema de gestión, escríbalo en su lugar.
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

/**
 * El paso 1: los datos de la orden. Al guardarlo por primera vez, la O.T. queda en el panel con su código; la
 * empresa la ve cuando tiene transformador. Hasta entonces se le puede cambiar la empresa. Desde la ficha de
 * un transformador (`trafoInicial`), la empresa es la suya.
 */
export function PasoOrden({
  api,
  equipo,
  trafoInicial,
  onCreada,
  onSeguir,
  onSucio,
}: {
  api: ApiPanel;
  equipo?: EquipoTaller;
  trafoInicial?: Transformador;
  onCreada: (equipo: EquipoTaller) => void;
  onSeguir: () => void;
  onSucio: (sucio: boolean) => void;
}) {
  const id = useId();
  const hoy = fechaParaCampo(new Date());
  const { taller, acciones } = api;
  const empresas = activos(taller.empresas);
  const crearEmpresas = api.puede("empresas");
  const fija = !!trafoInicial || (!!equipo && !equipo.faltaTrafo);
  const [base, setBase] = useState<ValoresOrden>(() => valoresOrdenDe(equipo, hoy, trafoInicial?.empresa ?? ""));
  const [orden, setOrden] = useState(base);
  const [errores, setErrores] = useState<ErroresOrden>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(0);
  const formulario = useRef<HTMLFormElement>(null);
  useSucio(JSON.stringify(orden) !== JSON.stringify(base), onSucio);

  // Si la fecha de recepción se corrigió desde "Cambiar estado", se muestra la nueva.
  const ingresoGuardado = equipo?.etapas.ingresado ? fechaParaCampo(equipo.etapas.ingresado) : "";
  const [ingresoAnterior, setIngresoAnterior] = useState(ingresoGuardado);
  if (ingresoGuardado !== ingresoAnterior) {
    setIngresoAnterior(ingresoGuardado);
    setBase((b) => ({ ...b, ingreso: ingresoGuardado }));
    setOrden((o) => ({ ...o, ingreso: ingresoGuardado }));
  }

  useEffect(() => {
    if (!intento) return;
    const primero = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    primero?.focus({ preventScroll: true });
    primero?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [intento]);

  const cambiar = (campo: keyof ValoresOrden) => (valor: string) => {
    setOrden((o) => ({ ...o, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };
  const campoId = (campo: string) => `${id}-${campo}`;

  async function guardar(seguir: boolean) {
    setError(null);
    const encontrados = revisarOrden(orden, { nuevo: true, hoy });
    // Con transformador, la recepción es una etapa más: tiene que seguir antes que las otras.
    if (!encontrados.ingreso && equipo && !equipo.faltaTrafo) {
      const enOrden = erroresDeFechas({ ingresado: orden.ingreso }, equipo.etapas, hoy);
      if (enOrden.ingresado) encontrados.ingreso = enOrden.ingresado;
    }
    setErrores(encontrados);
    if (Object.values(encontrados).some(Boolean)) {
      setIntento((n) => n + 1);
      return;
    }

    setGuardando(true);
    try {
      const ingreso = fechaDeCampo(orden.ingreso) ?? new Date();
      if (!equipo) {
        const creada = await acciones.crearOrden(datosOrden(orden), orden.empresa, ingreso);
        api.avisar("Se guardó la O.T. La empresa la ve cuando tenga el transformador.");
        onCreada(creada);
        return;
      }
      await acciones.editar(equipo.codigo, datosOrden(orden));
      if (equipo.faltaTrafo) {
        if (orden.empresa !== equipo.empresa || orden.ingreso !== ingresoGuardado) {
          await acciones.corregirOrdenSinTrafo(equipo.codigo, orden.empresa, ingreso);
        }
      } else if (orden.ingreso !== ingresoGuardado) {
        await acciones.guardarEtapas(equipo, etapasConFechas(equipo.etapas, { ingresado: orden.ingreso }));
      }
      setBase(orden);
      api.avisar("Se guardó.");
      if (seguir) onSeguir();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    guardar(true);
  }

  return (
    <form ref={formulario} onSubmit={enviar} noValidate>
      <div className="marco-cuerpo grid gap-x-8 gap-y-7 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={campoId("empresa")} className="rotulo block text-[0.9375rem]">
            Empresa <span className="font-semibold normal-case tracking-normal text-grafito">(obligatorio)</span>
          </label>
          <select
            id={campoId("empresa")}
            value={orden.empresa}
            disabled={fija}
            onChange={(e) => cambiar("empresa")(e.target.value)}
            aria-invalid={errores.empresa ? true : undefined}
            aria-describedby={errores.empresa ? `${campoId("empresa")}-error` : `${campoId("empresa")}-ayuda`}
            className="renglon mt-1 max-w-[32rem]"
          >
            <option value="" disabled>
              Elegir…
            </option>
            {/* Una empresa dada de baja sigue apareciendo en las O.T. que ya tiene. */}
            {(orden.empresa && !empresas.some((e) => e.id === orden.empresa) ? taller.empresas.filter((e) => e.id === orden.empresa) : []).concat(empresas).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          <MensajeCampo id={`${campoId("empresa")}-error`} texto={errores.empresa} />
          <p id={`${campoId("empresa")}-ayuda`} className="mt-2 text-[0.9375rem] leading-snug text-grafito">
            {fija ? (
              "La empresa no se cambia: es la dueña del transformador."
            ) : (
              <NoEstaLaEmpresa onCrear={crearEmpresas ? () => api.abrir({ tipo: "empresa", onCreada: (nueva) => cambiar("empresa")(nueva.id) }) : undefined} />
            )}
          </p>
        </div>
        <CampoNumeroOrden
          id={campoId("numeroOrden")}
          orden={orden}
          setOrden={setOrden}
          error={errores.numeroOrden}
          quitarError={() => setErrores((e) => ({ ...e, numeroOrden: undefined }))}
          equipos={taller.equipos}
          excepto={equipo?.codigo}
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
            onChange={(e) => cambiar("ingreso")(e.target.value)}
            aria-invalid={errores.ingreso ? true : undefined}
            aria-describedby={errores.ingreso ? `${campoId("ingreso")}-error` : undefined}
            className="renglon mt-1 w-[11.5rem]"
          />
          <MensajeCampo id={`${campoId("ingreso")}-error`} texto={errores.ingreso} />
        </div>
        <CampoTexto
          id={campoId("referencia")}
          etiqueta="Referencia de la empresa"
          valor={orden.referencia}
          onCambio={cambiar("referencia")}
          className="sm:col-span-2"
          ayuda="Dónde estaba instalado o cómo lo llama la empresa. Por ejemplo: «Subestación Barrio Norte»."
        />
        <CampoTexto
          id={campoId("motivo")}
          etiqueta="Motivo del ingreso"
          valor={orden.motivo}
          onCambio={cambiar("motivo")}
          maxLength={400}
          className="sm:col-span-2"
          ayuda="Lo que informa la empresa: una falla, pérdida de aceite, un mantenimiento…"
        />
      </div>
      <PiePaso
        guardando={guardando}
        onGuardar={equipo ? () => guardar(false) : undefined}
        error={error}
        nota={!equipo || equipo.faltaTrafo ? "La O.T. queda guardada en el panel. La empresa la ve cuando tenga el transformador." : undefined}
      />
    </form>
  );
}
