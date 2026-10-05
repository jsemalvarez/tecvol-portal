import { FormularioIngreso } from "./FormularioIngreso";
import { AvisoCuentasPrueba, EsqueletoAcceso, NotaCuentas } from "./piezas";

/** Ingreso despejado: el formulario solo, sobre el horizonte del pie del inicio. */
export function Ingreso() {
  return (
    <EsqueletoAcceso
      banda={
        <>
          <NotaCuentas className="max-w-[52ch]" />
          <AvisoCuentasPrueba />
        </>
      }
    >
      <section aria-labelledby="titulo-ingreso" className="mx-auto flex w-full max-w-[34rem] flex-1 flex-col justify-center px-7 py-12">
        <p className="rotulo text-[0.9375rem] text-grafito">Portal de clientes · Panel del taller</p>
        <h1 id="titulo-ingreso" className="mt-2 font-cartel text-[3rem] font-bold leading-[0.92] sm:text-[4rem]">
          Ingresar
        </h1>
        <div className="mt-8">
          <FormularioIngreso />
        </div>
      </section>
    </EsqueletoAcceso>
  );
}
