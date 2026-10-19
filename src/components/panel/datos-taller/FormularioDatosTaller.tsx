"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { BOBINAS, MATERIALES_CONDUCTOR, NOMBRE_MATERIAL, type DatosTallerGuardados, type IdBobina, type MaterialConductor } from "@/lib/dominio/datos-taller";
import { formatearFecha } from "@/lib/dominio/fechas";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { ErrorFormulario, mensajeDeError } from "../Dialogo";
import { CampoTexto, Grupo, Opciones } from "../equipo/campos";
import { useAvisoAlSalir } from "../equipo/useAvisoAlSalir";
import type { AccionesPanel } from "../usePanel";
import { leerValoresDatosTaller, valoresDeDatosTaller, type ErroresDatosTaller, type ValoresBobina, type ValoresDatosTaller } from "./valores";

const hora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });

/** Los datos del taller de la reparación anterior del mismo trafo, para partir de ellos en un reingreso. */
export interface DatosTallerAnteriores {
  equipo: EquipoTaller;
  datos: DatosTallerGuardados;
}

/**
 * Datos del taller de una reparación: cada bobina (material, medida del alambre, espiras y peso del
 * conductor), el aislamiento de prespan, las derivaciones y los materiales. Todo es opcional y se puede
 * guardar a medias. En un reingreso, se puede partir de los datos de la reparación anterior.
 */
export function FormularioDatosTaller({
  equipo,
  acciones,
  email,
  guardado,
  anterior,
}: {
  equipo: EquipoTaller;
  acciones: AccionesPanel;
  /** Quién tiene la sesión abierta: queda como autor al guardar. */
  email: string;
  guardado: DatosTallerGuardados | null;
  anterior: DatosTallerAnteriores | null;
}) {
  const id = useId();
  const [base, setBase] = useState(() => valoresDeDatosTaller(guardado));
  const [valores, setValores] = useState<ValoresDatosTaller>(base);
  const [ultimo, setUltimo] = useState(guardado ? { actualizado: guardado.actualizado, por: guardado.por } : null);
  const [errores, setErrores] = useState<ErroresDatosTaller>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [recienGuardado, setRecienGuardado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [intento, setIntento] = useState(0);
  const formulario = useRef<HTMLFormElement>(null);

  const sucio = useMemo(() => JSON.stringify(valores) !== JSON.stringify(base), [valores, base]);
  useAvisoAlSalir(sucio && !guardando);

  useEffect(() => {
    if (!intento) return;
    const primero = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    primero?.focus({ preventScroll: true });
    primero?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [intento]);

  const actualizar = (cambio: (v: ValoresDatosTaller) => ValoresDatosTaller, clave?: string) => {
    setValores(cambio);
    setRecienGuardado(false);
    if (clave && errores[clave]) {
      setErrores((actuales) => {
        const resto = { ...actuales };
        delete resto[clave];
        return resto;
      });
    }
  };

  const cambiarBobina = (bobina: IdBobina, campo: keyof ValoresBobina) => (texto: string) =>
    actualizar((v) => ({ ...v, [bobina]: { ...v[bobina], [campo]: texto } }), `${bobina}.${campo}`);

  const cambiar = (campo: "prespanMedidas" | "prespanPeso" | "derivaciones" | "notas") => (texto: string) =>
    actualizar((v) => ({ ...v, [campo]: texto }), campo);

  function copiarAnterior() {
    if (!anterior) return;
    actualizar(() => valoresDeDatosTaller(anterior.datos));
    setErrores({});
    setCopiado(true);
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const { datos, errores: encontrados } = leerValoresDatosTaller(valores);
    setErrores(encontrados);
    setError(null);
    setRecienGuardado(false);
    if (Object.keys(encontrados).length) {
      setIntento((n) => n + 1);
      return;
    }
    setGuardando(true);
    try {
      await acciones.guardarDatosTaller(equipo.codigo, datos);
      setBase(valores);
      setUltimo({ actualizado: new Date(), por: email });
      setRecienGuardado(true);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  const ingresoAnterior = anterior?.equipo.etapas.ingresado;

  return (
    <form ref={formulario} onSubmit={guardar} noValidate className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="flex flex-col gap-10 lg:col-span-8">
        <section aria-labelledby={`${id}-bobinas`} className="marco">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 id={`${id}-bobinas`} className="rotulo text-base">
              Bobinas
            </h2>
          </div>
          {BOBINAS.map((bobina, i) => {
            const v = valores[bobina.id];
            const campo = (nombre: keyof ValoresBobina) => ({
              id: `${id}-${bobina.id}-${nombre}`,
              valor: v[nombre],
              onCambio: cambiarBobina(bobina.id, nombre),
              error: errores[`${bobina.id}.${nombre}`],
              contexto: `de la ${bobina.nombre.toLowerCase()}`,
            });
            return (
              <Grupo key={bobina.id} titulo={bobina.nombre} primero={i === 0}>
                <div className="grid gap-x-8 gap-y-7 sm:grid-cols-6">
                  <Opciones<MaterialConductor | "">
                    id={`${id}-${bobina.id}-material`}
                    leyenda="Material del alambre"
                    className="sm:col-span-6"
                    valor={v.material}
                    onCambio={(material) => cambiarBobina(bobina.id, "material")(material)}
                    opciones={[...MATERIALES_CONDUCTOR.map((m) => ({ valor: m, etiqueta: NOMBRE_MATERIAL[m] })), { valor: "", etiqueta: "Sin indicar" }]}
                  />
                  <CampoTexto
                    {...campo("medida")}
                    etiqueta="Medida del alambre"
                    maxLength={40}
                    className="sm:col-span-2"
                    ayuda="Diámetro o sección. Por ejemplo: «1,25 mm» o «3 × 10 mm»."
                  />
                  <CampoTexto {...campo("espiras")} etiqueta="Cantidad de espiras" numerico maxLength={8} className="sm:col-span-2" ancho="max-w-[10rem]" />
                  <CampoTexto {...campo("peso")} etiqueta="Peso del conductor" unidad="kg" numerico maxLength={10} className="sm:col-span-2" ancho="max-w-[10rem]" />
                </div>
              </Grupo>
            );
          })}
        </section>

        <section aria-labelledby={`${id}-aislamiento`} className="marco">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 id={`${id}-aislamiento`} className="rotulo text-base">
              Aislamiento y derivaciones
            </h2>
          </div>
          <Grupo titulo="Aislamiento de prespan" primero>
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-6">
              <CampoTexto
                id={`${id}-prespanMedidas`}
                etiqueta="Medidas"
                contexto="del prespan"
                valor={valores.prespanMedidas}
                onCambio={cambiar("prespanMedidas")}
                error={errores.prespanMedidas}
                maxLength={200}
                className="sm:col-span-4"
                ayuda="Espesores y dónde va cada uno. Por ejemplo: «0,5 mm entre capas; 2 mm entre bobinas»."
              />
              <CampoTexto
                id={`${id}-prespanPeso`}
                etiqueta="Peso"
                contexto="del prespan"
                valor={valores.prespanPeso}
                onCambio={cambiar("prespanPeso")}
                error={errores.prespanPeso}
                unidad="kg"
                numerico
                maxLength={10}
                className="sm:col-span-2"
                ancho="max-w-[10rem]"
              />
            </div>
          </Grupo>
          <Grupo titulo="Derivaciones">
            <CampoTexto
              id={`${id}-derivaciones`}
              etiqueta="Cantidad de derivaciones"
              valor={valores.derivaciones}
              onCambio={cambiar("derivaciones")}
              error={errores.derivaciones}
              numerico
              maxLength={4}
              ancho="max-w-[10rem]"
            />
          </Grupo>
        </section>

        <section aria-labelledby={`${id}-notas`} className="marco">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 id={`${id}-notas`} className="rotulo text-base">
              Materiales y notas
            </h2>
          </div>
          <div className="marco-cuerpo">
            <label htmlFor={`${id}-notas-texto`} className="rotulo block text-[0.9375rem]">
              Materiales usados y otras notas
            </label>
            <textarea
              id={`${id}-notas-texto`}
              rows={4}
              maxLength={2000}
              value={valores.notas}
              onChange={(e) => cambiar("notas")(e.target.value)}
              aria-describedby={`${id}-notas-ayuda`}
              className="renglon mt-1 min-h-32 resize-y"
            />
            <p id={`${id}-notas-ayuda`} className="mt-2 text-[0.9375rem] leading-snug text-grafito">
              Por ejemplo: aisladores, conmutador, juntas.
            </p>
          </div>
        </section>
      </div>

      <aside aria-labelledby={`${id}-guardar`} className="border-t-[3px] border-acero pt-5 lg:sticky lg:top-8 lg:col-span-4 lg:self-start">
        <h2 id={`${id}-guardar`} className="rotulo text-base">
          Datos del taller
        </h2>
        <p className="mt-3 max-w-[44ch] text-[0.9375rem] leading-snug text-grafito">
          Solo los ve el personal del taller: el cliente no los ve en su portal. Todo es opcional y se puede guardar a medias.
        </p>

        {anterior && (
          <div className="mt-5 border-t border-acero pt-5">
            <p className="max-w-[44ch] leading-snug">
              <strong className="font-semibold">Es un reingreso.</strong> La reparación que ingresó el{" "}
              {ingresoAnterior ? formatearFecha(ingresoAnterior) : "(sin fecha)"} tiene datos del taller cargados.
            </p>
            <button type="button" onClick={copiarAnterior} className="placa-secundaria mt-3">
              {copiado ? "Volver a copiar" : "Copiar los datos anteriores"}
            </button>
            {copiado && (
              <p role="status" className="mt-2 max-w-[44ch] text-[0.9375rem] leading-snug">
                Se copiaron los datos. Corrija lo que cambie en esta reparación y guarde.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col items-start gap-4 border-t border-acero pt-6">
          <ErrorFormulario texto={error} />
          <button type="submit" className="placa" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar los datos"}
          </button>
          <p role="status" className="text-[0.9375rem] leading-snug">
            {recienGuardado ? (
              <strong className="font-semibold">Se guardaron los datos del taller.</strong>
            ) : ultimo?.actualizado ? (
              <span className="text-grafito">
                Guardado por última vez el {formatearFecha(ultimo.actualizado)} a las {hora.format(ultimo.actualizado)}
                {ultimo.por && <>, por {ultimo.por}</>}.
              </span>
            ) : (
              <span className="text-grafito">Todavía no se guardó.</span>
            )}
          </p>
        </div>
      </aside>
    </form>
  );
}
