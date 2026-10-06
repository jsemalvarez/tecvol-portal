"use client";

import { useId, useState, type FormEvent } from "react";
import { fechaDeCampo, fechaParaCampo } from "@/lib/dominio/fechas";
import type { DatosEquipo, EquipoTaller, Taller } from "@/lib/dominio/tipos";
import { ErrorFormulario, MensajeCampo, mensajeDeError } from "./Dialogo";
import type { AccionesPanel } from "./usePanel";

const NUEVA = "__nueva";

type Errores = Partial<Record<"empresa" | "nombreEmpresa" | "equipo" | "ingreso", string>>;

/**
 * Registrar un equipo (con un código nuevo) o editar sus datos. La empresa se elige de la lista o se
 * crea en el momento. El estado no se toca acá: un equipo nuevo entra como "Ingresado".
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
  onGuardado?: () => void;
}) {
  const id = useId();
  const hoy = fechaParaCampo(new Date());
  const [empresa, setEmpresa] = useState(equipo?.empresa ?? (taller.empresas.length ? "" : NUEVA));
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [descripcion, setDescripcion] = useState(equipo?.equipo ?? "");
  const [referencia, setReferencia] = useState(equipo?.referencia ?? "");
  const [serie, setSerie] = useState(equipo?.serie ?? "");
  const [ingreso, setIngreso] = useState(hoy);
  const [errores, setErrores] = useState<Errores>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    const encontrados: Errores = {};
    if (!empresa) encontrados.empresa = "Elija la empresa dueña del equipo.";
    if (empresa === NUEVA && !nombreEmpresa.trim()) encontrados.nombreEmpresa = "Escriba el nombre de la empresa.";
    if (!descripcion.trim()) encontrados.equipo = "Describa el equipo: tipo, potencia y tensiones.";
    const diaIngreso = fechaDeCampo(ingreso);
    if (!equipo && (!diaIngreso || ingreso > hoy)) encontrados.ingreso = "Elija una fecha de ingreso de hoy o anterior.";
    setErrores(encontrados);
    setError(null);
    if (Object.keys(encontrados).length) return;

    setGuardando(true);
    try {
      const idEmpresa = empresa === NUEVA ? (await acciones.crearEmpresa(nombreEmpresa.trim())).id : empresa;
      const datos: DatosEquipo = {
        empresa: idEmpresa,
        equipo: descripcion.trim(),
        referencia: referencia.trim() || undefined,
        serie: serie.trim() || undefined,
      };
      if (equipo) {
        await acciones.editar(equipo.codigo, datos);
        onGuardado?.();
      } else {
        onRegistrado?.(await acciones.registrar(datos, diaIngreso ?? new Date()));
      }
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  }

  const campo = (nombre: keyof Errores) => ({
    "aria-invalid": errores[nombre] ? true : undefined,
    "aria-describedby": errores[nombre] ? `${id}-${nombre}-error` : undefined,
  });

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-6">
      <ErrorFormulario texto={error} />
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className={empresa === NUEVA ? "" : "sm:col-span-2"}>
          <label htmlFor={`${id}-empresa`} className="rotulo block text-[0.9375rem]">
            Empresa
          </label>
          <select
            id={`${id}-empresa`}
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className="renglon mt-1"
            {...campo("empresa")}
          >
            <option value="" disabled>
              Elegir…
            </option>
            {taller.empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
            <option value={NUEVA}>Otra empresa, nueva…</option>
          </select>
          <MensajeCampo id={`${id}-empresa-error`} texto={errores.empresa} />
        </div>
        {empresa === NUEVA && (
          <div>
            <label htmlFor={`${id}-nombreEmpresa`} className="rotulo block text-[0.9375rem]">
              Nombre de la empresa nueva
            </label>
            <input
              id={`${id}-nombreEmpresa`}
              value={nombreEmpresa}
              onChange={(e) => setNombreEmpresa(e.target.value)}
              maxLength={120}
              className="renglon mt-1"
              {...campo("nombreEmpresa")}
            />
            <MensajeCampo id={`${id}-nombreEmpresa-error`} texto={errores.nombreEmpresa} />
          </div>
        )}
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-equipo`} className="rotulo block text-[0.9375rem]">
            Equipo
          </label>
          <input
            id={`${id}-equipo`}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={200}
            className="renglon mt-1"
            {...campo("equipo")}
          />
          <p className="mt-2 text-[0.9375rem] text-grafito">Por ejemplo: Transformador trifásico 315 kVA · 13,2/0,4 kV. Lo ve cualquiera con el código.</p>
          <MensajeCampo id={`${id}-equipo-error`} texto={errores.equipo} />
        </div>
        <div>
          <label htmlFor={`${id}-referencia`} className="rotulo block text-[0.9375rem]">
            Referencia del cliente <span className="font-semibold normal-case tracking-normal text-grafito">(opcional)</span>
          </label>
          <input
            id={`${id}-referencia`}
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            maxLength={120}
            className="renglon mt-1"
          />
          <p className="mt-2 text-[0.9375rem] text-grafito">Cómo lo llama el cliente: "Subestación Barrio Norte".</p>
        </div>
        <div>
          <label htmlFor={`${id}-serie`} className="rotulo block text-[0.9375rem]">
            N.º de serie <span className="font-semibold normal-case tracking-normal text-grafito">(opcional)</span>
          </label>
          <input id={`${id}-serie`} value={serie} onChange={(e) => setSerie(e.target.value)} maxLength={60} className="renglon mt-1" />
        </div>
        {!equipo && (
          <div>
            <label htmlFor={`${id}-ingreso`} className="rotulo block text-[0.9375rem]">
              Fecha de ingreso
            </label>
            <input
              id={`${id}-ingreso`}
              type="date"
              value={ingreso}
              max={hoy}
              onChange={(e) => setIngreso(e.target.value)}
              className="renglon mt-1 w-[11.5rem]"
              {...campo("ingreso")}
            />
            <MensajeCampo id={`${id}-ingreso-error`} texto={errores.ingreso} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="placa" disabled={guardando}>
          {guardando ? "Guardando…" : equipo ? "Guardar cambios" : "Registrar equipo"}
        </button>
        {!equipo && <p className="max-w-[44ch] text-[0.9375rem]">Entra como "Ingresado" con un código de seguimiento nuevo.</p>}
      </div>
    </form>
  );
}
