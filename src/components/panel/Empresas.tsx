"use client";

import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { CUENTAS_DE_PRUEBA } from "@/lib/datos/local/autenticacion";
import { CLAVE_CUENTAS_NUEVAS } from "@/lib/datos/local/datos";
import { modoDatos } from "@/lib/datos/repositorios";
import { formatearCuit, type Facturacion } from "@/lib/dominio/facturacion";
import { fechaDeCampo, formatearFecha } from "@/lib/dominio/fechas";
import { activos, type CuentaCliente, type Empresa } from "@/lib/dominio/tipos";
import { PaginaPanel, type ApiPanel } from "./PaginaPanel";
import { ReenviarAcceso } from "./ReenviarAcceso";

const enlace = "cursor-pointer text-[0.9375rem] font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/** Empresas y cuentas: cada empresa con sus equipos y las cuentas que entran a su portal. Solo para administradores. */
export function PanelEmpresas() {
  return <PaginaPanel seccion="empresas">{(api) => <Empresas api={api} />}</PaginaPanel>;
}

/** Con datos de prueba, la contraseña con la que entra cada cuenta: la fija del recuadro o la común. */
function clavePrueba(email: string) {
  return CUENTAS_DE_PRUEBA.find((c) => c.email === email)?.clave ?? CLAVE_CUENTAS_NUEVAS;
}

function Empresas({ api }: { api: ApiPanel }) {
  const { empresas, equipos } = api.taller;
  const vigentes = activos(empresas);
  const bajas = empresas.filter((e) => e.baja);
  const conocidas = new Set(empresas.map((e) => e.id));
  const sinEmpresa = activos(equipos).filter((e) => !conocidas.has(e.empresa)).length;

  return (
    <div className="mt-10">
      {sinEmpresa > 0 && (
        <p className="mb-8 max-w-[64ch] text-[0.9375rem]">
          <strong className="font-semibold">{sinEmpresa === 1 ? "Un equipo no tiene" : `${sinEmpresa} equipos no tienen`} empresa.</strong> Asígnela
          desde "Editar" en la lista de equipos, para que su cliente lo vea en el portal.
        </p>
      )}
      {vigentes.length === 0 ? (
        <p className="max-w-[56ch] text-lg">Todavía no hay empresas activas. Cree una con "Nueva empresa".</p>
      ) : (
        <ul className="grid gap-8 lg:grid-cols-2">
          {vigentes.map((empresa) => (
            <li key={empresa.id}>
              <TarjetaEmpresa api={api} empresa={empresa} />
            </li>
          ))}
        </ul>
      )}
      {bajas.length > 0 && <EmpresasDeBaja api={api} empresas={bajas} />}
    </div>
  );
}

function TarjetaEmpresa({ api, empresa }: { api: ApiPanel; empresa: Empresa }) {
  const suyos = activos(api.taller.equipos).filter((e) => e.empresa === empresa.id);
  const enTaller = suyos.filter((e) => e.estado !== "entregado").length;
  const suyas = api.taller.cuentas.filter((c) => c.empresa === empresa.id);
  const vigentes = activos(suyas);

  function darDeBaja() {
    // Sin cuentas activas, nadie pierde el acceso sin que el administrador lo haya decidido cuenta por cuenta.
    if (vigentes.length > 0) {
      api.avisar(
        `Antes de dar de baja ${empresa.nombre}, dé de baja ${
          vigentes.length === 1 ? "su cuenta o pásela" : `sus ${vigentes.length} cuentas o páselas`
        } a otra empresa.`,
      );
      return;
    }
    api.darDeBaja("empresa", empresa.id, empresa.nombre);
  }

  return (
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
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          <button type="button" onClick={() => api.abrir({ tipo: "editar-empresa", empresa })} className={enlace} aria-label={`Editar los datos de ${empresa.nombre}`}>
            Editar datos
          </button>
          <button type="button" onClick={darDeBaja} className={enlace} aria-label={`Dar de baja ${empresa.nombre}`}>
            Dar de baja
          </button>
        </p>
        <h3 className="rotulo mt-6 border-b-[3px] border-acero pb-2 text-[0.9375rem]">Datos de facturación</h3>
        <DatosFacturacion facturacion={empresa.facturacion} />
        <h3 className="rotulo mt-6 border-b-[3px] border-acero pb-2 text-[0.9375rem]">Cuentas del portal</h3>
        {suyas.length === 0 ? (
          <p className="py-3 text-[0.9375rem] text-grafito">Sin cuentas: nadie de la empresa entra al portal todavía.</p>
        ) : (
          <ul>
            {[...vigentes, ...suyas.filter((c) => c.baja)].map((cuenta) => (
              <FilaCuenta key={cuenta.uid} api={api} cuenta={cuenta} />
            ))}
          </ul>
        )}
        <button type="button" onClick={() => api.abrirCuenta(empresa)} className="placa-secundaria mt-5">
          Agregar cuenta
        </button>
      </div>
    </section>
  );
}

function DatosFacturacion({ facturacion }: { facturacion?: Facturacion }) {
  if (!facturacion) {
    return <p className="py-3 text-[0.9375rem] text-grafito">Sin cargar. Complételos desde "Editar datos" para el certificado y la factura.</p>;
  }
  const inicio = facturacion.inicioActividades ? fechaDeCampo(facturacion.inicioActividades) : null;
  const filas: [string, string | undefined][] = [
    ["Razón social", facturacion.razonSocial],
    ["CUIT", facturacion.cuit && formatearCuit(facturacion.cuit)],
    ["Domicilio", facturacion.domicilio],
    ["Teléfonos", facturacion.telefonos],
    ["Inicio de actividades", inicio ? formatearFecha(inicio) : undefined],
  ];
  return (
    <dl className="text-[0.9375rem]">
      {filas.map(([rotulo, valor]) => (
        <div key={rotulo} className="border-b border-acero py-2.5">
          <dt className="text-grafito">{rotulo}</dt>
          <dd className={valor ? "" : "text-grafito"}>{valor ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function FilaCuenta({ api, cuenta }: { api: ApiPanel; cuenta: CuentaCliente }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-acero py-2.5 text-[0.9375rem]">
      <span className={cuenta.baja ? "text-grafito" : ""}>
        {cuenta.email}
        {cuenta.baja && " · dada de baja"}
        {modoDatos === "local" && !cuenta.baja && <span className="text-grafito"> · contraseña de prueba: {clavePrueba(cuenta.email)}</span>}
      </span>
      {cuenta.baja ? (
        <button type="button" onClick={() => api.reactivar("cuenta", cuenta.uid, cuenta.email)} className={enlace} aria-label={`Reactivar la cuenta de ${cuenta.email}`}>
          Reactivar
        </button>
      ) : (
        <span className="flex flex-wrap gap-x-5 gap-y-1">
          <ReenviarAcceso api={api} email={cuenta.email} className={enlace} />
          <button type="button" onClick={() => api.abrir({ tipo: "editar-cuenta", cuenta })} className={enlace} aria-label={`Pasar la cuenta de ${cuenta.email} a otra empresa`}>
            Cambiar de empresa
          </button>
          <button type="button" onClick={() => api.darDeBaja("cuenta", cuenta.uid, cuenta.email)} className={enlace} aria-label={`Dar de baja la cuenta de ${cuenta.email}`}>
            Dar de baja
          </button>
        </span>
      )}
    </li>
  );
}

/** Las empresas dadas de baja quedan guardadas, con sus equipos, por si vuelven. */
function EmpresasDeBaja({ api, empresas }: { api: ApiPanel; empresas: Empresa[] }) {
  return (
    <section aria-labelledby="empresas-baja" className="marco mt-10">
      <TornillosMarco />
      <div className="marco-cabecera">
        <h2 id="empresas-baja" className="rotulo text-base">
          Empresas dadas de baja
        </h2>
        <span className="rotulo text-base">{empresas.length}</span>
      </div>
      <ul>
        {empresas.map((empresa) => (
          <li key={empresa.id} className="marco-fila flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-[var(--marco-px)] py-3.5">
            <span className="text-grafito">{empresa.nombre}</span>
            <button type="button" onClick={() => api.reactivar("empresa", empresa.id, empresa.nombre)} className={enlace} aria-label={`Reactivar ${empresa.nombre}`}>
              Reactivar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
