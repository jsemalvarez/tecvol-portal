import { jsPDF } from "jspdf";
import { calcularProtocolo, extremoCalculado, mostrarCalculo, mostrarCarga, type Celda, type CeldaCalculada, type Celdas, type Posiciones } from "@/lib/dominio/protocolo";

/**
 * El protocolo de ensayo en PDF: la hoja del Excel, con sus colores, sus celdas combinadas y su logo, en una hoja A4.
 * Cada celda se dibuja con su rango del Excel ("C2:F2"), así se puede comparar una con la otra.
 *
 * Usa las fuentes estándar del PDF (Helvetica, como el Arial del Excel), que solo traen Latin-1: la Ω sale de la fuente Symbol.
 */

export interface DatosPdfProtocolo {
  codigo: string;
  celdas: Celdas;
  posiciones: Posiciones;
}

const COLUMNAS = "BCDEFGHIJ";
const ANCHOS_EXCEL = [14.55, 10.33, 10.33, 10.33, 10.33, 13.89, 8.89, 11.22, 9.78];
const ALTO_FILA = 13.8;
const ALTOS_EXCEL: Record<number, number> = { 1: 31.2, 10: 11.25, 31: 18.6, 44: 15.6, 45: 22.8, 54: 8 };
const FILAS = 58;

const MARGEN_X = 12;
const MARGEN_Y = 12;
const ANCHO = 210 - 2 * MARGEN_X;
const ALTO = 297 - 2 * MARGEN_Y;

const TINTA: [number, number, number] = [0, 0, 0];
const AMBAR: [number, number, number] = [255, 192, 0];
const GRIS: [number, number, number] = [242, 242, 242];
const VERDE: [number, number, number] = [204, 255, 153];

interface Opciones {
  negrita?: boolean;
  tam?: number;
  relleno?: [number, number, number];
  izquierda?: boolean;
  /** El borde de la celda: las que en el Excel no tienen, como las del pie. */
  sinBorde?: boolean;
}

export async function descargarPdfProtocolo({ codigo, celdas, posiciones }: DatosPdfProtocolo): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: `Protocolo de ensayo eléctrico ${codigo}`, author: "Tecvol SRL" });
  dibujar(doc, celdas, posiciones, await cargarLogo());
  doc.save(`protocolo-ensayo-${codigo}.pdf`);
}

async function cargarLogo(): Promise<string | null> {
  try {
    const respuesta = await fetch("/marca/tecvol-logo-protocolo.png");
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

function dibujar(doc: jsPDF, celdas: Celdas, posiciones: Posiciones, logo: string | null) {
  const calculo = calcularProtocolo(celdas, posiciones);

  const totalAncho = ANCHOS_EXCEL.reduce((a, b) => a + b, 0);
  const anchos = ANCHOS_EXCEL.map((a) => (a / totalAncho) * ANCHO);
  const altosExcel = Array.from({ length: FILAS }, (_, i) => ALTOS_EXCEL[i + 1] ?? ALTO_FILA);
  const totalAlto = altosExcel.reduce((a, b) => a + b, 0);
  const altos = altosExcel.map((a) => (a / totalAlto) * ALTO);

  const x = (columna: number) => MARGEN_X + anchos.slice(0, columna).reduce((a, b) => a + b, 0);
  const y = (fila: number) => MARGEN_Y + altos.slice(0, fila - 1).reduce((a, b) => a + b, 0);

  /** "C2:F2" (o "H2") en milímetros. */
  const area = (rango: string) => {
    const [desde, hasta = desde] = rango.split(":");
    const col0 = COLUMNAS.indexOf(desde[0]);
    const col1 = COLUMNAS.indexOf(hasta[0]);
    const fil0 = Number(desde.slice(1));
    const fil1 = Number(hasta.slice(1));
    return { x0: x(col0), y0: y(fil0), w: x(col1 + 1) - x(col0), h: y(fil1 + 1) - y(fil0) };
  };

  doc.setDrawColor(...TINTA);
  doc.setTextColor(...TINTA);

  /** Una celda: su recuadro, su relleno y su texto, achicado si no entra. */
  const celda = (rango: string, texto = "", opciones: Opciones = {}) => {
    const { x0, y0, w, h } = area(rango);
    if (opciones.relleno) {
      doc.setFillColor(...opciones.relleno);
      doc.rect(x0, y0, w, h, "F");
    }
    if (!opciones.sinBorde) {
      doc.setLineWidth(0.15);
      doc.rect(x0, y0, w, h);
    }
    if (!texto) return;
    doc.setFont("helvetica", opciones.negrita ? "bold" : "normal");
    let tam = opciones.tam ?? 9;
    doc.setFontSize(tam);
    while (doc.getTextWidth(texto) > w - 0.8 && tam > 4.5) {
      tam -= 0.25;
      doc.setFontSize(tam);
    }
    if (opciones.izquierda) doc.text(texto, x0 + 0.6, y0 + h / 2, { baseline: "middle" });
    else doc.text(texto, x0 + w / 2, y0 + h / 2, { baseline: "middle", align: "center" });
  };

  /** Un recuadro grueso, como los que separan los bloques del Excel. */
  const bloque = (rango: string) => {
    const { x0, y0, w, h } = area(rango);
    doc.setLineWidth(0.45);
    doc.rect(x0, y0, w, h);
  };

  const rotulo = (rango: string, texto: string, opciones: Opciones = {}) => celda(rango, texto, { izquierda: true, ...opciones });
  const fuerte = (rango: string, texto: string, opciones: Opciones = {}) => celda(rango, texto, { negrita: true, ...opciones });
  const banda = (rango: string, texto: string) => celda(rango, texto, { negrita: true, relleno: AMBAR });

  /** Una celda que completa el usuario. */
  const carga = (rango: string, opciones: Opciones = {}) => celda(rango, mostrarCarga(celdas, rango.split(":")[0] as Celda), opciones);
  /** Una celda que se calcula. */
  const cuenta = (rango: string, opciones: Opciones = {}) => celda(rango, mostrarCalculo(calculo, rango.split(":")[0] as CeldaCalculada), opciones);
  const gris = { relleno: GRIS };
  const verde = { relleno: VERDE };

  // Encabezado.
  celda("B1:J1", "PROTOCOLO DE ENSAYO ELECTRICO", { negrita: true, tam: 17, relleno: AMBAR });
  rotulo("B2", "MARCA", { negrita: true });
  carga("C2:F2", { negrita: true });
  rotulo("G2", "POT. kVA", { negrita: true });
  carga("H2");
  rotulo("I2", "N. FABRICA", { negrita: true });
  carga("J2");
  rotulo("B3", "CLIENTE", { negrita: true });
  carga("C3:F3", { negrita: true });
  rotulo("G3", "GRUPO", { negrita: true });
  carga("H3");
  rotulo("I3", "TIPO", { negrita: true });
  carga("J3");
  rotulo("B4", "U primario (V)", { negrita: true });
  carga("C4:D4");
  rotulo("E4", "FECHA", { negrita: true });
  carga("F4");
  rotulo("G4", "Ucc  %", { negrita: true });
  carga("H4");
  rotulo("I4", "ACEITE (lts)", { negrita: true });
  carga("J4");
  rotulo("B5", "Orden N°", { negrita: true });
  carga("C5:D5");
  rotulo("E5", "ID N°", { negrita: true });
  carga("F5");
  rotulo("G5", "I primario (A)", { negrita: true });
  carga("H5");
  rotulo("I5", "I sec. (A)", { negrita: true });
  carga("J5");

  // Valores nominales.
  banda("B6:J6", "VALORES NOMINALES");
  fuerte("B7", "A.T. (V)");
  for (const c of ["C7", "D7", "E7", "F7", "G7"]) {
    if (extremoCalculado(c, posiciones)) cuenta(c);
    else carga(c);
  }
  celda("H7", "( V)");
  fuerte("I7", "B.T ( V )");
  carga("J7");
  fuerte("B8", "A.T. (A)");
  for (const c of ["C8", "D8", "E8", "F8", "G8"]) cuenta(c);
  celda("H8", "(A)");
  fuerte("I8", "B.T  ( A )");
  cuenta("J8");

  // Relación de transformación, con el logo al lado.
  banda("B9:G10", "RELACION DE TRANSFORMACION");
  celda("H9:J18");
  if (logo) {
    const { x0, y0, w, h } = area("H9:J18");
    const alto = h - 2;
    const ancho = (alto * 322) / 264;
    doc.addImage(logo, "PNG", x0 + (w - ancho) / 2, y0 + 1, ancho, alto, "logo", "FAST");
  }
  rotulo("B11", "POSICION", { negrita: true });
  for (const columna of "CDEFG") carga(`${columna}11`, { negrita: true });
  rotulo("B12", "TEORICA");
  cuenta("C12");
  cuenta("D12");
  carga("E12");
  cuenta("F12");
  cuenta("G12");
  ["U", "V", "W"].forEach((fase, i) => {
    rotulo(`B${13 + i}`, `Error Fase ${fase}(%)`);
    for (const columna of "CDEFG") cuenta(`${columna}${13 + i}`);
    rotulo(`B${16 + i}`, `Rel. Fase     ${fase}`, { negrita: true });
    for (const columna of "CDEFG") carga(`${columna}${16 + i}`);
  });

  // Aplicada e inducida.
  banda("B19:E19", "APLICADA");
  celda("F19:F21");
  banda("G19:J19", "INDUCIDA");
  rotulo("B20", "AT/Masa [kV]");
  carga("C20");
  rotulo("D20", "Frec. [Hz]");
  carga("E20");
  rotulo("G20", "Tensión [V]");
  carga("H20");
  celda("I20", "t [seg]");
  carga("J20");
  rotulo("B21", "t [seg]");
  carga("C21");
  rotulo("D21", "I ens. [mA]");
  carga("E21");
  rotulo("G21", "Iens. [mA]");
  carga("H21");
  carga("I21");
  carga("J21");

  // Ensayo en vacío.
  banda("B22:J22", "ENSAYO EN VACIO");
  fuerte("B23:E23", "Tensiones [V]");
  fuerte("F23:F24", "Temp. Amb. (ºC)", { tam: 7.5 });
  fuerte("G23:J23", "Intensidades [A]");
  fuerte("B24", "Medido");
  fuerte("C24", "U-0");
  fuerte("D24", "V-0");
  fuerte("E24", "W-0");
  fuerte("G24", "Medido");
  fuerte("H24", "U");
  fuerte("I24", "V");
  fuerte("J24", "W");
  celda("B25", "Referido x K", gris);
  carga("C25");
  carga("D25");
  carga("E25");
  carga("F25", { negrita: true });
  celda("G25", "Referido x K", gris);
  carga("H25");
  carga("I25");
  carga("J25");
  carga("B26", gris);
  cuenta("C26", gris);
  cuenta("D26", gris);
  cuenta("E26", gris);
  celda("F26:F28");
  carga("G26", gris);
  cuenta("H26", gris);
  cuenta("I26", gris);
  cuenta("J26", gris);
  celda("B27", "U med");
  cuenta("C27");
  celda("D27:E27");
  celda("G27", "I prom.");
  cuenta("H27");
  celda("I27:J27");
  fuerte("B28:E28", "Potencia [W]");
  celda("G28", "Io (%)");
  cuenta("H28");
  celda("I28:J28");
  fuerte("B29", "Medido");
  fuerte("C29", "W1");
  fuerte("D29", "W2");
  fuerte("E29", "W3");
  fuerte("F29", "P. VACIO");
  celda("G29", "Fact. Pot.");
  celda("H29:J29");
  celda("B30", "Referido x K", gris);
  carga("C30");
  carga("D30");
  carga("E30");
  fuerte("F30", "(W)");
  carga("G30:J31");
  carga("B31", gris);
  cuenta("C31", gris);
  cuenta("D31", gris);
  cuenta("E31", gris);
  cuenta("F31", { negrita: true, ...verde });

  // Ensayo en cortocircuito.
  banda("B32:J32", "ENSAYO EN CORTO CIRCUITO");
  fuerte("B33:E33", "Tensiones [V]");
  fuerte("F33:F34", "Temp. Amb. (ºC)", { tam: 7.5 });
  celda("G33:J33", "Intensidades [A]");
  fuerte("B34", "Medido");
  fuerte("C34", "U-V");
  fuerte("D34", "V-W");
  fuerte("E34", "W-U");
  fuerte("G34", "Medido");
  fuerte("H34", "U");
  fuerte("I34", "V");
  fuerte("J34", "W");
  celda("B35", "Referido x K", gris);
  carga("C35");
  carga("D35");
  carga("E35");
  carga("F35", { negrita: true });
  celda("G35", "Referido x K", gris);
  carga("H35");
  carga("I35");
  carga("J35");
  carga("B36", gris);
  cuenta("C36", gris);
  cuenta("D36", gris);
  cuenta("E36", gris);
  celda("F36");
  carga("G36", gris);
  cuenta("H36", gris);
  cuenta("I36", gris);
  cuenta("J36", gris);
  rotulo("B37", "U med");
  cuenta("C37");
  fuerte("D37", "Ucc %");
  cuenta("E37");
  fuerte("F37", "K");
  rotulo("G37", "I med (prom)");
  cuenta("H37", verde);
  celda("I37:J37");
  rotulo("B38", "Ucc a  In");
  cuenta("C38", { negrita: true });
  fuerte("D38", "Ucc % [75º]");
  cuenta("E38", { negrita: true });
  cuenta("F38");
  rotulo("G38", "I nominal");
  cuenta("H38");
  fuerte("I38", "In/Im");
  cuenta("J38");
  fuerte("B39:E39", "Potencia [W]");
  celda("F39:J39");
  fuerte("B40", "Medido");
  fuerte("C40", "W1");
  fuerte("D40", "W2");
  fuerte("E40", "W3");
  fuerte("F40", "Total(W)");
  fuerte("G40:J40", "Perdidas Referidas a 75ºC [W]");
  celda("B41", "Referido x K", gris);
  carga("C41");
  carga("D41");
  carga("E41");
  celda("F41");
  celda("G41:J41");
  carga("B42", gris);
  cuenta("C42", gris);
  cuenta("D42", gris);
  cuenta("E42", gris);
  cuenta("F42");
  cuenta("G42:J42", { negrita: true, ...verde });
  celda("B43", "Pcc Total   (W)", { negrita: true, tam: 8, ...gris });
  cuenta("C43", gris);
  fuerte("D43:E43", "Pcc (amb.) a In   (W)", { tam: 8, ...gris });
  cuenta("F43", { negrita: true });
  celda("G43:J43");
  fuerte("B44", "Fact. Pot.");
  celda("C44:E44");
  fuerte("F44:J44", "Perdidas Totales (Po + Pcu) [W]", { tam: 11 });
  carga("B45:E45");
  cuenta("F45:J45", { negrita: true, tam: 10, ...verde });

  // Firmas.
  carga("B46:E48", { tam: 8 });
  carga("F46:J48", { tam: 9 });
  fuerte("B49:E49", "FIRMA LABORATORISTA", { tam: 8 });
  fuerte("F49:J49", "FIRMA TECVOL S.R.L.", { tam: 8 });
  carga("B50:J52", { tam: 9 });
  fuerte("B53:J53", "FIRMA INSPECTOR", { tam: 8 });

  // Los bloques, con el trazo grueso del Excel.
  for (const rango of ["B1:J1", "B2:J5", "B6:J6", "B7:J8", "B9:G10", "B11:G18", "H9:J18", "B19:E21", "F19:F21", "G19:J21", "B22:J22", "B23:J31", "B32:J32", "B33:J38", "B39:J43", "B44:J45", "B46:E49", "F46:J49", "B50:J53"]) {
    bloque(rango);
  }

  // Aislación, debajo.
  fuerte("B55:C55", "AISLACION (60s)");
  fuerte("D55", "VALOR");
  fuerte("E55", "UNIDAD");
  ([
    ["56", "AT / Tierra (5000V)"],
    ["57", "BT / Tierra (2500V)"],
    ["58", "AT / BT (5000V)"],
  ] as const).forEach(([fila, nombre]) => {
    celda(`B${fila}:C${fila}`, nombre);
    carga(`D${fila}`);
    celda(`E${fila}`);
    const { x0, y0, w, h } = area(`E${fila}`);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const g = doc.getTextWidth("G");
    doc.setFont("symbol", "normal");
    const omega = doc.getTextWidth("W");
    const inicio = x0 + (w - g - omega) / 2;
    doc.text("W", inicio + g, y0 + h / 2, { baseline: "middle" });
    doc.setFont("helvetica", "normal");
    doc.text("G", inicio, y0 + h / 2, { baseline: "middle" });
  });
  bloque("B55:E58");
}
