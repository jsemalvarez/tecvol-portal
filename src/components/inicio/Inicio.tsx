import { FormularioConsulta } from "./FormularioConsulta";
import { HeroPliego } from "./HeroPliego";
import { Leyenda } from "./Leyenda";
import { Pie } from "./Pie";
import { Portal } from "./Portal";
import { Servicios } from "./Servicios";

/** Página de inicio. `codigoInicial` llega por el QR de la orden de ingreso. */
export function Inicio({ codigoInicial }: { codigoInicial?: string }) {
  return (
    <>
      <main>
        <HeroPliego codigoInicial={codigoInicial} />
        <div className="mx-auto max-w-[1680px]">
          <Leyenda />
          <Portal />
          <Servicios />
          <FormularioConsulta />
        </div>
      </main>
      <Pie />
    </>
  );
}
