"use client";

import { useRef, useState, type FormEvent } from "react";
import { Alerta, Flecha } from "@/components/iconos";
import { Senal } from "@/components/senal/Senal";
import { obtenerRepositorios } from "@/lib/datos/repositorios";
import type { ConsultaNueva } from "@/lib/dominio/tipos";
import { TornillosMarco } from "./TornillosMarco";

type Campo = keyof ConsultaNueva;

interface DefinicionCampo {
  campo: Campo;
  etiqueta: string;
  ayuda?: string;
  opcional?: boolean;
  tipo?: "email" | "tel" | "text";
  autoComplete?: string;
  maximo: number;
  ancho?: boolean;
}

const CAMPOS: DefinicionCampo[] = [
  { campo: "empresa", etiqueta: "Empresa", autoComplete: "organization", maximo: 120 },
  { campo: "nombre", etiqueta: "Nombre y apellido", autoComplete: "name", maximo: 120 },
  { campo: "email", etiqueta: "Email", tipo: "email", autoComplete: "email", maximo: 160 },
  { campo: "telefono", etiqueta: "Teléfono", tipo: "tel", autoComplete: "tel", opcional: true, maximo: 40 },
  { campo: "localidad", etiqueta: "Localidad", autoComplete: "address-level2", opcional: true, maximo: 120 },
  {
    campo: "equipo",
    etiqueta: "Equipo",
    ayuda: "Potencia, tensiones y tipo, si los tiene a mano.",
    opcional: true,
    maximo: 200,
  },
];

const VACIO: Record<Campo, string> = {
  empresa: "",
  nombre: "",
  email: "",
  telefono: "",
  localidad: "",
  equipo: "",
  descripcion: "",
};

function validar(valores: Record<Campo, string>): Partial<Record<Campo, string>> {
  const errores: Partial<Record<Campo, string>> = {};
  if (!valores.empresa.trim()) errores.empresa = "Escriba el nombre de su empresa.";
  if (!valores.nombre.trim()) errores.nombre = "Escriba su nombre y apellido.";
  if (!valores.email.trim()) errores.email = "Escriba un email para que el taller pueda responderle.";
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.email.trim()))
    errores.email = "Revise el email: debe tener la forma nombre@empresa.com.ar.";
  if (!valores.descripcion.trim()) errores.descripcion = "Describa el equipo y la falla que presenta.";
  return errores;
}

export function FormularioConsulta() {
  const [valores, setValores] = useState(VACIO);
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [fase, setFase] = useState<"editando" | "enviando" | "enviada" | "error">("editando");
  const [emailEnviado, setEmailEnviado] = useState("");
  const formulario = useRef<HTMLFormElement>(null);
  const confirmacion = useRef<HTMLDivElement>(null);

  function cambiar(campo: Campo, valor: string) {
    setValores((v) => ({ ...v, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const encontrados = validar(valores);
    setErrores(encontrados);
    const primero = (Object.keys(VACIO) as Campo[]).find((c) => encontrados[c]);
    if (primero) {
      formulario.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
      return;
    }

    // Campo trampa: si un bot lo completa, se muestra el envío sin guardar nada.
    const trampa = new FormData(evento.currentTarget).get("sitio");
    const consulta: ConsultaNueva = {
      empresa: valores.empresa.trim(),
      nombre: valores.nombre.trim(),
      email: valores.email.trim(),
      telefono: valores.telefono.trim() || undefined,
      localidad: valores.localidad.trim() || undefined,
      equipo: valores.equipo.trim() || undefined,
      descripcion: valores.descripcion.trim(),
    };

    setFase("enviando");
    try {
      if (!trampa) {
        const { consultas } = await obtenerRepositorios();
        await consultas.crear(consulta);
      }
      setEmailEnviado(consulta.email);
      setValores(VACIO);
      setFase("enviada");
      requestAnimationFrame(() => confirmacion.current?.focus());
    } catch {
      setFase("error");
    }
  }

  return (
    <section id="consulta" aria-labelledby="titulo-consulta" className="px-3.5 pt-20 sm:px-5 lg:px-6 lg:pt-28">
      <div className="grid gap-x-12 gap-y-10 filete-seccion pt-7 lg:grid-cols-12">
        <div className="lg:col-span-5 xl:col-span-4">
          <h2
            id="titulo-consulta"
            className="font-cartel text-[2.5rem] font-bold uppercase leading-[0.95] sm:text-5xl lg:text-[3.5rem]"
          >
            ¿Tiene un transformador para reparar?
          </h2>
          <p className="mt-5 max-w-[42ch] text-lg">
            Describa el equipo y la falla. El taller revisa cada consulta y le responde al email que indique. Los datos de contacto directo del taller están al pie de la página.
          </p>
        </div>

        <div className="lg:col-span-7 xl:col-span-8">
          {fase === "enviada" ? (
            <div
              ref={confirmacion}
              tabIndex={-1}
              role="status"
              className="marco marco-cuerpo flex flex-col items-start gap-5 sm:flex-row"
            >
              <TornillosMarco />
              <Senal forma="registro" pictograma="enviado" className="size-20 shrink-0" />
              <div>
                <h3 className="rotulo text-[1.75rem] font-extrabold">Consulta enviada</h3>
                <p className="mt-2 max-w-[48ch] text-lg">
                  El taller la revisará y le responderá a <strong className="font-semibold">{emailEnviado}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setFase("editando")}
                  className="rotulo mt-5 cursor-pointer text-[0.9375rem] underline"
                >
                  Enviar otra consulta
                </button>
              </div>
            </div>
          ) : (
            <form
              ref={formulario}
              onSubmit={enviar}
              noValidate
              aria-busy={fase === "enviando"}
              className="marco marco-cuerpo"
            >
              <TornillosMarco />
              <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
                {CAMPOS.map((c) => (
                  <CampoTexto
                    key={c.campo}
                    definicion={c}
                    valor={valores[c.campo]}
                    error={errores[c.campo]}
                    onCambio={(v) => cambiar(c.campo, v)}
                  />
                ))}
                <div className="sm:col-span-2">
                  <label htmlFor="consulta-descripcion" className="rotulo block text-[0.9375rem]">
                    Descripción de la falla
                  </label>
                  <textarea
                    id="consulta-descripcion"
                    name="descripcion"
                    rows={4}
                    maxLength={2000}
                    value={valores.descripcion}
                    onChange={(e) => cambiar("descripcion", e.target.value)}
                    aria-invalid={errores.descripcion ? true : undefined}
                    aria-describedby={errores.descripcion ? "consulta-descripcion-error" : undefined}
                    className="renglon mt-1 min-h-32 resize-y"
                  />
                  {errores.descripcion && <MensajeError id="consulta-descripcion-error" texto={errores.descripcion} />}
                </div>
              </div>

              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="consulta-sitio">Sitio web</label>
                <input id="consulta-sitio" name="sitio" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
                <button type="submit" className="placa" disabled={fase === "enviando"}>
                  {fase === "enviando" ? "Enviando…" : "Enviar consulta"}
                  {fase !== "enviando" && <Flecha />}
                </button>
                {fase === "error" && (
                  <p role="alert" className="flex max-w-[48ch] items-start gap-2 font-medium text-rojo">
                    <Alerta className="mt-0.5 size-5 shrink-0" />
                    No se pudo enviar la consulta. Revise su conexión e intente de nuevo; sus datos siguen cargados.
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function CampoTexto({
  definicion,
  valor,
  error,
  onCambio,
}: {
  definicion: DefinicionCampo;
  valor: string;
  error?: string;
  onCambio: (valor: string) => void;
}) {
  const id = `consulta-${definicion.campo}`;
  const descripcion = [error && `${id}-error`, definicion.ayuda && `${id}-ayuda`].filter(Boolean).join(" ");
  return (
    <div>
      <label htmlFor={id} className="rotulo block text-[0.9375rem]">
        {definicion.etiqueta}
        {definicion.opcional && <span className="ml-1.5 font-sans font-normal normal-case tracking-normal">(opcional)</span>}
      </label>
      <input
        id={id}
        name={definicion.campo}
        type={definicion.tipo ?? "text"}
        autoComplete={definicion.autoComplete}
        maxLength={definicion.maximo}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={descripcion || undefined}
        className="renglon mt-1"
      />
      {definicion.ayuda && !error && (
        <p id={`${id}-ayuda`} className="mt-1.5 text-[0.9375rem]">
          {definicion.ayuda}
        </p>
      )}
      {error && <MensajeError id={`${id}-error`} texto={error} />}
    </div>
  );
}

function MensajeError({ id, texto }: { id: string; texto: string }) {
  return (
    <p id={id} className="mt-2 flex items-start gap-2 text-[0.9375rem] font-medium text-rojo">
      <Alerta className="mt-0.5 size-[1.125rem] shrink-0" />
      {texto}
    </p>
  );
}
