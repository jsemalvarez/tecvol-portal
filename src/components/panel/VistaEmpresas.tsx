"use client";

import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { PaginaPanel, type ApiPanel } from "./PaginaPanel";

/** Empresas y cuentas: cada empresa con sus equipos y las cuentas que entran a su portal. */
export function PanelEmpresas() {
  return <PaginaPanel seccion="empresas">{(api) => <Empresas api={api} />}</PaginaPanel>;
}

function Empresas({ api }: { api: ApiPanel }) {
  const { empresas, equipos, cuentas } = api.taller;
  const conocidas = new Set(empresas.map((e) => e.id));
  const sinEmpresa = equipos.filter((e) => !conocidas.has(e.empresa)).length;

  if (empresas.length === 0) {
    return <p className="mt-10 max-w-[56ch] text-lg">Todavía no hay empresas. Cree la primera con "Nueva empresa".</p>;
  }

  return (
    <div className="mt-10">
      {sinEmpresa > 0 && (
        <p className="mb-8 max-w-[64ch] text-[0.9375rem]">
          <strong className="font-semibold">{sinEmpresa === 1 ? "Un equipo no tiene" : `${sinEmpresa} equipos no tienen`} empresa.</strong> Asígnela
          desde "Editar" en la lista de equipos, para que su cliente lo vea en el portal.
        </p>
      )}
      <ul className="grid gap-8 lg:grid-cols-2">
        {empresas.map((empresa) => {
          const suyos = equipos.filter((e) => e.empresa === empresa.id);
          const enTaller = suyos.filter((e) => e.estado !== "entregado").length;
          const suyas = cuentas.filter((c) => c.empresa === empresa.id);
          return (
            <li key={empresa.id}>
              <section aria-labelledby={`empresa-${empresa.id}`} className="marco h-full">
                <TornillosMarco />
                <div className="marco-cabecera">
                  <h2 id={`empresa-${empresa.id}`} className="rotulo text-base">
                    {empresa.nombre}
                  </h2>
                </div>
                <div className="marco-cuerpo">
                  <p className="text-lg">
                    {enTaller} en el taller · {suyos.length - enTaller} {suyos.length - enTaller === 1 ? "entregado" : "entregados"}
                  </p>
                  <h3 className="rotulo mt-6 border-b-[3px] border-acero pb-2 text-[0.9375rem]">Cuentas del portal</h3>
                  {suyas.length === 0 ? (
                    <p className="py-3 text-[0.9375rem] text-grafito">Sin cuentas: nadie de la empresa entra al portal todavía.</p>
                  ) : (
                    <ul>
                      {suyas.map((cuenta) => (
                        <li key={cuenta.uid} className="border-b border-acero py-2.5 text-[0.9375rem]">
                          {cuenta.email}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" onClick={() => api.abrirCuenta(empresa)} className="placa-secundaria mt-5">
                    Agregar cuenta
                  </button>
                </div>
              </section>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
