"use client";

import Image from "next/image";
import Link from "next/link";
import { Flecha } from "@/components/iconos";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { AvisoConsulta, AyudaCodigo, SenalConFranja } from "./consulta/piezas";
import { Resultado } from "./consulta/Resultado";
import { codigoDeConsulta, senalDeConsulta, useConsulta } from "./consulta/useConsulta";
import { IlustracionPliego } from "./IlustracionPliego";
import { MarcasDeCorte } from "./MarcasDeCorte";

const ANIO = new Date().getFullYear();

/** Rieles laterales del pliego: año a la izquierda, oficio a la derecha. */
function Rieles() {
  return (
    <>
      <div aria-hidden="true" className="absolute left-8 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-3 xl:flex">
        <span className="rotulo text-lg">©</span>
        <span className="rotulo flex flex-col items-center text-[0.9375rem] leading-[1.15]">
          {String(ANIO)
            .split("")
            .map((d, i) => (
              <span key={i}>{d}</span>
            ))}
        </span>
        <svg viewBox="0 0 20 20" className="size-4">
          <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 1 V19 M1 10 H19" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="mt-2 flex flex-col">
          {[100, 72, 48, 28].map((p) => (
            <span key={p} className="h-11 w-2.5" style={{ background: `color-mix(in srgb, var(--color-naranja) ${p}%, var(--color-esmalte))` }} />
          ))}
        </span>
      </div>
      <p
        aria-hidden="true"
        className="rotulo absolute right-8 top-1/2 hidden -translate-y-1/2 text-[0.8125rem] tracking-[0.3em] text-grafito [writing-mode:vertical-rl] xl:block"
      >
        Ingeniería electromecánica
      </p>
    </>
  );
}

/**
 * Primera pantalla del inicio: un pliego impreso con marcas de corte, sobre esmalte. La puerta para clientes
 * nuevos va arriba, en una placa durazno; el título y el código a la izquierda; a la derecha, la red rural y el
 * taller en línea naranja, que al consultar se reemplaza por la señal y los datos del equipo.
 */
export function HeroPliego({ codigoInicial }: { codigoInicial?: string }) {
  const { entrada, cambiarEntrada, errorCampo, consulta, enviar, limpiar, campo, resultado, seguimiento, cargando, hayResultado } =
    useConsulta(codigoInicial);
  const senal = senalDeConsulta(consulta);
  const codigo = codigoDeConsulta(consulta);

  return (
    <section aria-labelledby="titulo-inicio" className="relative overflow-hidden bg-esmalte">
      <MarcasDeCorte />
      <Rieles />

      <div className="mx-auto flex min-h-svh max-w-[1500px] flex-col px-7 pb-12 pt-8 sm:px-12 xl:px-24">
        <header className="flex items-center gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-4 no-underline">
            <span className="placa-logo !bg-blanco">
              <Image src="/marca/tecvol-logo.png" alt="Tecvol" width={1600} height={379} priority unoptimized className="h-7 w-auto lg:h-8" />
            </span>
            <span className="rotulo hidden truncate text-base font-semibold sm:block">Reparación de transformadores</span>
          </Link>
          <nav aria-label="Secciones" className="ml-auto hidden items-center gap-7 xl:flex">
            <a href="#como-se-lee" className="rotulo text-[0.9375rem] font-semibold no-underline hover:underline">
              Cómo se lee el estado
            </a>
            <a href="#servicios" className="rotulo text-[0.9375rem] font-semibold no-underline hover:underline">
              Servicios
            </a>
            <a href="#consulta" className="rotulo text-[0.9375rem] font-semibold no-underline hover:underline">
              Consulta
            </a>
          </nav>
          <Link href="/ingresar" className="placa-banda ml-auto shrink-0 xl:ml-2">
            Ingresar
          </Link>
        </header>

        <a
          href="#consulta"
          className="group mx-auto mt-7 flex w-full max-w-[64rem] flex-col items-start justify-between gap-4 rounded-2xl bg-durazno px-6 py-5 text-tinta no-underline sm:flex-row sm:items-center sm:px-10 lg:mt-9 lg:py-7"
        >
          <span className="font-cartel text-[1.625rem] font-semibold leading-tight lg:text-[2.25rem]">
            ¿Tiene un transformador para reparar?
          </span>
          <span className="rotulo inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[0.5rem] border-2 border-tinta px-4 text-[0.9375rem] transition-colors group-hover:bg-tinta group-hover:text-durazno">
            Enviar consulta
            <Flecha className="size-4" />
          </span>
        </a>

        <div className="grid flex-1 items-center gap-x-14 gap-y-12 pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:py-14">
          <div>
            <h1
              id="titulo-inicio"
              className="max-w-[13ch] font-cartel text-[3rem] font-bold leading-[0.92] tracking-[-0.01em] sm:text-[4rem] lg:text-[clamp(4rem,5.4vw,6.25rem)]"
            >
              ¿En qué estado está su transformador?
            </h1>

            <form onSubmit={enviar} noValidate aria-busy={cargando} className="mt-8 lg:mt-10">
              <label htmlFor="codigo" className="rotulo block text-[0.9375rem]">
                Código de seguimiento
              </label>
              <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end">
                <input
                  ref={campo}
                  id="codigo"
                  name="codigo"
                  value={entrada}
                  onChange={(e) => cambiarEntrada(e.target.value)}
                  placeholder="____-____"
                  autoComplete="off"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  maxLength={9}
                  aria-invalid={errorCampo ? true : undefined}
                  aria-describedby={errorCampo ? "codigo-error" : "codigo-ayuda"}
                  className="renglon w-full font-cartel !text-[2.5rem] font-semibold uppercase leading-none tracking-[0.14em] sm:w-[7.25em] lg:!text-[3rem]"
                />
                <button
                  type="submit"
                  className="placa min-h-16 sm:px-8"
                  disabled={cargando}
                >
                  {cargando ? "Consultando…" : "Consultar estado"}
                  {!cargando && <Flecha />}
                </button>
              </div>
              <AyudaCodigo error={errorCampo} oculta={hayResultado} className="mt-3" />
            </form>
            {consulta.fase === "error" && (
              <div className="mt-5">
                <AvisoConsulta consulta={consulta} />
              </div>
            )}
          </div>

          <div ref={resultado} aria-live="polite" className={`scroll-mt-6 ${senal ? "order-first lg:order-none" : ""}`}>
            {senal ? (
              <div className="flex flex-col items-start gap-7">
                <SenalConFranja
                  senal={senal}
                  idDestello="pliego"
                  anchoSenal="w-32 lg:w-36"
                  pie={
                    codigo && (
                      <>
                        <span className="rotulo text-[0.9375rem]">{seguimiento ? "Su equipo" : "Código"}</span>
                        <span className="font-medium">{formatearCodigo(codigo)}</span>
                      </>
                    )
                  }
                />
                <div>
                  {cargando && <p className="text-lg">Consultando el estado…</p>}
                  {seguimiento && <Resultado seguimiento={seguimiento} onOtra={limpiar} />}
                  {consulta.fase === "no-encontrada" && (
                    <>
                      <AvisoConsulta consulta={consulta} />
                      <button type="button" onClick={limpiar} className="placa-secundaria mt-6">
                        Consultar otro código
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <IlustracionPliego className="block w-full" />
            )}
          </div>
        </div>

        <p className="rotulo text-xl font-semibold tracking-[0.08em] sm:text-2xl">
          Reparación y rebobinado <span className="text-naranja">·</span> Mantenimiento y ensayos
        </p>
      </div>
    </section>
  );
}
