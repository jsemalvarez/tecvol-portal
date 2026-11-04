"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { BOBINAS, MATERIALES_CONDUCTOR, NOMBRE_MATERIAL, type DatosTallerGuardados, type IdBobina, type MaterialConductor } from "@/lib/dominio/datos-taller";
import { formatearFecha } from "@/lib/dominio/fechas";
import type { EquipoTaller } from "@/lib/dominio/tipos";
import { nombreOrden } from "@/lib/dominio/trafo";
import { leerValoresDatosTaller, valoresDeDatosTaller, type ErroresDatosTaller, type ValoresBobina, type ValoresDatosTaller } from "../datos-taller/valores";
import { mensajeDeError } from "../Dialogo";
import { CampoTexto, Grupo, Opciones } from "../equipo/campos";
import { PiePaso, UltimoGuardado, useSucio, type PropsPaso } from "./piezas";

/** Los datos del taller de la reparación anterior del mismo trafo, para partir de ellos en un reingreso. */
export interface DatosTallerAnteriores {
  equipo: EquipoTaller;
  datos: DatosTallerGuardados;
}

/**
 * El paso 5: los datos del taller de la reparación: cada bobina (material, medida del alambre, espiras y peso
 * del conductor), el aislamiento de prespan, las derivaciones y los materiales. Todo es opcional y se puede
 * guardar a medias; lo ve solo el personal. En un reingreso, se puede partir de la reparación anterior.
 */
export function PasoReparacion({
  api,
  equipo,
  guardado,
  anterior,
  vaDespues,
  onGuardado,
  onSeguir,
  onSucio,
}: PropsPaso & {
  guardado: DatosTallerGuardados | null;
  anterior: DatosTallerAnteriores | null;
  vaDespues?: ReactNode;
  onGuardado: (datos: DatosTallerGuardados) => void;
}) {
  const id = useId();
  const [base, setBase] = useState(() => valoresDeDatosTaller(guardado));
  const [valores, setValores] = useState<ValoresDatosTaller>(base);
  const [ultimo, setUltimo] = useState(guardado ? { actualizado: guardado.actualizado, por: guardado.por } : null);
  const [errores, setErrores] = useState<ErroresDatosTaller>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [intento, setIntento] = useState(0);
  const formulario = useRef<HTMLFormElement>(null);
  useSucio(JSON.stringify(valores) !== JSON.stringify(base), onSucio);

  useEffect(() => {
    if (!intento) return;
    const primero = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    primero?.focus({ preventScroll: true });
    primero?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [intento]);

  const actualizar = (cambio: (v: ValoresDatosTaller) => ValoresDatosTaller, clave?: string) => {
    setValores(cambio);
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

  async function guardar(seguir: boolean) {
    const { datos, errores: encontrados } = leerValoresDatosTaller(valores);
    setErrores(encontrados);
    setError(null);
    if (Object.keys(encontrados).length) {
      setIntento((n) => n + 1);
      return;
    }
    setGuardando(true);
    try {
      await api.acciones.guardarDatosTaller(equipo.codigo, datos);
      const nuevo = { actualizado: new Date(), por: api.email };
      setBase(valores);
      setUltimo(nuevo);
      onGuardado({ ...datos, ...nuevo });
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

  const aprobado = equipo.etapas.reparacion;
  const ingresoAnterior = anterior?.equipo.etapas.ingresado;

  return (
    <form ref={formulario} onSubmit={enviar} noValidate>
      <div className="px-[var(--marco-px)] pb-7 pt-6">
        {vaDespues}
        <p>
          {aprobado ? (
            <>
              La empresa ve <strong className="font-semibold">«En reparación»</strong> desde el {formatearFecha(aprobado)}, cuando se aprobó el presupuesto.
            </>
          ) : (
            <>
              Cuando anote la aprobación en el paso 4, la empresa lo ve <strong className="font-semibold">«En reparación»</strong>.
            </>
          )}
        </p>
        {anterior && (
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[var(--radius-placa)] border border-acero bg-esmalte px-5 py-4">
            <p className="min-w-[14rem] flex-1 leading-snug">
              <strong className="font-semibold">Es un reingreso.</strong> La {nombreOrden(anterior.equipo)}, que ingresó el{" "}
              {ingresoAnterior ? formatearFecha(ingresoAnterior) : "(sin fecha)"}, tiene datos del taller cargados.
              {copiado && " Se copiaron: corrija lo que cambie en esta reparación y guarde."}
            </p>
            <button type="button" onClick={copiarAnterior} className="placa-secundaria">
              {copiado ? "Volver a copiar" : `Copiar los datos de la ${nombreOrden(anterior.equipo)}`}
            </button>
          </div>
        )}
      </div>

      {BOBINAS.map((bobina) => {
        const v = valores[bobina.id];
        const campo = (nombre: keyof ValoresBobina) => ({
          id: `${id}-${bobina.id}-${nombre}`,
          valor: v[nombre],
          onCambio: cambiarBobina(bobina.id, nombre),
          error: errores[`${bobina.id}.${nombre}`],
          contexto: `de la ${bobina.nombre.toLowerCase()}`,
        });
        return (
          <Grupo key={bobina.id} titulo={bobina.nombre}>
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

      <Grupo titulo="Aislamiento de prespan">
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

      <Grupo titulo="Materiales y notas">
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
      </Grupo>

      <PiePaso
        guardando={guardando}
        onGuardar={() => guardar(false)}
        error={error}
        nota="Solo lo ve el personal del taller. Todo es opcional y se puede guardar a medias."
        antes={<UltimoGuardado ultimo={ultimo} />}
      />
    </form>
  );
}
