import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { modoDatos } from "@/lib/datos/repositorios";
import { CODIGOS_DE_PRUEBA } from "@/lib/datos/local";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { IlustracionAtardecer } from "./IlustracionAtardecer";

const ANIO = new Date().getFullYear();

/** Datos de contacto del taller: pendientes hasta que Tecvol los confirme. */
const DATOS_CONTACTO = ["Teléfono", "Email", "Dirección"];

const ACCESOS = [
  { texto: "Consultar estado", href: "#titulo-inicio" },
  { texto: "Ingresar al portal", href: "/ingresar" },
  { texto: "Enviar consulta", href: "#consulta" },
];

const SERVICIOS = ["Reparación y rebobinado", "Mantenimiento y ensayos"];

const LINEA_FINA = "border-[color-mix(in_srgb,var(--color-tinta)_25%,var(--color-durazno))]";

/** Las anclas de la misma página van con <a>, las páginas con Link. */
function EnlacePie({ href, children }: { href: string; children: ReactNode }) {
  const clase = "block py-3 no-underline hover:underline";
  return href.startsWith("/") ? (
    <Link href={href} className={clase}>
      {children}
    </Link>
  ) : (
    <a href={href} className={clase}>
      {children}
    </a>
  );
}

/**
 * El pie como el final del recorrido: la línea rural del pliego llega al horizonte con el sol poniéndose
 * (la página empieza de día y termina al atardecer), y los datos del taller van en una banda durazno.
 */
export function Pie() {
  return (
    <footer className="mt-24 lg:mt-32">
      <IlustracionAtardecer className="block h-[110px] w-full sm:h-[150px] lg:h-[180px]" />
      <div className="bg-durazno text-tinta">
        <div className="mx-auto grid max-w-[1680px] gap-x-12 gap-y-10 px-5 pb-10 pt-12 sm:px-8 lg:grid-cols-12 lg:pb-12 lg:pt-16">
          <div className="lg:col-span-5">
            <span className="placa-logo">
              <Image src="/marca/tecvol-logo.png" alt="Tecvol, ingeniería electromecánica" width={1600} height={379} unoptimized className="h-11 w-auto" />
            </span>
            <ul className="rotulo mt-6 space-y-1 text-lg font-semibold leading-tight tracking-[0.08em] sm:text-xl">
              {SERVICIOS.map((servicio) => (
                <li key={servicio} className="flex items-center gap-3">
                  <span aria-hidden="true" className="h-1 w-5 shrink-0 bg-naranja" />
                  {servicio}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h2 className="rotulo border-b-2 border-tinta pb-2 text-[0.9375rem]">Contacto</h2>
            <dl>
              {DATOS_CONTACTO.map((dato) => (
                <div key={dato} className={`flex items-center justify-between gap-4 border-b py-3 ${LINEA_FINA}`}>
                  <dt>{dato}</dt>
                  <dd>
                    <span className="tarjeta-bloqueo">Pendiente</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <nav aria-label="Accesos" className="lg:col-span-3">
            <h2 className="rotulo border-b-2 border-tinta pb-2 text-[0.9375rem]">Accesos</h2>
            <ul>
              {ACCESOS.map((a) => (
                <li key={a.href} className={`border-b ${LINEA_FINA}`}>
                  <EnlacePie href={a.href}>{a.texto}</EnlacePie>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={`border-t ${LINEA_FINA}`}>
          <div className="mx-auto flex max-w-[1680px] flex-wrap justify-between gap-x-8 gap-y-2 px-5 py-5 text-[0.9375rem] sm:px-8">
            <p>© {ANIO} Tecvol · Ingeniería electromecánica</p>
            {modoDatos === "local" && (
              <p>Datos de prueba. Códigos para probar el seguimiento: {CODIGOS_DE_PRUEBA.map(formatearCodigo).join(" · ")}</p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
