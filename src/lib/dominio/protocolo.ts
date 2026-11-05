import { fechaDeCampo, fechaParaCampo, formatearFecha } from "./fechas";
import { formatearNumero, leerNumero, numeroParaCampo, type Placa } from "./placa";
import type { EquipoTaller } from "./tipos";
import { ordenParaEtiqueta } from "./trafo";

/**
 * Protocolo de ensayo eléctrico de una O.T. Es el Excel del taller tal cual ("Giorno 315KVA.xlsx", en
 * `referencias/taller/`): el taller pidió respetar sus cuentas y las celdas que completa el usuario. Por eso acá las
 * celdas se llaman como en el Excel (H5, C25…) y cada cuenta es la fórmula de esa celda: para revisarlas se pueden
 * poner una al lado de la otra.
 */

/** Las celdas de texto que completa el usuario. F4 (la fecha) se guarda como `aaaa-mm-dd`. */
const CELDAS_TEXTO = ["C2", "J2", "C3", "H3", "J3", "C4", "F4", "C5", "F5", "G30", "B45", "B46", "F46", "B50"] as const;

/** Las celdas con números que completa el usuario. */
const CELDAS_NUMERO = [
  // Encabezado.
  "H2", "H4", "J4", "H5", "J5",
  // Valores nominales.
  "C7", "D7", "E7", "F7", "G7", "J7",
  // Relación de transformación: la teórica del punto central y la medida, por fase y por punto.
  "E12",
  "C16", "D16", "E16", "F16", "G16",
  "C17", "D17", "E17", "F17", "G17",
  "C18", "D18", "E18", "F18", "G18",
  // Aplicada e inducida.
  "C20", "E20", "C21", "E21", "H20", "J20", "H21", "I21", "J21",
  // Ensayo en vacío: lecturas, temperatura y K de cada instrumento.
  "C25", "D25", "E25", "F25", "H25", "I25", "J25", "B26", "G26", "C30", "D30", "E30", "B31",
  // Ensayo en cortocircuito.
  "C35", "D35", "E35", "F35", "H35", "I35", "J35", "B36", "G36", "C41", "D41", "E41", "B42",
  // Aislación.
  "D56", "D57", "D58",
] as const;

export type CeldaTexto = (typeof CELDAS_TEXTO)[number];
export type CeldaNumero = (typeof CELDAS_NUMERO)[number];
export type Celda = CeldaTexto | CeldaNumero;

/** Lo cargado en el protocolo. Una celda vacía no está. */
export type Celdas = Partial<Record<CeldaTexto, string> & Record<CeldaNumero, number>>;

/** El protocolo con quién lo guardó por última vez y cuándo. Lo pone el sistema, no el formulario. */
export interface ProtocoloGuardado {
  celdas: Celdas;
  actualizado: Date | null;
  por?: string;
}

/** Las lecturas de los vatímetros: en vacío, una fase puede dar negativa (en el Excel de Giorno, W2 y W3). */
const CON_SIGNO: ReadonlySet<Celda> = new Set<Celda>(["C30", "D30", "E30", "C41", "D41", "E41"]);

/** Se escriben con punto de miles ("13.200"). Las lecturas no: "1.158" son 1,158 A. */
const CON_MILES: ReadonlySet<Celda> = new Set<Celda>(["H2", "C7", "D7", "E7", "F7", "G7", "J7"]);

/** Lee lo escrito en una celda. `undefined` si está vacía y `null` si no se entiende. */
export function leerCeldaNumero(celda: CeldaNumero, texto: string): number | null | undefined {
  const limpio = texto.trim();
  if (CON_SIGNO.has(celda) && /^[-−–]/.test(limpio)) {
    const valor = leerNumero(limpio.slice(1));
    return valor == null ? null : -valor;
  }
  return leerNumero(limpio, CON_MILES.has(celda));
}

/** Lo que hay escrito en cada celda, tal cual. */
export type ValoresProtocolo = Record<Celda, string>;

export function valoresDeCeldas(celdas: Celdas): ValoresProtocolo {
  const valores = {} as ValoresProtocolo;
  for (const celda of CELDAS_TEXTO) valores[celda] = celdas[celda] ?? "";
  for (const celda of CELDAS_NUMERO) valores[celda] = numeroParaCampo(celdas[celda]);
  return valores;
}

/** Las celdas con lo que se entiende de lo escrito y cuáles no se entienden. Se puede calcular a medio escribir. */
export function leerValores(valores: ValoresProtocolo): { celdas: Celdas; invalidas: Celda[] } {
  const celdas: Celdas = {};
  const invalidas: Celda[] = [];
  for (const celda of CELDAS_TEXTO) {
    const texto = valores[celda].trim();
    if (texto) celdas[celda] = texto;
  }
  for (const celda of CELDAS_NUMERO) {
    const numero = leerCeldaNumero(celda, valores[celda]);
    if (numero === null) invalidas.push(celda);
    else if (numero !== undefined) celdas[celda] = numero;
  }
  return { celdas, invalidas };
}

/** Lee un protocolo guardado, descartando lo que no tenga la forma esperada. También sirve para guardarlo: sin vacíos. */
export function leerCeldas(valor: unknown): Celdas {
  const datos = (valor && typeof valor === "object" ? valor : {}) as Record<string, unknown>;
  const celdas: Celdas = {};
  for (const celda of CELDAS_TEXTO) {
    const texto = datos[celda];
    if (typeof texto === "string" && texto.trim()) celdas[celda] = texto.trim();
  }
  for (const celda of CELDAS_NUMERO) {
    const numero = datos[celda];
    if (typeof numero === "number" && Number.isFinite(numero)) celdas[celda] = numero;
  }
  return celdas;
}

const FIRMA_HABITUAL = "Ing. Sebastián Vasconcelo";

/** "13200/400/+-5%": las tensiones de la chapa y lo que mueve el conmutador, como se escriben en la planilla. */
function tensionesDeChapa(placa: Placa): string | undefined {
  const { tensionPrimaria: primaria, tensionSecundaria: secundaria, conmutador } = placa;
  if (!primaria) return undefined;
  const puntos = (conmutador ?? []).filter((v): v is number => v != null);
  const paso = puntos.length ? Math.round(((Math.max(...puntos) - primaria) / primaria) * 100) : 0;
  return [primaria, secundaria, paso > 0 ? `+-${paso}%` : undefined].filter(Boolean).join("/");
}

/**
 * Cómo arranca un protocolo nuevo: lo que ya está en la chapa y la O.T. y lo que en el Excel queda de la plantilla al
 * copiar la hoja (el K de los instrumentos, los tiempos y tensiones de los ensayos, las firmas). Son celdas comunes:
 * se pueden cambiar. Las intensidades nominales (H5 y J5) las escribe el usuario, como en el Excel: las cuentas usan
 * ese valor.
 */
export function celdasIniciales(equipo: EquipoTaller, empresa: string): Celdas {
  const placa = equipo.placa ?? {};
  const puntos = placa.conmutador ?? [];
  // Un N.º de trafo temporal (`NT-0001`) o una O.T. temporal no van en un protocolo.
  const serie = equipo.serie?.startsWith("NT-") ? undefined : equipo.serie;
  return leerCeldas({
    C2: placa.fabricante,
    C3: empresa,
    H2: placa.potencia,
    J2: serie,
    H3: placa.grupoConexion,
    J3: placa.tipo ?? placa.enfriamiento,
    C4: tensionesDeChapa(placa),
    F4: equipo.etapas.ensayos ? fechaParaCampo(equipo.etapas.ensayos) : undefined,
    H4: placa.tensionCortocircuito,
    J4: placa.aceite,
    C5: ordenParaEtiqueta(equipo),
    C7: puntos[0],
    D7: puntos[1],
    E7: puntos[2] ?? placa.tensionPrimaria,
    F7: puntos[3],
    G7: puntos[4],
    J7: placa.tensionSecundaria,
    C20: 28.5,
    E20: placa.frecuencia ?? 50,
    C21: 60,
    J20: 40,
    B26: 1,
    G26: 10,
    B31: 10,
    // Las lecturas de un trifásico son de fase a neutro: el K las lleva a tensión de línea.
    B36: placa.fases === "trifasico" ? 1.73 : 1,
    G36: 10,
    B42: 10,
    B46: FIRMA_HABITUAL,
    F46: FIRMA_HABITUAL,
  });
}

type N = number | undefined;

const por = (a: N, b: N): N => (a === undefined || b === undefined ? undefined : a * b);

/** Sin divisor no hay resultado: la celda queda vacía, no con un error. */
const entre = (a: N, b: N): N => (a === undefined || !b ? undefined : a / b);

const cargados = (valores: N[]) => valores.filter((v): v is number => v !== undefined);

/**
 * AVERAGE del Excel. Promedia solo lo cargado: así da con tres lecturas y también con las que tiene un monofásico (en
 * el Excel, para esos casos se cambia a mano el rango de la fórmula; así está hecho el protocolo de ejemplo de Faraday).
 */
function promedio(...valores: N[]): N {
  const hay = cargados(valores);
  return hay.length ? hay.reduce((a, b) => a + b, 0) / hay.length : undefined;
}

function suma(...valores: N[]): N {
  const hay = cargados(valores);
  return hay.length ? hay.reduce((a, b) => a + b, 0) : undefined;
}

/** Una columna del conmutador solo tiene valores si tiene tensión: los de 3 puntos dejan vacías la 2 y la 4. */
const enColumna = (tension: N, base: N, cuenta: (base: number) => number): N => (tension === undefined || base === undefined ? undefined : cuenta(base));

const errorRelacion = (medida: N, teorica: N): N => (medida === undefined || !teorica ? undefined : (medida - teorica) / teorica);

/**
 * Las cuentas del Excel, celda por celda. Cada línea es la fórmula de esa celda. Lo único distinto es que una celda
 * sin datos queda vacía, donde el Excel muestra 0 o #¡DIV/0!.
 */
export function calcularProtocolo(c: Celdas) {
  // Valores nominales.
  const E8 = c.H5;
  const J8 = c.J5;
  const C8 = enColumna(c.C7, E8, (i) => -((5 * i) / 100) + i);
  const D8 = enColumna(c.D7, E8, (i) => -((2.5 * i) / 100) + i);
  const F8 = enColumna(c.F7, E8, (i) => (2.5 * i) / 100 + i);
  const G8 = enColumna(c.G7, E8, (i) => (5 * i) / 100 + i);

  // Relación de transformación.
  const E12 = c.E12;
  const C12 = enColumna(c.C7, E12, (r) => (5 * r) / 100 + r);
  const D12 = enColumna(c.D7, E12, (r) => (2.5 * r) / 100 + r);
  const F12 = enColumna(c.F7, E12, (r) => -(2.5 * r) / 100 + r);
  const G12 = enColumna(c.G7, E12, (r) => -(5 * r) / 100 + r);

  // Ensayo en vacío.
  const C26 = por(c.C25, c.B26);
  const D26 = por(c.D25, c.B26);
  const E26 = por(c.E25, c.B26);
  const H26 = por(c.H25, c.G26);
  const I26 = por(c.I25, c.G26);
  const J26 = por(c.J25, c.G26);
  const C27 = promedio(C26, D26, E26);
  const H27 = promedio(H26, I26, J26);
  const H28 = entre(por(H27, 100), J8);
  const C31 = por(c.C30, c.B31);
  const D31 = por(c.D30, c.B31);
  const E31 = por(c.E30, c.B31);
  const F31 = suma(C31, D31, E31);

  // Ensayo en cortocircuito.
  const C36 = por(c.C35, c.B36);
  const D36 = por(c.D35, c.B36);
  const E36 = por(c.E35, c.B36);
  const H36 = por(c.H35, c.G36);
  const I36 = por(c.I35, c.G36);
  const J36 = por(c.J35, c.G36);
  const C37 = promedio(C36, D36, E36);
  const H37 = promedio(H36, I36, J36);
  const H38 = c.H5;
  const J38 = entre(H38, H37);
  const C38 = entre(por(H38, C37), H37);
  const E37 = por(entre(C38, c.E7), 100);
  const F38 = entre(310, c.F35 === undefined ? undefined : 235 + c.F35);
  const C42 = por(c.C41, c.B42);
  const D42 = por(c.D41, c.B42);
  const E42 = por(c.E41, c.B42);
  const F42 = suma(C42, D42, E42);
  const C43 = F42;
  const F43 = J38 === undefined ? undefined : por(C43, J38 ** 2);
  const G42 = por(F43, F38);
  const F45 = F31 === undefined || G42 === undefined ? undefined : F31 + G42;

  // E38 va tal cual el Excel: =SQRT(((F38^2-1)*((G42/(H2*10))^2))+(C36*J38*100/E7)^2). Con C36 (la fase U-V, no el
  // promedio) y G42 (las pérdidas a 75°, no las de F43). El taller lo revisó y pidió dejarlo así: no corregir.
  const E38 =
    F38 !== undefined && G42 !== undefined && C36 !== undefined && J38 !== undefined && c.H2 && c.E7
      ? Math.sqrt((F38 ** 2 - 1) * (G42 / (c.H2 * 10)) ** 2 + ((C36 * J38 * 100) / c.E7) ** 2)
      : undefined;

  return {
    C8,
    D8,
    E8,
    F8,
    G8,
    J8,
    C12,
    D12,
    F12,
    G12,
    C13: errorRelacion(c.C16, C12),
    D13: errorRelacion(c.D16, D12),
    E13: errorRelacion(c.E16, E12),
    F13: errorRelacion(c.F16, F12),
    G13: errorRelacion(c.G16, G12),
    C14: errorRelacion(c.C17, C12),
    D14: errorRelacion(c.D17, D12),
    E14: errorRelacion(c.E17, E12),
    F14: errorRelacion(c.F17, F12),
    G14: errorRelacion(c.G17, G12),
    C15: errorRelacion(c.C18, C12),
    D15: errorRelacion(c.D18, D12),
    E15: errorRelacion(c.E18, E12),
    F15: errorRelacion(c.F18, F12),
    G15: errorRelacion(c.G18, G12),
    C26,
    D26,
    E26,
    H26,
    I26,
    J26,
    C27,
    H27,
    H28,
    C31,
    D31,
    E31,
    F31,
    C36,
    D36,
    E36,
    H36,
    I36,
    J36,
    C37,
    H37,
    E37,
    C38,
    E38,
    F38,
    H38,
    J38,
    C42,
    D42,
    E42,
    F42,
    G42,
    C43,
    F43,
    F45,
  };
}

export type Calculo = ReturnType<typeof calcularProtocolo>;
export type CeldaCalculada = keyof Calculo;

/** Tiene lo que importa de los dos ensayos: dan las pérdidas totales y la Ucc a 75°. */
export function protocoloCompleto(celdas: Celdas): boolean {
  const { F45, E38 } = calcularProtocolo(celdas);
  return F45 !== undefined && E38 !== undefined;
}

/** Con los decimales justos, como el formato 0,00 del Excel. */
const fijo = (valor: number, decimales: number) =>
  valor.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales, useGrouping: false });

const UN_DECIMAL: ReadonlySet<CeldaCalculada> = new Set<CeldaCalculada>(["C26", "D26", "E26", "C27", "C31", "D31", "E31", "C36", "D36", "E36", "C37", "C42", "D42", "E42"]);

/** Una celda calculada con el formato que tiene en el Excel; vacía si todavía no tiene datos. */
export function mostrarCalculo(calculo: Calculo, celda: CeldaCalculada): string {
  const valor = calculo[celda];
  if (valor === undefined) return "";
  if (/^[C-G]1[345]$/.test(celda)) return `${fijo(valor * 100, 2)}%`;
  if (celda === "F31") return formatearNumero(valor, 2);
  if (celda === "H27") return fijo(valor, 3);
  return fijo(valor, UN_DECIMAL.has(celda) ? 1 : 2);
}

const FORMATO_CARGA: Partial<Record<Celda, number>> = {
  C7: 0, D7: 0, E7: 0, F7: 0, G7: 0,
  E12: 2,
  C16: 2, D16: 2, E16: 2, F16: 2, G16: 2,
  C17: 2, D17: 2, E17: 2, F17: 2, G17: 2,
  C18: 2, D18: 2, E18: 2, F18: 2, G18: 2,
  H21: 2, I21: 2, J21: 2,
  C25: 1, D25: 1, E25: 1,
  C30: 1, D30: 1, E30: 1,
  C35: 1, D35: 1, E35: 1,
  C41: 1, D41: 1, E41: 1,
  D56: 2, D57: 2, D58: 2,
};

/** Una celda cargada, para el PDF, con el formato que tiene en el Excel. */
export function mostrarCarga(celdas: Celdas, celda: Celda): string {
  const valor = celdas[celda];
  if (valor === undefined) return "";
  if (typeof valor === "string") {
    const fecha = celda === "F4" ? fechaDeCampo(valor) : null;
    return fecha ? formatearFecha(fecha) : valor;
  }
  const decimales = FORMATO_CARGA[celda];
  return decimales === undefined ? formatearNumero(valor, 6) : fijo(valor, decimales);
}
