import Link from "next/link";
import { Flecha } from "@/components/iconos";
import { Senal } from "@/components/senal/Senal";
import { DEFINICIONES, type EstadoReparacion } from "@/lib/dominio/estados";
import { PORTAL_HABILITADO } from "@/lib/etapas-demo";
import { TornillosMarco } from "./TornillosMarco";

/** Vista de ejemplo del portal, con las mismas filas que el portal real. Equipos ficticios, rotulados como tales. */
const EQUIPOS_EJEMPLO: { referencia: string; equipo: string; estado: EstadoReparacion; desde: string }[] = [
  { referencia: "Planta de bombeo 2", equipo: "Trifásico 500 kVA · 13,2/0,4 kV", estado: "presupuesto", desde: "29/09" },
  { referencia: "Línea rural, km 12", equipo: "Monofásico 25 kVA · 7,62/0,231 kV", estado: "listo", desde: "12/09" },
  { referencia: "Subestación Barrio Norte", equipo: "Trifásico 315 kVA · 13,2/0,4 kV", estado: "reparacion", desde: "08/09" },
];

const DISPONIBLE = [
  "Todos los equipos de su empresa, en un solo lugar",
  "Estado de cada equipo y fecha de cada etapa",
  "Historial de los equipos entregados",
];

const EN_PREPARACION = ["Protocolos de ensayo para descargar", "Fotos del equipo"];

export function Portal() {
  return (
    <section id="portal" aria-labelledby="titulo-portal" className="px-3.5 pt-20 sm:px-5 lg:px-6 lg:pt-28">
      <div className="grid gap-x-12 gap-y-10 filete-seccion pt-7 lg:grid-cols-12">
        <div className="lg:col-span-5 xl:col-span-4">
          <h2
            id="titulo-portal"
            className="font-cartel text-[2.5rem] font-bold uppercase leading-[0.95] sm:text-5xl lg:text-[3.5rem]"
          >
            Usted ve el mismo registro con el que trabaja el taller
          </h2>
          <p className="mt-5 max-w-[42ch] text-lg">
            Con la cuenta de su empresa, el portal muestra solo sus equipos. Cada cambio que carga el taller aparece ahí,
            con su fecha.
          </p>
          <div className="mt-8 flex flex-col items-start gap-3">
            <Link href="/ingresar" className="placa">
              Ingresar al portal
              <Flecha />
            </Link>
            <p className="max-w-[40ch] text-[0.9375rem]">Las cuentas las crea el taller al registrar a su empresa.</p>
            {!PORTAL_HABILITADO && (
              <p className="flex max-w-[40ch] flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem]">
                <span className="tarjeta-bloqueo">En preparación</span>
                El portal se habilita en la próxima etapa de esta demo.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-10 lg:col-span-7 xl:col-span-8">
          <figure aria-label="Vista de ejemplo del portal" className="marco">
            <TornillosMarco />
            <figcaption className="marco-cabecera">
              <span className="rotulo text-base">Sus equipos</span>
              <span className="etiqueta">Ejemplo</span>
            </figcaption>
            <ul>
              {EQUIPOS_EJEMPLO.map((e) => {
                const d = DEFINICIONES[e.estado];
                return (
                  <li
                    key={e.referencia}
                    className="marco-fila grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 px-[var(--marco-px)] py-4 sm:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1fr)] sm:gap-x-6"
                  >
                    <Senal forma={d.forma} pictograma={e.estado} simple className="row-span-2 size-12 sm:row-span-1 sm:size-14" />
                    <div>
                      <p className="rotulo text-lg font-extrabold">{d.rotulo}</p>
                      <p className="text-[0.9375rem]">
                        {d.nombre} desde el {e.desde}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">{e.referencia}</p>
                      <p className="text-[0.9375rem]">{e.equipo}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </figure>

          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            <div>
              <h3 className="rotulo flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-acero pb-2 text-[0.9375rem]">
                En el portal
                {!PORTAL_HABILITADO && <span className="text-[0.8125rem] font-semibold normal-case tracking-normal">Próxima etapa</span>}
              </h3>
              <ul className="mt-1">
                {DISPONIBLE.map((item) => (
                  <li key={item} className="flex items-center gap-3 border-b border-acero py-3">
                    <span aria-hidden="true" className="h-1 w-4 shrink-0 bg-naranja" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="rotulo border-b-[3px] border-acero pb-2 text-[0.9375rem]">Próximamente</h3>
              <ul className="mt-1">
                {EN_PREPARACION.map((item) => (
                  <li key={item} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-acero py-3">
                    {item}
                    <span className="tarjeta-bloqueo">En preparación</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
