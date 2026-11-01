"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { fechaParaCampo } from "@/lib/dominio/fechas";
import { activos, type Taller, type Transformador } from "@/lib/dominio/tipos";
import { conMismoNumero, conNumeroT, nombreTrafo, siguienteProvisorio } from "@/lib/dominio/trafo";
import { ErrorFormulario, MensajeCampo, mensajeDeError } from "../Dialogo";
import { MarcaTemporal } from "../equipo/campos";
import { ChapaTransformador, errorNumeroTOcupado, IdentidadTransformador, liberarNumeroT, type Reemplazo } from "../equipo/CamposTransformador";
import { datosTransformador } from "../equipo/FormularioOT";
import { useAvisoAlSalir } from "../equipo/useAvisoAlSalir";
import { revisar, valoresDe, type Errores, type Valores } from "../equipo/valores";
import type { AccionesPanel } from "../usePanel";

const enlace = "font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/**
 * Los datos de un transformador: el N.º de trafo (el de fábrica o uno temporal), el N.º T, el uso y la
 * chapa. Con `trafo`, se corrigen o completan los suyos y todas sus órdenes muestran lo nuevo (cada una
 * conserva el N.º T con el que ingresó). Sin `trafo`, se da de alta uno nuevo, sin O.T.: primero se elige
 * su cliente, que después no cambia.
 */
export function FormularioTransformador({
  taller,
  acciones,
  trafo,
  crearEmpresas = false,
  puedeDarDeBaja,
  onGuardado,
}: {
  taller: Taller;
  acciones: AccionesPanel;
  trafo?: Transformador;
  /** Al dar de alta: si puede dar de alta una empresa (en "Empresas y cuentas"), para la ayuda del cliente. */
  crearEmpresas?: boolean;
  puedeDarDeBaja: boolean;
  /** Con el transformador como quedó guardado. */
  onGuardado: (guardado: Transformador) => void;
}) {
  const id = useId();
  const hoy = fechaParaCampo(new Date());
  const nuevo = !trafo;
  const empresas = activos(taller.empresas);
  const [inicial] = useState(() => valoresDe(trafo));
  const [valores, setValores] = useState<Valores>(inicial);
  const [empresa, setEmpresa] = useState(trafo?.empresa ?? (empresas.length === 1 ? empresas[0].id : ""));
  const [errorEmpresa, setErrorEmpresa] = useState<string | undefined>();
  const [errores, setErrores] = useState<Errores>({});
  const [reemplazo, setReemplazo] = useState<Reemplazo>("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [intento, setIntento] = useState(0);
  const formulario = useRef<HTMLFormElement>(null);
  useAvisoAlSalir(JSON.stringify(valores) !== JSON.stringify(inicial) && !guardando);

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

  const ocupadoPor = empresa ? conNumeroT(taller.transformadores, empresa, valores.numeroT, trafo?.id) : undefined;
  const repetido =
    empresa && !valores.provisorio ? conMismoNumero(taller.transformadores, empresa, valores.numero, trafo?.id) : undefined;
  const datos = datosTransformador(valores);
  const campoEmpresa = `${id}-empresa`;

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    const conErrores = revisar(valores, { nuevo, hoy });
    if (ocupadoPor && !reemplazo) conErrores.numeroT = errorNumeroTOcupado;
    const sinEmpresa = empresa ? undefined : "Elija la empresa dueña del transformador.";
    setErrores(conErrores);
    setErrorEmpresa(sinEmpresa);
    if (Object.keys(conErrores).length || sinEmpresa) {
      setIntento((n) => n + 1);
      return;
    }
    setGuardando(true);
    try {
      if (ocupadoPor && reemplazo) await liberarNumeroT(acciones, ocupadoPor, reemplazo);
      if (trafo) {
        await acciones.editarTransformador(trafo.id, datos);
        onGuardado({ ...trafo, ...datos });
      } else {
        onGuardado(await acciones.crearTransformador(empresa, datos));
      }
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  return (
    <form ref={formulario} onSubmit={guardar} noValidate className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="flex flex-col gap-10 lg:col-span-8">
        <section aria-labelledby={`${id}-datos`} className="marco">
          <TornillosMarco />
          <div className="marco-cabecera">
            <h2 id={`${id}-datos`} className="rotulo text-base">
              Transformador
            </h2>
            {valores.provisorio && <MarcaTemporal className="" />}
          </div>
          <div className="marco-cuerpo">
            {nuevo && (
              <div className="mb-7">
                <label htmlFor={campoEmpresa} className="rotulo block text-[0.9375rem]">
                  Empresa <span className="font-semibold normal-case tracking-normal text-grafito">(obligatorio)</span>
                </label>
                <select
                  id={campoEmpresa}
                  value={empresa}
                  onChange={(e) => {
                    setEmpresa(e.target.value);
                    setErrorEmpresa(undefined);
                    setReemplazo("");
                  }}
                  aria-invalid={errorEmpresa ? true : undefined}
                  aria-describedby={errorEmpresa ? `${campoEmpresa}-error` : `${campoEmpresa}-ayuda`}
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
                </select>
                <MensajeCampo id={`${campoEmpresa}-error`} texto={errorEmpresa} />
                <p id={`${campoEmpresa}-ayuda`} className="mt-2 text-[0.9375rem] leading-snug text-grafito">
                  {crearEmpresas ? (
                    <>
                      Dar de alta en{" "}
                      <Link href="/panel/empresas" className={enlace}>
                        Empresas y cuentas
                      </Link>
                      .
                    </>
                  ) : (
                    "¿No está? Pídale a un administrador que la dé de alta."
                  )}
                </p>
              </div>
            )}
            <IdentidadTransformador
              id={id}
              valores={valores}
              setValores={setValores}
              errores={errores}
              quitarError={quitarError}
              nuevo={nuevo}
              provisorioSiguiente={siguienteProvisorio(taller.transformadores)}
              ocupadoPor={ocupadoPor}
              reemplazo={reemplazo}
              onReemplazo={(elegido) => {
                setReemplazo(elegido);
                if (elegido) quitarError("numeroT");
              }}
              puedeDarDeBaja={puedeDarDeBaja}
            />
            {repetido && (
              <p className="mt-6 max-w-[60ch] text-[0.9375rem] font-medium leading-snug">
                El cliente ya tiene un transformador con ese N.º de trafo:{" "}
                <Link href={`/panel/transformador?id=${repetido.id}`} className={enlace}>
                  {nombreTrafo(repetido)}
                </Link>
                {repetido.baja ? ", dado de baja" : ""}. Revise que no sea el mismo antes de guardar.
              </p>
            )}
          </div>
        </section>
        <ChapaTransformador
          id={id}
          valores={valores}
          setValores={setValores}
          errores={errores}
          quitarError={quitarError}
          nuevo={nuevo}
          transformadores={taller.transformadores}
        />
      </div>

      <aside className="border-t-[3px] border-acero pt-5 lg:sticky lg:top-8 lg:col-span-4 lg:self-start">
        <h2 className="rotulo text-base">Así lo ve el cliente</h2>
        <p className="mt-3 text-lg font-semibold leading-snug">{datos.equipo}</p>
        <p className="mt-3 max-w-[44ch] text-[0.9375rem] leading-snug text-grafito">
          La descripción se arma sola con las fases, la potencia y las tensiones. La ven el cliente en su portal y cualquiera con el código
          de sus órdenes.
        </p>
        {nuevo && (
          <p className="mt-3 max-w-[44ch] text-[0.9375rem] leading-snug text-grafito">
            Queda sin O.T. Cuando llegue al taller, créela desde su ficha con «Nueva O.T.».
          </p>
        )}
        <div className="mt-6 flex flex-col items-start gap-4 border-t border-acero pt-6">
          <ErrorFormulario texto={error} />
          <button type="submit" className="placa" disabled={guardando}>
            {guardando ? "Guardando…" : nuevo ? "Dar de alta el transformador" : "Guardar cambios"}
          </button>
        </div>
      </aside>
    </form>
  );
}
