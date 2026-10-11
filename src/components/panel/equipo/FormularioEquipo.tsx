"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { nombreDe, TextoEstado } from "@/components/portal/piezas";
import { Senal } from "@/components/senal/Senal";
import { DEFINICIONES } from "@/lib/dominio/estados";
import { fechaDeCampo, fechaParaCampo, formatearFecha } from "@/lib/dominio/fechas";
import {
  conmutadorSugerido,
  describirEquipo,
  FASES,
  formatearKV,
  formatearNumero,
  intensidadNominal,
  leerNumero,
  NOMBRE_FASES,
  NOMBRE_USOS,
  USOS,
  type Placa,
  type Uso,
} from "@/lib/dominio/placa";
import type { DatosEquipo, EquipoCliente, EquipoTaller, Taller } from "@/lib/dominio/tipos";
import { ErrorFormulario, MensajeCampo, mensajeDeError } from "../Dialogo";
import type { AccionesPanel } from "../usePanel";
import { CampoTexto, Grupo, Opciones, Sugerencias } from "./campos";
import { useAvisoAlSalir } from "./useAvisoAlSalir";
import { NUEVA_EMPRESA, placaDe, revisar, valoresDe, type Campo, type Errores, type Valores } from "./valores";

/** Sugerencias de base; se suman las que ya cargó el taller en otros equipos. */
const SUGERENCIAS = {
  fabricante: [] as string[],
  norma: ["IRAM 2250", "IEC 60076"],
  servicio: ["Continuo"],
  enfriamiento: ["ONAN", "ONAF", "KNAN"],
  grupoConexion: ["Dyn11", "Dyn5", "Yyn0", "Yzn11", "Dd0"],
  materialBobinados: ["Cobre", "Aluminio"],
};

type CampoSugerido = keyof typeof SUGERENCIAS;

/**
 * La descripción que ve el cliente se arma con la chapa. Un equipo cargado antes de que existiera la
 * chapa conserva su descripción hasta que se cargue la potencia.
 */
function descripcionPublica(placa: Placa, equipo?: EquipoTaller) {
  if (equipo?.equipo && !placa.potencia) return equipo.equipo;
  return describirEquipo(placa) ?? "Transformador";
}

/** "el cliente y las fases": lo que falta para poder registrar, en una frase. */
function enumerar(partes: string[]) {
  return partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}` : partes[0];
}

/**
 * Registrar un equipo (con un código nuevo) o editar sus datos. Se copia la chapa de arriba hacia
 * abajo, en el mismo orden en que la trae el equipo: identificación, características, tensiones,
 * conmutador, aceite y masa. Al costado, cómo lo va a ver el cliente.
 */
export function FormularioEquipo({
  taller,
  acciones,
  equipo,
  onRegistrado,
  onGuardado,
}: {
  taller: Taller;
  acciones: AccionesPanel;
  /** Sin equipo, el formulario registra uno nuevo. */
  equipo?: EquipoTaller;
  onRegistrado?: (equipo: EquipoTaller) => void;
  onGuardado?: (equipo: EquipoTaller) => void;
}) {
  const id = useId();
  const hoy = fechaParaCampo(new Date());
  const nuevo = !equipo;
  const [inicial] = useState(() => valoresDe(equipo, hoy, taller.empresas.length ? "" : NUEVA_EMPRESA));
  const [valores, setValores] = useState<Valores>(inicial);
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(0);
  const formulario = useRef<HTMLFormElement>(null);

  const sucio = useMemo(() => JSON.stringify(valores) !== JSON.stringify(inicial), [valores, inicial]);
  useAvisoAlSalir(sucio && !guardando);

  // Después de un intento con errores, el foco va al primero, para que se vea qué falta.
  useEffect(() => {
    if (!intento) return;
    const primero = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    primero?.focus({ preventScroll: true });
    primero?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [intento]);

  // Al corregir un campo, su error se va: el rojo queda solo donde todavía falta algo.
  const quitarError = (clave: keyof Errores) => {
    if (!errores[clave]) return;
    setErrores((actuales) => {
      const resto = { ...actuales };
      delete resto[clave];
      return resto;
    });
  };

  const cambiar = (campo: Campo) => (valor: string) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    quitarError(campo);
  };

  const cambiarPunto = (i: number) => (valor: string) => {
    setValores((v) => ({ ...v, conmutador: v.conmutador.map((p, j) => (j === i ? valor : p)) }));
    quitarError(`conmutador${i}`);
  };

  const sugerencias = useMemo(() => {
    const usadas = (campo: CampoSugerido) =>
      taller.equipos.map((e) => e.placa?.[campo as keyof Placa]).filter((v): v is string => typeof v === "string");
    return Object.fromEntries(
      (Object.keys(SUGERENCIAS) as CampoSugerido[]).map((campo) => [
        campo,
        [...new Set([...SUGERENCIAS[campo], ...usadas(campo)])].sort((a, b) => a.localeCompare(b, "es")),
      ]),
    ) as Record<CampoSugerido, string[]>;
  }, [taller.equipos]);

  const placa = placaDe(valores);
  const descripcion = descripcionPublica(placa, equipo);
  const lista = (campo: CampoSugerido) => `${id}-sugerencias-${campo}`;

  const faltan: string[] = [];
  if (!valores.empresa || (valores.empresa === NUEVA_EMPRESA && !valores.nombreEmpresa.trim())) faltan.push("el cliente");
  if (nuevo && !valores.fases) faltan.push("las fases");

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const encontrados = revisar(valores, { nuevo, hoy });
    setErrores(encontrados);
    setError(null);
    if (Object.keys(encontrados).length) {
      setIntento((n) => n + 1);
      return;
    }

    setGuardando(true);
    try {
      let empresa = valores.empresa;
      if (empresa === NUEVA_EMPRESA) {
        empresa = (await acciones.crearEmpresa(valores.nombreEmpresa.trim())).id;
        // Si lo que sigue falla, al reintentar se usa la empresa ya creada en vez de crear otra.
        setValores((v) => ({ ...v, empresa, nombreEmpresa: "" }));
      }
      const datos: DatosEquipo = {
        empresa,
        equipo: descripcion,
        referencia: valores.referencia.trim() || undefined,
        serie: valores.serie.trim() || undefined,
        numeroOrden: valores.numeroOrden.trim() || undefined,
        uso: valores.uso || undefined,
        placa: Object.keys(placa).length ? placa : undefined,
      };
      if (equipo) {
        await acciones.editar(equipo.codigo, datos);
        onGuardado?.({ ...equipo, ...datos });
      } else {
        onRegistrado?.(await acciones.registrar(datos, fechaDeCampo(valores.ingreso) ?? new Date()));
      }
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  const campoId = (campo: string) => `${id}-${campo}`;
  const comun = (campo: Campo) => ({
    id: campoId(campo),
    valor: valores[campo],
    onCambio: cambiar(campo),
    error: errores[campo],
  });
  const numero = (campo: Campo, unidad: string) => ({
    ...comun(campo),
    unidad,
    numerico: true,
    maxLength: 12,
  });

  const tensionPrimaria = leerNumero(valores.tensionPrimaria, true);
  const tensionSecundaria = leerNumero(valores.tensionSecundaria, true);
  const conmutadorVacio = valores.conmutador.every((p) => !p.trim());
  const empresaNombre =
    valores.empresa === NUEVA_EMPRESA ? valores.nombreEmpresa.trim() : taller.empresas.find((e) => e.id === valores.empresa)?.nombre ?? "";

  // El equipo tal como aparecerá en el portal: estado, fecha, referencia y descripción.
  const vistaPrevia: EquipoCliente = equipo
    ? { ...equipo, equipo: descripcion, referencia: valores.referencia.trim() || undefined }
    : {
        codigo: "",
        estado: "ingresado",
        etapas: { ingresado: fechaDeCampo(valores.ingreso) ?? undefined },
        actualizado: null,
        equipo: descripcion,
        referencia: valores.referencia.trim() || undefined,
      };
  const definicion = DEFINICIONES[vistaPrevia.estado];

  return (
    <form ref={formulario} onSubmit={guardar} noValidate className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="flex flex-col gap-10 lg:col-span-8">
        <div className="marco">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 className="rotulo text-base">Recepción</h2>
          </div>
          <div className="marco-cuerpo">
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
              <div>
                <label htmlFor={campoId("empresa")} className="rotulo block text-[0.9375rem]">
                  Cliente <span className="font-semibold normal-case tracking-normal text-grafito">(obligatorio)</span>
                </label>
                <select
                  id={campoId("empresa")}
                  value={valores.empresa}
                  onChange={(e) => cambiar("empresa")(e.target.value)}
                  aria-invalid={errores.empresa ? true : undefined}
                  aria-describedby={errores.empresa ? `${campoId("empresa")}-error` : undefined}
                  className="renglon mt-1"
                >
                  <option value="" disabled>
                    Elegir…
                  </option>
                  {taller.empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                  <option value={NUEVA_EMPRESA}>Otro cliente, nuevo…</option>
                </select>
                {errores.empresa && <MensajeCampo id={`${campoId("empresa")}-error`} texto={errores.empresa} />}
              </div>
              {valores.empresa === NUEVA_EMPRESA && (
                <CampoTexto {...comun("nombreEmpresa")} etiqueta="Nombre del cliente nuevo" obligatorio />
              )}
              {nuevo ? (
                <div>
                  <label htmlFor={campoId("ingreso")} className="rotulo block text-[0.9375rem]">
                    Fecha de recepción <span className="font-semibold normal-case tracking-normal text-grafito">(obligatorio)</span>
                  </label>
                  <input
                    id={campoId("ingreso")}
                    type="date"
                    value={valores.ingreso}
                    max={hoy}
                    onChange={(e) => cambiar("ingreso")(e.target.value)}
                    aria-invalid={errores.ingreso ? true : undefined}
                    aria-describedby={errores.ingreso ? `${campoId("ingreso")}-error` : undefined}
                    className="renglon mt-1 w-[11.5rem]"
                  />
                  {errores.ingreso && <MensajeCampo id={`${campoId("ingreso")}-error`} texto={errores.ingreso} />}
                </div>
              ) : (
                <div>
                  <p className="rotulo text-[0.9375rem]">Fecha de recepción</p>
                  <p className="mt-1 py-2 text-[1.125rem]">{equipo.etapas.ingresado ? formatearFecha(equipo.etapas.ingresado) : "Sin fecha"}</p>
                  <p className="mt-1 text-[0.9375rem] leading-snug text-grafito">Se corrige desde «Cambiar estado».</p>
                </div>
              )}
              <CampoTexto
                {...comun("numeroOrden")}
                etiqueta="N.º de orden de trabajo"
                maxLength={30}
                ancho="max-w-[14rem]"
                ayuda="El que está escrito a mano en la planilla de papel."
              />
              <CampoTexto
                {...comun("referencia")}
                etiqueta="Referencia del cliente"
                ayuda="Cómo lo llama el cliente. Por ejemplo: «Subestación Barrio Norte»."
              />
              <Opciones<Uso | "">
                id={campoId("uso")}
                leyenda="Uso"
                className="sm:col-span-2"
                valor={valores.uso}
                onCambio={(v) => cambiar("uso")(v)}
                opciones={[...USOS.map((u) => ({ valor: u, etiqueta: NOMBRE_USOS[u] })), { valor: "", etiqueta: "Sin indicar" }]}
              />
            </div>
          </div>
        </div>

        <div className="marco">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 className="rotulo text-base">Placa de características</h2>
          </div>

          <Grupo titulo="Identificación" primero ayuda="Datos de placa">
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-6">
              <CampoTexto {...comun("fabricante")} etiqueta="Fabricante" lista={lista("fabricante")} className="sm:col-span-4" />
              <CampoTexto {...comun("anio")} etiqueta="Año de fabricación" numerico maxLength={4} className="sm:col-span-2" ancho="max-w-[8rem]" />
              <CampoTexto
                {...comun("serie")}
                etiqueta="N.º de fabricación"
                maxLength={60}
                className="sm:col-span-3"
                ayuda="En algunas chapas figura como N.º de serie."
              />
              <CampoTexto {...comun("tipo")} etiqueta="Tipo" className="sm:col-span-3" ayuda="El modelo, si la chapa lo indica." />
              <CampoTexto {...comun("norma")} etiqueta="Norma" lista={lista("norma")} className="sm:col-span-3" ancho="max-w-[14rem]" />
            </div>
          </Grupo>

          <Grupo titulo="Características">
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-6">
              <Opciones
                id={campoId("fases")}
                leyenda="Fases"
                obligatorio={nuevo}
                className="sm:col-span-6"
                valor={valores.fases}
                onCambio={(v) => cambiar("fases")(v)}
                error={errores.fases}
                opciones={FASES.map((f) => ({ valor: f, etiqueta: NOMBRE_FASES[f] }))}
              />
              <CampoTexto {...numero("potencia", "kVA")} etiqueta="Potencia nominal" ancho="max-w-[10rem]" className="sm:col-span-2" />
              <CampoTexto {...numero("frecuencia", "Hz")} etiqueta="Frecuencia" ancho="max-w-[8rem]" className="sm:col-span-2" />
              <CampoTexto
                {...numero("tensionCortocircuito", "%")}
                etiqueta="Tensión de cortocircuito"
                ancho="max-w-[8rem]"
                className="sm:col-span-2"
                ayuda="En la chapa: Tensión de CC o Ucc."
              />
              <CampoTexto {...comun("grupoConexion")} etiqueta="Grupo de conexiones" lista={lista("grupoConexion")} maxLength={20} className="sm:col-span-2" ancho="max-w-[10rem]" />
              <CampoTexto {...comun("servicio")} etiqueta="Servicio" lista={lista("servicio")} maxLength={40} className="sm:col-span-2" />
              <CampoTexto {...comun("enfriamiento")} etiqueta="Sistema de enfriamiento" lista={lista("enfriamiento")} maxLength={20} className="sm:col-span-2" ancho="max-w-[10rem]" />
            </div>
          </Grupo>

          <Grupo titulo="Tensiones nominales" ayuda="La intensidad se calcula sola: sirve para controlar contra la chapa.">
            <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
              {(
                [
                  ["tensionPrimaria", "Primario", tensionPrimaria, 1000, "13,2 kV se escribe 13200"],
                  ["tensionSecundaria", "Secundario", tensionSecundaria, 100, "0,4 kV se escribe 400"],
                ] as const
              ).map(([campo, nombre, tension, minimo, ejemplo]) => {
                const intensidad =
                  placa.potencia && tension && placa.fases ? `${formatearNumero(intensidadNominal(placa.potencia, tension, placa.fases))} A` : null;
                return (
                  <div key={campo}>
                    <h4 className="rotulo border-b-2 border-acero pb-1.5 text-base">{nombre}</h4>
                    <CampoTexto
                      {...numero(campo, "V")}
                      etiqueta="Tensión"
                      contexto={`del ${nombre.toLowerCase()}`}
                      ancho="max-w-[11rem]"
                      className="mt-4"
                      ayuda={
                        tension && tension > 0 && !errores[campo]
                          ? tension < minimo
                            ? `¿Está en voltios? ${ejemplo}.`
                            : `Equivale a ${formatearKV(tension)} kV.`
                          : undefined
                      }
                    />
                    <dl className="mt-5 flex items-baseline gap-3">
                      <dt className="rotulo text-[0.9375rem]">Intensidad</dt>
                      <dd className="text-[1.125rem]">
                        {intensidad ?? (
                          <span className="text-[0.9375rem] text-grafito">
                            {placa.fases ? "Falta la potencia o la tensión" : "Elija las fases para calcularla"}
                          </span>
                        )}
                      </dd>
                    </dl>
                  </div>
                );
              })}
            </div>
          </Grupo>

          <Grupo titulo="Conmutador sin tensión" ayuda="La tensión de cada punto, como en la tabla de la chapa.">
            <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-5">
              {valores.conmutador.map((punto, i) => {
                const enVoltios = leerNumero(punto, true);
                const nominal = !!tensionPrimaria && enVoltios === tensionPrimaria;
                return (
                  <CampoTexto
                    key={i}
                    id={campoId(`conmutador${i}`)}
                    etiqueta={`Punto ${i + 1}`}
                    contexto="del conmutador"
                    valor={punto}
                    onCambio={cambiarPunto(i)}
                    error={errores[`conmutador${i}`]}
                    unidad="V"
                    numerico
                    maxLength={12}
                    ayuda={nominal ? "Nominal" : undefined}
                  />
                );
              })}
            </div>
            {conmutadorVacio && tensionPrimaria && tensionPrimaria >= 1000 && (
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <button
                  type="button"
                  onClick={() => setValores((v) => ({ ...v, conmutador: conmutadorSugerido(tensionPrimaria).map(String) }))}
                  className="placa-secundaria"
                >
                  Completar con pasos de 2,5 %
                </button>
                <p className="max-w-[44ch] text-[0.9375rem] leading-snug text-grafito">
                  Es lo más común. Después revise que coincida con la chapa.
                </p>
              </div>
            )}
          </Grupo>

          <Grupo titulo="Aceite y masa">
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-6">
              <CampoTexto {...numero("aceite", "L")} etiqueta="Aceite aislante" ancho="max-w-[9rem]" className="sm:col-span-2" />
              <CampoTexto {...numero("masa", "kg")} etiqueta="Masa total" ancho="max-w-[9rem]" className="sm:col-span-2" />
              <CampoTexto {...comun("materialBobinados")} etiqueta="Material de los bobinados" lista={lista("materialBobinados")} maxLength={40} className="sm:col-span-2" />
            </div>
          </Grupo>
        </div>
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
        <p className="mt-5 max-w-[44ch] text-[0.9375rem] leading-snug text-grafito">
          {equipo && !equipo.placa && equipo.equipo && !placa.potencia
            ? "Este equipo se cargó antes de que existiera la chapa: conserva su descripción hasta que cargue la potencia."
            : "La descripción se arma sola con las fases, la potencia y las tensiones. La ven el cliente en su portal y cualquiera con el código."}
        </p>

        <div className="mt-6 flex flex-col items-start gap-4 border-t border-acero pt-6">
          <ErrorFormulario texto={error} />
          {faltan.length > 0 && (
            <p className="text-[0.9375rem] leading-snug">
              Para {nuevo ? "registrar" : "guardar"} falta elegir {enumerar(faltan)}.
            </p>
          )}
          <button type="submit" className="placa" disabled={guardando}>
            {guardando ? "Guardando…" : nuevo ? "Registrar equipo" : "Guardar cambios"}
          </button>
          {nuevo && <p className="max-w-[40ch] text-[0.9375rem] leading-snug">Entra como «Ingresado» con un código de seguimiento nuevo.</p>}
        </div>
      </aside>

      {(Object.keys(sugerencias) as CampoSugerido[]).map((campo) => (
        <Sugerencias key={campo} id={lista(campo)} valores={sugerencias[campo]} />
      ))}
    </form>
  );
}
