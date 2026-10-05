import { TornillosMarco } from "./TornillosMarco";

const SERVICIOS = [
  {
    nombre: "Reparación y rebobinado",
    texto:
      "Para transformadores con fallas. El taller diagnostica cada equipo, le envía el presupuesto para aprobar, lo repara y lo ensaya antes de entregarlo.",
  },
  {
    nombre: "Mantenimiento y ensayos",
    texto: "Mantenimiento y ensayos de transformadores para cooperativas eléctricas, distribuidoras e industrias.",
  },
];

/** Servicios como placas de texto del cartel: rótulo negro y texto, sin señales (las señales solo significan estado). */
export function Servicios() {
  return (
    <section id="servicios" aria-labelledby="titulo-servicios" className="px-3.5 pt-20 sm:px-5 lg:px-6 lg:pt-28">
      <div className="grid gap-x-12 gap-y-8 filete-seccion pt-7 lg:grid-cols-12">
        <h2
          id="titulo-servicios"
          className="font-cartel text-[2.5rem] font-bold uppercase leading-[0.95] sm:text-5xl lg:col-span-5 lg:text-[3.5rem] xl:col-span-4"
        >
          Servicios del taller
        </h2>

        <div className="marco lg:col-span-7 xl:col-span-8">
          <TornillosMarco />
          <dl>
            {SERVICIOS.map((servicio) => (
              <div
                key={servicio.nombre}
                className="marco-fila grid gap-x-8 gap-y-3 px-[var(--marco-px)] py-6 sm:py-8 md:grid-cols-[minmax(0,21rem)_1fr] md:items-center"
              >
                <dt>
                  <span className="rotulo inline-block rounded-[0.375rem] bg-acero px-3 py-2 text-xl font-extrabold text-blanco sm:text-[1.375rem]">
                    {servicio.nombre}
                  </span>
                </dt>
                <dd className="max-w-[52ch] text-lg">{servicio.texto}</dd>
              </div>
            ))}
          </dl>
          <p className="marco-pie flex flex-wrap items-center gap-x-4 gap-y-2 px-[var(--marco-px)] py-4">
            <span className="tarjeta-bloqueo">Pendiente</span>
            <span>Alcance técnico (potencias, tensiones y tipos de equipo): a confirmar por Tecvol.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
