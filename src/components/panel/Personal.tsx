"use client";

import { TornillosMarco } from "@/components/inicio/TornillosMarco";
import { CUENTAS_DE_PRUEBA } from "@/lib/datos/local/autenticacion";
import { CLAVE_CUENTAS_NUEVAS } from "@/lib/datos/local/datos";
import { modoDatos } from "@/lib/datos/repositorios";
import { NOMBRES_ROL } from "@/lib/dominio/roles";
import { activos, type CuentaPersonal } from "@/lib/dominio/tipos";
import { PaginaPanel, type ApiPanel } from "./PaginaPanel";

const enlace = "cursor-pointer text-[0.9375rem] font-semibold underline decoration-naranja decoration-2 underline-offset-4";

/** Cuentas del personal de Tecvol: quién entra al panel y con qué rol. Solo para administradores. */
export function PanelPersonal() {
  return (
    <PaginaPanel
      seccion="personal"
      nota={
        <>
          <strong className="font-semibold">Estas cuentas entran al panel, no al portal.</strong> El jefe de taller trabaja con los
          equipos; el administrador, además, con empresas y cuentas.
        </>
      }
    >
      {(api) => <Personal api={api} />}
    </PaginaPanel>
  );
}

function Personal({ api }: { api: ApiPanel }) {
  const porEmail = (a: CuentaPersonal, b: CuentaPersonal) => a.email.localeCompare(b.email, "es");
  const vigentes = activos(api.taller.personal).sort(porEmail);
  const bajas = api.taller.personal.filter((p) => p.baja).sort(porEmail);

  return (
    <div className="mt-10 flex flex-col gap-10">
      <Lista api={api} titulo="Cuentas activas" cuentas={vigentes} />
      {bajas.length > 0 && <Lista api={api} titulo="Dadas de baja" cuentas={bajas} />}
    </div>
  );
}

function Lista({ api, titulo, cuentas }: { api: ApiPanel; titulo: string; cuentas: CuentaPersonal[] }) {
  return (
    <section aria-label={titulo} className="marco">
      <TornillosMarco />
      <div className="marco-cabecera">
        <h2 className="rotulo text-base">{titulo}</h2>
        <span className="rotulo text-base">{cuentas.length}</span>
      </div>
      {cuentas.length === 0 ? (
        <p className="marco-cuerpo">No hay cuentas.</p>
      ) : (
        <ul>
          {cuentas.map((cuenta) => (
            <li key={cuenta.uid} className="marco-fila flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-[var(--marco-px)] py-4">
              <div className="min-w-0">
                <p className={`font-semibold leading-snug ${cuenta.baja ? "text-grafito" : ""}`}>
                  {cuenta.email}
                  {cuenta.uid === api.uid && <span className="font-normal text-grafito"> · su cuenta</span>}
                </p>
                <p className="text-[0.9375rem] leading-snug">
                  {NOMBRES_ROL[cuenta.rol]}
                  {modoDatos === "local" && (
                    <span className="text-grafito">
                      {" "}
                      · contraseña de prueba: {CUENTAS_DE_PRUEBA.find((c) => c.email === cuenta.email)?.clave ?? CLAVE_CUENTAS_NUEVAS}
                    </span>
                  )}
                </p>
              </div>
              <Acciones api={api} cuenta={cuenta} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Acciones({ api, cuenta }: { api: ApiPanel; cuenta: CuentaPersonal }) {
  // La propia cuenta no se toca: un administrador no se puede quitar el acceso ni el rol (las reglas tampoco lo dejan).
  if (cuenta.uid === api.uid) return null;
  if (cuenta.baja) {
    return (
      <button type="button" onClick={() => api.reactivar("personal", cuenta.uid, cuenta.email)} className={enlace}>
        Reactivar
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <button
        type="button"
        onClick={() => api.abrir({ tipo: "editar-personal", cuenta })}
        className={enlace}
        aria-label={`Cambiar el rol de ${cuenta.email}`}
      >
        Cambiar rol
      </button>
      <button
        type="button"
        onClick={() => api.darDeBaja("personal", cuenta.uid, cuenta.email)}
        className={enlace}
        aria-label={`Dar de baja la cuenta de ${cuenta.email}`}
      >
        Dar de baja
      </button>
    </div>
  );
}
