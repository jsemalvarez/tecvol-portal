import { Senal } from "@/components/senal/Senal";
import { PICTOGRAMA_DE_FORMA } from "@/components/senal/pictogramas";
import { DEFINICIONES, ESTADOS, FORMAS } from "@/lib/dominio/estados";
import { EscenaRecorrido } from "./EscenaRecorrido";

export function Leyenda() {
  return (
    <section id="como-se-lee" aria-labelledby="titulo-leyenda" className="pt-20 lg:pt-28">
      <div className="mx-3.5 grid gap-x-12 gap-y-8 filete-seccion pt-7 sm:mx-5 lg:mx-6 lg:grid-cols-12">
        <h2
          id="titulo-leyenda"
          className="font-cartel text-[2.5rem] font-bold uppercase leading-[0.95] sm:text-5xl lg:col-span-5 lg:text-[3.5rem] xl:col-span-4"
        >
          Cómo se lee el estado de su equipo
        </h2>
        <div className="lg:col-span-7 xl:col-span-8">
          <p className="max-w-[56ch] text-lg">
            Cada etapa usa la forma y el color de las señales de seguridad que ya conoce de planta. La forma dice qué
            está pasando con el equipo. Cuando aparece el círculo azul, el paso siguiente es suyo.
          </p>
          <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {FORMAS.map((f) => (
              <div key={f.forma} className="flex flex-col gap-2">
                <dt className="flex items-center gap-3">
                  <Senal forma={f.forma} pictograma={PICTOGRAMA_DE_FORMA[f.forma]} simple className="size-12 shrink-0" />
                  <span className="rotulo text-[0.9375rem]">{f.figura}</span>
                </dt>
                <dd className="text-[0.9375rem] leading-snug text-grafito">{f.indica}</dd>
              </div>
            ))}
          </dl>
          <p className="rotulo mt-7 hidden text-[0.9375rem] text-grafito motion-safe:block">
            Siga el recorrido de un equipo por el taller: baje para avanzar.
          </p>
        </div>
      </div>

      <EscenaRecorrido />

      {/* Con movimiento reducido, la misma información sin escena. */}
      <div className="leyenda-estatica mx-3.5 mt-10 sm:mx-5 lg:mx-6">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Las siete etapas de una reparación, en orden</caption>
          <thead>
            <tr className="border-b-[3px] border-acero">
              <th scope="col" className="rotulo w-12 pb-3 text-[0.8125rem] sm:w-16">
                N.º
              </th>
              <th scope="col" className="rotulo w-20 pb-3 text-[0.8125rem] sm:w-28">
                Señal
              </th>
              <th scope="col" className="rotulo pb-3 text-[0.8125rem]">
                Etapa y significado
              </th>
            </tr>
          </thead>
          <tbody>
            {ESTADOS.map((estado, i) => {
              const d = DEFINICIONES[estado];
              return (
                <tr key={estado} className="border-b border-acero align-middle">
                  <td className="py-4 font-cartel text-[2rem] font-bold leading-none sm:text-[2.5rem]">{i + 1}</td>
                  <td className="py-4">
                    <Senal forma={d.forma} pictograma={estado} simple className="size-14 sm:size-[4.5rem]" />
                  </td>
                  <th scope="row" className="py-4 text-left font-normal">
                    <span className="rotulo block text-xl font-extrabold sm:text-[1.375rem]">{d.rotulo}</span>
                    <p className="mt-1 max-w-[56ch] text-grafito">{d.significado}</p>
                  </th>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
