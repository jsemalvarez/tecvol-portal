import { activos, type CambioT, type EquipoTaller, type Taller, type Transformador } from "./tipos";
import type { Placa, Uso } from "./placa";

/**
 * Un número escrito a mano, para comparar: "ot 1234", "OT-1234" y "OT1234" son el mismo. Sin
 * mayúsculas, espacios ni signos.
 */
export const normalizarNumero = (numero: string) => numero.toUpperCase().replace(/[^0-9A-Z]/g, "");

const ingresoDe = (equipo: EquipoTaller) => equipo.etapas.ingresado?.getTime() ?? 0;
const entregada = (equipo: EquipoTaller) => Number(equipo.estado === "entregado");
/** Si ingresaron el mismo día, la que sigue en el taller es la más nueva: la otra ya se entregó. */
const masNuevaPrimero = (a: EquipoTaller, b: EquipoTaller) => ingresoDe(b) - ingresoDe(a) || entregada(a) - entregada(b);

/** Identificador de un transformador nuevo. Lo llevan todas sus órdenes (campo `trafo`). */
export const nuevoIdTrafo = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);

/**
 * Las órdenes de trabajo de un transformador, de la más nueva a la más vieja, sin `excepto` (la que se
 * está mirando). Las dadas de baja, solo con `conBajas`.
 */
export function ordenesDelTrafo(
  equipos: EquipoTaller[],
  trafo: string,
  { excepto, conBajas = false }: { excepto?: string; conBajas?: boolean } = {},
): EquipoTaller[] {
  return (conBajas ? equipos : activos(equipos)).filter((e) => e.trafo === trafo && e.codigo !== excepto).sort(masNuevaPrimero);
}

/** "T-0457 · PRUEBA-3150-21": cómo se nombra un transformador en las listas. */
export function nombreTrafo(trafo: Pick<Transformador, "numero" | "numeroT">) {
  return trafo.numeroT ? `${trafo.numeroT} · ${trafo.numero}` : trafo.numero;
}

const mismoNumero = (a: string | undefined, b: string | undefined) => !!a && !!b && normalizarNumero(a) === normalizarNumero(b);

/**
 * Los N.º T de antes de un transformador al cambiarle el N.º T por `nuevo`: si tenía uno y es otro, se suma
 * con la fecha del cambio. Si no cambia, quedan como estaban. Lo usan los repositorios al guardarlo.
 */
export function conCambioDeT(trafo: Pick<Transformador, "numeroT" | "cambiosT">, nuevo: string | undefined, fecha = new Date()): CambioT[] | undefined {
  if (!trafo.numeroT || mismoNumero(trafo.numeroT, nuevo)) return trafo.cambiosT;
  return [...(trafo.cambiosT ?? []), { numeroT: trafo.numeroT, hasta: fecha }];
}

/**
 * Los N.º T que tuvo el transformador y hoy ya no tiene, del más reciente al más viejo, sin repetir: los que
 * el cliente le cambió o le pasó a otro. Salen de los cambios anotados y de las O.T. con las que ingresó.
 */
export function numerosTAnteriores(equipos: EquipoTaller[], trafo: Pick<Transformador, "id" | "numeroT" | "cambiosT">): string[] {
  const usados = [
    ...(trafo.cambiosT ?? []).map((c) => ({ numero: c.numeroT, cuando: c.hasta.getTime() })),
    ...ordenesDelTrafo(equipos, trafo.id).map((o) => ({ numero: o.numeroTIngreso, cuando: ingresoDe(o) })),
  ].sort((a, b) => b.cuando - a.cuando);
  const vistos = new Set<string>();
  const anteriores: string[] = [];
  for (const { numero } of usados) {
    if (!numero || mismoNumero(numero, trafo.numeroT) || vistos.has(normalizarNumero(numero))) continue;
    vistos.add(normalizarNumero(numero));
    anteriores.push(numero);
  }
  return anteriores;
}

/**
 * Los transformadores de un cliente cuyo N.º de trafo o N.º T contiene lo escrito, también por un N.º T que
 * tuvieron antes (ver `numerosTAnteriores`). Primero los activos y, entre ellos, los que coinciden justo y
 * después los que lo tienen hoy; los dados de baja también aparecen, para ver el historial de un N.º T.
 */
export function buscarTransformadores(taller: Pick<Taller, "transformadores" | "equipos">, empresa: string, texto: string): Transformador[] {
  const buscado = normalizarNumero(texto);
  if (buscado.length < 2) return [];
  const contiene = (numero: string | undefined) => !!numero && normalizarNumero(numero).includes(buscado);
  const exacto = (t: Transformador) => normalizarNumero(t.numero) === buscado || (!!t.numeroT && normalizarNumero(t.numeroT) === buscado);
  const hoy = (t: Transformador) => contiene(t.numero) || contiene(t.numeroT);
  return taller.transformadores
    .filter((t) => t.empresa === empresa)
    .filter((t) => hoy(t) || numerosTAnteriores(taller.equipos, t).some(contiene))
    .sort(
      (a, b) =>
        Number(!!a.baja) - Number(!!b.baja) ||
        Number(exacto(b)) - Number(exacto(a)) ||
        Number(hoy(b)) - Number(hoy(a)) ||
        a.numero.localeCompare(b.numero, "es"),
    );
}

/** El transformador activo del cliente que ya tiene ese N.º T, salvo `excepto`. Entre los activos no se repite. */
export function conNumeroT(trafos: Transformador[], empresa: string, numeroT: string, excepto?: string): Transformador | undefined {
  const buscado = normalizarNumero(numeroT);
  if (!buscado) return undefined;
  return activos(trafos).find((t) => t.id !== excepto && t.empresa === empresa && !!t.numeroT && normalizarNumero(t.numeroT) === buscado);
}

/**
 * Otro transformador del cliente con el mismo N.º de trafo, también entre los dados de baja: antes de dar
 * de alta uno, para no cargar dos veces el mismo. Los temporales no cuentan.
 */
export function conMismoNumero(trafos: Transformador[], empresa: string, numero: string, excepto?: string): Transformador | undefined {
  return trafos.find((t) => t.id !== excepto && t.empresa === empresa && !t.provisorio && mismoNumero(t.numero, numero));
}

/** Un transformador que tuvo un N.º T: si lo tiene hoy, hasta cuándo lo tuvo y las O.T. con las que ingresó con él. */
export interface PasoNumeroT {
  trafo: Transformador;
  /** Lo tiene hoy (un dado de baja puede tenerlo todavía: se dio de baja con él). */
  loTiene: boolean;
  /** Si ya no lo tiene, la última vez que se lo cambiaron, si quedó anotada. */
  hasta?: Date;
  /** Sus O.T. que ingresaron con ese N.º T, de la más nueva a la más vieja. */
  ordenes: EquipoTaller[];
}

/**
 * La trazabilidad de un N.º T en un cliente: los transformadores que lo tienen hoy y los que lo tuvieron
 * antes (porque se lo cambiaron o lo pasaron a otro), con las O.T. con las que ingresaron con él. Primero
 * el activo que lo tiene y después los demás, del que lo tuvo más recientemente al más viejo.
 */
export function historialNumeroT(taller: Pick<Taller, "transformadores" | "equipos">, empresa: string, numeroT: string): PasoNumeroT[] {
  if (!normalizarNumero(numeroT)) return [];
  const pasos: PasoNumeroT[] = taller.transformadores
    .filter((t) => t.empresa === empresa)
    .map((trafo) => {
      const loTiene = mismoNumero(trafo.numeroT, numeroT);
      const cambios = (trafo.cambiosT ?? []).filter((c) => mismoNumero(c.numeroT, numeroT)).map((c) => c.hasta.getTime());
      return {
        trafo,
        loTiene,
        hasta: !loTiene && cambios.length ? new Date(Math.max(...cambios)) : undefined,
        ordenes: ordenesDelTrafo(taller.equipos, trafo.id).filter((o) => mismoNumero(o.numeroTIngreso, numeroT)),
      };
    })
    .filter((p) => p.loTiene || p.hasta || p.ordenes.length);
  const reciente = (p: PasoNumeroT) => Math.max(p.hasta?.getTime() ?? 0, p.ordenes[0] ? ingresoDe(p.ordenes[0]) : 0, p.trafo.baja?.getTime() ?? 0);
  const actual = (p: PasoNumeroT) => p.loTiene && !p.trafo.baja;
  return pasos.sort((a, b) => Number(actual(b)) - Number(actual(a)) || reciente(b) - reciente(a));
}

/** El número temporal que sigue entre `usados`: `NT-0001`, `NT-0002`… */
function siguienteTemporal(prefijo: string, usados: (string | undefined)[]): string {
  const patron = new RegExp(`^${prefijo}-(\\d+)$`);
  const numeros = usados.map((n) => (n ? patron.exec(n)?.[1] : undefined)).filter(Boolean).map(Number);
  return `${prefijo}-${String(Math.max(0, ...numeros) + 1).padStart(4, "0")}`;
}

/** El N.º de trafo temporal que sigue (`NT-0001`, `NT-0002`…), para uno cuya chapa no se lee o no lo tiene. */
export const siguienteProvisorio = (trafos: Pick<Transformador, "numero">[]) => siguienteTemporal("NT", trafos.map((t) => t.numero));

/**
 * El N.º de O.T. temporal que sigue (`TEMP-0001`, `TEMP-0002`…), para una orden que todavía no tiene el del
 * sistema de gestión. Cuentan también las dadas de baja, para no repetirlo.
 */
export const siguienteOrdenTemporal = (equipos: Pick<EquipoTaller, "numeroOrden">[]) => siguienteTemporal("TEMP", equipos.map((e) => e.numeroOrden));

/** Una orden como se guardaba antes de que existieran los transformadores, con su chapa y sus números. */
export interface OrdenAntigua {
  codigo: string;
  /** Las que ya se habían agrupado tienen el identificador del transformador. */
  trafo?: string;
  empresa: string;
  /** N.º de fabricación: pasa a ser el N.º de trafo. */
  serie?: string;
  /** El N.º de trafo de antes, el que ponía el cliente: pasa a ser el N.º T. */
  numeroTrafo?: string;
  equipo: string;
  uso?: Uso;
  placa?: Placa;
  ingreso?: Date;
}

/**
 * Arma los transformadores de las órdenes que todavía no tienen uno guardado (`existentes`). Las órdenes
 * van juntas si ya compartían transformador, o si son del mismo cliente con el mismo N.º de fabricación
 * o, sin él, el mismo N.º de trafo de antes. Los datos salen de la orden más nueva de cada grupo; sin
 * N.º de fabricación, el transformador recibe uno provisorio. Devuelve los transformadores nuevos y el
 * de cada orden, por código.
 */
export function migrarTransformadores(
  ordenes: OrdenAntigua[],
  existentes: Transformador[],
  nuevoId: () => string = nuevoIdTrafo,
): { transformadores: Transformador[]; asignados: Map<string, string> } {
  const guardados = new Set(existentes.map((t) => t.id));
  const grupos = new Map<string, OrdenAntigua[]>();
  const claveDe = (o: OrdenAntigua) => {
    if (o.trafo) return `trafo:${o.trafo}`;
    if (o.serie && normalizarNumero(o.serie)) return `serie:${o.empresa}:${normalizarNumero(o.serie)}`;
    if (o.numeroTrafo && normalizarNumero(o.numeroTrafo)) return `t:${o.empresa}:${normalizarNumero(o.numeroTrafo)}`;
    return `orden:${o.codigo}`;
  };
  for (const o of ordenes) {
    if (o.trafo && guardados.has(o.trafo)) continue;
    const clave = claveDe(o);
    grupos.set(clave, [...(grupos.get(clave) ?? []), o]);
  }

  const transformadores: Transformador[] = [];
  const asignados = new Map<string, string>();
  const numerados = [...existentes];
  for (const grupo of grupos.values()) {
    const ultima = [...grupo].sort((a, b) => (b.ingreso?.getTime() ?? 0) - (a.ingreso?.getTime() ?? 0))[0];
    const serie = grupo.map((o) => o.serie).find(Boolean);
    const numero = serie ?? siguienteProvisorio(numerados);
    const trafo: Transformador = {
      id: grupo.find((o) => o.trafo)?.trafo ?? nuevoId(),
      empresa: ultima.empresa,
      numero,
      ...(serie ? {} : { provisorio: true }),
      ...(grupo.map((o) => o.numeroTrafo).find(Boolean) ? { numeroT: grupo.map((o) => o.numeroTrafo).find(Boolean) } : {}),
      equipo: ultima.equipo,
      ...(ultima.uso ? { uso: ultima.uso } : {}),
      ...(ultima.placa ? { placa: ultima.placa } : {}),
    };
    transformadores.push(trafo);
    numerados.push(trafo);
    for (const o of grupo) asignados.set(o.codigo, trafo.id);
  }
  return { transformadores, asignados };
}

/**
 * "OT 4512" o "OT TEMP-0001" (si es temporal, al lado va la etiqueta). Las cargadas antes de que fuera
 * obligatorio pueden no tenerlo: "Sin N.º de O.T.".
 */
export const nombreOrden = (orden: { numeroOrden?: string }) => (orden.numeroOrden ? `OT ${orden.numeroOrden}` : "Sin N.º de O.T.");

/** El transformador de una orden, como en las listas: "T-0457 · PRUEBA-3150-21". */
export const trafoDeOrden = (orden: Pick<EquipoTaller, "serie" | "numeroT">) => nombreTrafo({ numero: orden.serie ?? "Sin N.º de trafo", numeroT: orden.numeroT });

/** El N.º de O.T. que va en la etiqueta impresa: uno temporal no, porque después cambia. */
export const ordenParaEtiqueta = (orden: Pick<EquipoTaller, "numeroOrden" | "numeroOrdenTemporal">) =>
  orden.numeroOrdenTemporal ? undefined : orden.numeroOrden;
