import { jsPDF } from "jspdf";
import { formatearCodigo } from "@/lib/dominio/codigo";
import { formatearFecha } from "@/lib/dominio/fechas";
import { ACCIONES_ITEM, ESTADOS_ITEM, ITEMS_INSPECCION, NOMBRE_ACCION_ITEM, NOMBRE_ESTADO_ITEM, PUNTOS_RELACION, type Informe } from "@/lib/dominio/informe";
import { FASES, NOMBRE_FASES, NOMBRE_USOS, USOS, formatearNumero } from "@/lib/dominio/placa";
import type { EquipoTaller } from "@/lib/dominio/tipos";

/**
 * El informe de diagnóstico en PDF, con la grilla de la "Plantilla de entrada y registro de taller" de
 * papel: recepción, placa de características, inspección visual, resistencia de aislamiento y relación
 * de transformación, con lugar para las firmas. Entra en una hoja A4.
 *
 * Usa las fuentes estándar del PDF (Helvetica, como el Arial de la planilla), que solo traen Latin-1:
 * la Ω sale de la fuente Symbol y las casillas se dibujan.
 */

export interface DatosPdfInforme {
  equipo: EquipoTaller;
  empresa: string;
  informe: Informe;
  guardado: { actualizado: Date | null; por?: string } | null;
}

const hora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });

const MARGEN = 12;
const IZQ = MARGEN;
const ANCHO = 210 - 2 * MARGEN;
const ABAJO = 297 - MARGEN - 6;
const PADDING = 1.8;

const TINTA: [number, number, number] = [26, 26, 26];
const GRAFITO: [number, number, number] = [92, 92, 92];
const BARRA: [number, number, number] = [222, 222, 218];
const SUAVE: [number, number, number] = [240, 240, 237];

const numero = (valor: number | null | undefined, decimales = 2) => (valor == null ? "" : formatearNumero(valor, decimales));

export async function descargarPdfInforme(datos: DatosPdfInforme): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: `Planilla de taller ${formatearCodigo(datos.equipo.codigo)}`, author: "Tecvol SRL" });
  dibujar(doc, datos, await cargarLogo());
  doc.save(`planilla-taller-${datos.equipo.codigo}.pdf`);
}

async function cargarLogo(): Promise<string | null> {
  try {
    const respuesta = await fetch("/marca/tecvol-logo.png");
    if (!respuesta.ok) return null;
    const blob = await respuesta.blob();
    return await new Promise((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onload = () => resolver(lector.result as string);
      lector.onerror = rechazar;
      lector.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

type Columna = { ancho: number; dibujar?: (x: number, y: number, ancho: number, alto: number) => void; relleno?: [number, number, number] };

function dibujar(doc: jsPDF, { equipo, empresa, informe, guardado }: DatosPdfInforme, logo: string | null) {
  const placa = equipo.placa ?? {};
  let y = MARGEN;

  doc.setLineWidth(0.3);
  doc.setDrawColor(...TINTA);
  doc.setTextColor(...TINTA);

  const fuente = (tam: number, negrita = false) => {
    doc.setFont("helvetica", negrita ? "bold" : "normal");
    doc.setFontSize(tam);
  };

  /** Texto en una línea, centrado en vertical en `yc`; si no entra en `max`, se corta con puntos. */
  const texto = (valor: string, x: number, yc: number, opciones: { tam?: number; negrita?: boolean; max?: number; centrado?: boolean } = {}) => {
    fuente(opciones.tam ?? 8.5, opciones.negrita);
    let linea = valor;
    if (opciones.max && doc.getTextWidth(linea) > opciones.max) {
      while (linea.length > 1 && doc.getTextWidth(`${linea}...`) > opciones.max) linea = linea.slice(0, -1);
      linea = `${linea.trimEnd()}...`;
    }
    doc.text(linea, x, yc, { baseline: "middle", align: opciones.centrado ? "center" : "left" });
    // Un poco de aire después de "Etiqueta: ", por si el visor cambia la Helvetica por una más ancha.
    return doc.getTextWidth(linea) + (linea.endsWith(" ") ? 0.6 : 0);
  };

  /** "Etiqueta: valor", con el valor en negrita como en la planilla. */
  const dato = (etiqueta: string, valor: string, x: number, yc: number, max: number, tam = 8.5) => {
    const ancho = texto(`${etiqueta}: `, x, yc, { tam });
    if (valor) texto(valor, x + ancho, yc, { tam, negrita: true, max: max - ancho });
  };

  const casilla = (x: number, yc: number, marcada: boolean) => {
    const lado = 2.7;
    const y0 = yc - lado / 2;
    doc.setLineWidth(0.25);
    doc.rect(x, y0, lado, lado);
    if (marcada) {
      doc.setLineWidth(0.4);
      doc.line(x + 0.5, y0 + 0.5, x + lado - 0.5, y0 + lado - 0.5);
      doc.line(x + lado - 0.5, y0 + 0.5, x + 0.5, y0 + lado - 0.5);
    }
    doc.setLineWidth(0.3);
  };

  /** Casilla con su texto; devuelve dónde termina, con aire para la siguiente. */
  const opcion = (etiqueta: string, x: number, yc: number, marcada: boolean, tam = 8.5) => {
    casilla(x, yc, marcada);
    return x + 3.7 + texto(etiqueta, x + 3.7, yc, { tam, negrita: marcada }) + 3;
  };

  const sitio = (alto: number) => {
    if (y + alto <= ABAJO) return;
    doc.addPage();
    y = MARGEN;
  };

  /** Una fila de ancho completo, con sus columnas recuadradas. */
  const fila = (alto: number, columnas: Columna[]) => {
    sitio(alto);
    let x = IZQ;
    for (const columna of columnas) {
      if (columna.relleno) {
        doc.setFillColor(...columna.relleno);
        doc.rect(x, y, columna.ancho, alto, "F");
      }
      columna.dibujar?.(x, y, columna.ancho, alto);
      doc.rect(x, y, columna.ancho, alto);
      x += columna.ancho;
    }
    y += alto;
  };

  /** Barra gris con el título de la sección; `aclaracion` va sin negrita, como en la planilla. */
  const barra = (titulo: string, aclaracion = "") => {
    sitio(6.5 + 12);
    fila(6.5, [
      {
        ancho: ANCHO,
        relleno: BARRA,
        dibujar: (x, y0, ancho, alto) => {
          fuente(9.5, true);
          const a = doc.getTextWidth(titulo);
          fuente(8.5);
          const b = aclaracion ? doc.getTextWidth(aclaracion) + 1.5 : 0;
          const inicio = x + (ancho - a - b) / 2;
          texto(titulo, inicio, y0 + alto / 2, { tam: 9.5, negrita: true });
          if (aclaracion) texto(aclaracion, inicio + a + 1.5, y0 + alto / 2);
        },
      },
    ]);
  };

  // Encabezado: la marca y la ciudad, como en la planilla.
  fila(21, [
    {
      ancho: ANCHO,
      dibujar: (x, y0, ancho) => {
        if (logo) {
          const w = 50;
          doc.addImage(logo, "PNG", x + (ancho - w) / 2, y0 + 2.2, w, (w * 379) / 1600, "logo", "FAST");
        } else {
          texto("TECVOL", x + ancho / 2, y0 + 8, { tam: 22, negrita: true, centrado: true });
        }
        texto("TECVOL SRL · Mar del Plata", x + ancho / 2, y0 + 17.8, { tam: 8.5, centrado: true });
      },
    },
  ]);

  fila(7.5, [
    {
      ancho: ANCHO,
      dibujar: (x, y0, ancho, alto) =>
        texto(`Planilla de Entrada y Registro de Taller (Orden de Trabajo N.º: ${equipo.numeroOrden || "______"})`, x + ancho / 2, y0 + alto / 2, {
          tam: 10.5,
          negrita: true,
          centrado: true,
        }),
    },
  ]);

  // Recepción, tipo de servicio y fases.
  const ingreso = equipo.etapas.ingresado;
  const recepcion: [string, string][] = [
    ["FECHA DE RECEPCIÓN", ingreso ? formatearFecha(ingreso) : ""],
    ["CLIENTE", empresa],
    ["REFERENCIA", equipo.referencia ?? ""],
    ["N.º SERIE", equipo.serie ?? ""],
    ["CÓDIGO", formatearCodigo(equipo.codigo)],
  ];
  const renglon = 4.6;
  fila(recepcion.length * renglon + 2, [
    {
      ancho: 94,
      dibujar: (x, y0, ancho) =>
        recepcion.forEach(([etiqueta, valor], i) => {
          const yc = y0 + 1 + renglon * (i + 0.5);
          const a = texto(`${etiqueta}: `, x + PADDING, yc, { negrita: true });
          texto(valor, x + PADDING + a, yc, { max: ancho - 2 * PADDING - a });
        }),
    },
    {
      ancho: 42,
      dibujar: (x, y0) => {
        texto("TIPO DE SERVICIO:", x + PADDING, y0 + 1 + renglon / 2, { negrita: true });
        USOS.forEach((uso, i) => opcion(NOMBRE_USOS[uso], x + PADDING, y0 + 1 + renglon * (i + 1.5), equipo.uso === uso));
      },
    },
    {
      ancho: ANCHO - 94 - 42,
      dibujar: (x, y0) => {
        texto("FASES:", x + PADDING, y0 + 1 + renglon / 2, { negrita: true });
        FASES.forEach((fases, i) => opcion(NOMBRE_FASES[fases], x + PADDING, y0 + 1 + renglon * (i + 1.5), placa.fases === fases));
      },
    },
  ]);

  // Placa de características.
  barra("DATOS TÉCNICOS DEL TRANSFORMADOR", "(Placa de Características)");
  const tecnicos: [string, string][][] = [
    [
      ["POTENCIA (kVA)", numero(placa.potencia)],
      ["Servicio", placa.servicio ?? ""],
      ["Norma", placa.norma ?? ""],
    ],
    [
      ["PRIMARIO (V)", numero(placa.tensionPrimaria)],
      ["Enfriamiento", placa.enfriamiento ?? ""],
      ["Frecuencia (Hz)", numero(placa.frecuencia)],
    ],
    [
      ["SECUNDARIO (V)", numero(placa.tensionSecundaria)],
      ["Ucc (%)", numero(placa.tensionCortocircuito)],
      ["Año", placa.anio ? String(placa.anio) : ""],
    ],
    [
      ["Grupo de Conexión", placa.grupoConexion ?? ""],
      ["Peso Total (kg)", numero(placa.masa)],
      ["Cant. Aceite (l)", numero(placa.aceite)],
    ],
    [
      ["Fabricante", placa.fabricante ?? ""],
      ["Tipo", placa.tipo ?? ""],
      ["Material Bobinados", placa.materialBobinados ?? ""],
    ],
  ];
  for (const celdas of tecnicos) {
    fila(
      6,
      celdas.map(([etiqueta, valor]) => ({
        ancho: ANCHO / 3,
        dibujar: (x, y0, ancho, alto) => dato(etiqueta, valor, x + PADDING, y0 + alto / 2, ancho - 2 * PADDING),
      })),
    );
  }

  // Inspección visual.
  barra("INSPECCIÓN VISUAL Y REGISTRO DE ESTADO");
  const anchos = [33, 50, 37, ANCHO - 33 - 50 - 37];
  const encabezado = ["Ítem", "Estado", "Acción", "Comentarios"];
  fila(
    5.5,
    anchos.map((ancho, i) => ({
      ancho,
      relleno: SUAVE,
      dibujar: (x, y0, w, alto) => texto(encabezado[i], x + w / 2, y0 + alto / 2, { tam: 8.5, negrita: true, centrado: true }),
    })),
  );
  for (const item of ITEMS_INSPECCION) {
    const valor = informe.inspeccion[item.id];
    fuente(7.5);
    const comentario = valor?.comentario ? (doc.splitTextToSize(valor.comentario, anchos[3] - 2 * PADDING) as string[]).slice(0, 3) : [];
    const alto = Math.max(6, comentario.length * 3.2 + 2.4);
    fila(alto, [
      { ancho: anchos[0], dibujar: (x, y0) => texto(`- ${item.nombre}`, x + PADDING, y0 + alto / 2) },
      {
        ancho: anchos[1],
        dibujar: (x, y0) => {
          let xo = x + PADDING;
          for (const estado of ESTADOS_ITEM) xo = opcion(NOMBRE_ESTADO_ITEM[estado], xo, y0 + alto / 2, valor?.estado === estado);
        },
      },
      item.conAccion
        ? {
            ancho: anchos[2],
            dibujar: (x, y0) => {
              let xo = x + PADDING;
              for (const accion of ACCIONES_ITEM) xo = opcion(NOMBRE_ACCION_ITEM[accion], xo, y0 + alto / 2, valor?.accion === accion);
            },
          }
        : { ancho: anchos[2], relleno: BARRA },
      {
        ancho: anchos[3],
        dibujar: (x, y0) => {
          fuente(7.5);
          comentario.forEach((linea, i) => doc.text(linea, x + PADDING, y0 + alto / 2 + (i - (comentario.length - 1) / 2) * 3.2, { baseline: "middle" }));
        },
      },
    ]);
  }

  // Resistencia de aislamiento, en MΩ: la Ω sale de la fuente Symbol, donde es la "W".
  barra("PRUEBAS DE RESISTENCIA DE AISLAMIENTO");
  const megaohm = (valor: number | undefined, x: number, yc: number) => {
    if (valor == null) return;
    const ancho = texto(`${numero(valor)} M`, x, yc, { negrita: true });
    doc.setFont("symbol", "normal");
    doc.setFontSize(8.5);
    doc.text("W", x + ancho, yc, { baseline: "middle" });
  };
  const { aislamiento } = informe;
  const mediciones: [string, (x: number, yc: number) => void][] = [
    ["MT-BT", (x, yc) => megaohm(aislamiento.mtBt, x, yc)],
    ["MT-Cuba", (x, yc) => megaohm(aislamiento.mtCuba, x, yc)],
    ["BT-Cuba", (x, yc) => megaohm(aislamiento.btCuba, x, yc)],
    ["Índice de absorción", (x, yc) => aislamiento.indiceAbsorcion != null && texto(numero(aislamiento.indiceAbsorcion), x, yc, { negrita: true })],
  ];
  fila(
    7,
    mediciones.map(([etiqueta, valor]) => ({
      ancho: ANCHO / 4,
      dibujar: (x, y0, _ancho, alto) => valor(x + PADDING + texto(`${etiqueta}: `, x + PADDING, y0 + alto / 2), y0 + alto / 2),
    })),
  );

  // Relación de transformación, con la tensión de cada punto según la chapa.
  barra("RELACIÓN DE TRANSFORMACIÓN", `(Puntos 1 a ${PUNTOS_RELACION})`);
  const columnas = [15, 30, 24, 24, 24, ANCHO - 15 - 30 - 72];
  const titulos = ["Punto", "Chapa (V)", "U", "V", "W", "Comentarios"];
  fila(
    5.5,
    columnas.map((ancho, i) => ({
      ancho,
      relleno: SUAVE,
      dibujar: (x, y0, w, alto) => texto(titulos[i], x + w / 2, y0 + alto / 2, { negrita: true, centrado: true }),
    })),
  );
  for (let i = 0; i < PUNTOS_RELACION; i++) {
    const punto = informe.relacion[i];
    fuente(7.5);
    const comentario = punto?.comentario ? (doc.splitTextToSize(punto.comentario, columnas[5] - 2 * PADDING) as string[]).slice(0, 2) : [];
    const alto = Math.max(6, comentario.length * 3.2 + 2.4);
    const celdas = [String(i + 1), numero(placa.conmutador?.[i], 0), numero(punto?.u, 3), numero(punto?.v, 3), numero(punto?.w, 3)];
    fila(alto, [
      ...celdas.map((valor, j) => ({
        ancho: columnas[j],
        dibujar: (x: number, y0: number, w: number) => texto(valor, x + w / 2, y0 + alto / 2, { negrita: j > 1, centrado: true }),
      })),
      {
        ancho: columnas[5],
        dibujar: (x, y0) => {
          fuente(7.5);
          comentario.forEach((linea, k) => doc.text(linea, x + PADDING, y0 + alto / 2 + (k - (comentario.length - 1) / 2) * 3.2, { baseline: "middle" }));
        },
      },
    ]);
  }

  // Firmas, a mano. La fecha de salida, si el equipo ya se entregó.
  const salida = equipo.etapas.entregado;
  const firma = (etiqueta: string, valor = "") => ({
    ancho: ANCHO / 3,
    dibujar: (x: number, y0: number, ancho: number, alto: number) => {
      const yc = y0 + alto - 3;
      const a = texto(`${etiqueta}: `, x + PADDING, yc, { tam: 8 });
      if (valor) texto(valor, x + PADDING + a, yc, { negrita: true });
      else {
        doc.setLineWidth(0.2);
        doc.line(x + PADDING + a, yc + 1.4, x + ancho - PADDING, yc + 1.4);
        doc.setLineWidth(0.3);
      }
    },
  });
  fila(12, [firma("Firma del Técnico"), firma("Firma del Supervisor"), firma("Fecha de Salida", salida ? formatearFecha(salida) : "")]);

  // Pie: de dónde salen los datos.
  const ahora = new Date();
  doc.setTextColor(...GRAFITO);
  const pie = guardado?.actualizado
    ? `Informe guardado el ${formatearFecha(guardado.actualizado)} a las ${hora.format(guardado.actualizado)}${guardado.por ? `, por ${guardado.por}` : ""}.`
    : "";
  texto(pie, IZQ, y + 3.5, { tam: 7, max: ANCHO - 50 });
  fuente(7);
  doc.text(`Generado el ${formatearFecha(ahora)} a las ${hora.format(ahora)}`, IZQ + ANCHO, y + 3.5, { baseline: "middle", align: "right" });
  doc.setTextColor(...TINTA);
}
