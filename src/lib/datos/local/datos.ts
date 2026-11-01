import type { LimitesAvisos } from "@/lib/dominio/avisos";
import type { DatosTallerGuardados } from "@/lib/dominio/datos-taller";
import type { EstadoReparacion } from "@/lib/dominio/estados";
import type { InformeGuardado } from "@/lib/dominio/informe";
import type { Placa } from "@/lib/dominio/placa";
import type { Uso } from "@/lib/dominio/placa";
import { conTransformador, type CuentaCliente, type CuentaPersonal, type Empresa, type EquipoTaller, type SeguimientoPublico, type Transformador } from "@/lib/dominio/tipos";
import { migrarTransformadores, type OrdenAntigua } from "@/lib/dominio/trafo";

/**
 * Datos de prueba para desarrollar sin Firebase. En producción, solo en una demo (ver `modoDatos`).
 * Las empresas, las cuentas y los equipos son ficticios. Lo que cambia el panel se guarda en este
 * navegador, así la consulta por código y el portal muestran los mismos cambios.
 */
function fechas(valores: Partial<Record<EstadoReparacion, string>>) {
  return Object.fromEntries(
    Object.entries(valores).map(([estado, iso]) => [estado, new Date(`${iso}T12:00:00-03:00`)]),
  ) as Partial<Record<EstadoReparacion, Date>>;
}

const SEGUIMIENTOS: SeguimientoPublico[] = [
  {
    codigo: "K7RM4XPA",
    estado: "reparacion",
    equipo: "Transformador trifásico 315 kVA · 13,2/0,4 kV",
    etapas: fechas({
      ingresado: "2026-09-01",
      diagnostico: "2026-09-02",
      presupuesto: "2026-09-04",
      reparacion: "2026-09-08",
    }),
    actualizado: new Date("2026-09-15T12:00:00-03:00"),
  },
  {
    codigo: "B3NQ8HTW",
    estado: "presupuesto",
    equipo: "Transformador trifásico 500 kVA · 13,2/0,4 kV",
    etapas: fechas({ ingresado: "2026-09-22", diagnostico: "2026-09-23", presupuesto: "2026-09-29" }),
    actualizado: new Date("2026-09-29T12:00:00-03:00"),
  },
  {
    codigo: "Z9FD2KCY",
    estado: "listo",
    equipo: "Transformador monofásico 25 kVA · 7,62/0,231 kV",
    etapas: fechas({
      ingresado: "2026-08-18",
      diagnostico: "2026-08-19",
      presupuesto: "2026-08-21",
      reparacion: "2026-08-25",
      ensayos: "2026-09-10",
      listo: "2026-09-12",
    }),
    actualizado: new Date("2026-09-12T12:00:00-03:00"),
  },
  {
    codigo: "H4GE6VRA",
    estado: "entregado",
    equipo: "Transformador trifásico 160 kVA · 13,2/0,4 kV",
    etapas: fechas({
      ingresado: "2026-07-06",
      diagnostico: "2026-07-07",
      presupuesto: "2026-07-09",
      reparacion: "2026-07-14",
      ensayos: "2026-07-28",
      listo: "2026-07-30",
      entregado: "2026-08-03",
    }),
    actualizado: new Date("2026-08-03T12:00:00-03:00"),
  },
  {
    codigo: "M5TC7WQE",
    estado: "ingresado",
    equipo: "Transformador trifásico 200 kVA · 13,2/0,4 kV",
    etapas: fechas({ ingresado: "2026-10-02" }),
    actualizado: new Date("2026-10-02T12:00:00-03:00"),
  },
  {
    codigo: "R8VJ3NDS",
    estado: "diagnostico",
    equipo: "Transformador trifásico 100 kVA · 13,2/0,4 kV",
    etapas: fechas({ ingresado: "2026-09-29", diagnostico: "2026-09-30" }),
    actualizado: new Date("2026-09-30T12:00:00-03:00"),
  },
  {
    codigo: "P6XH9EBK",
    estado: "ensayos",
    equipo: "Transformador trifásico 250 kVA · 13,2/0,4 kV",
    etapas: fechas({
      ingresado: "2026-08-25",
      diagnostico: "2026-08-26",
      presupuesto: "2026-08-28",
      reparacion: "2026-09-02",
      ensayos: "2026-09-28",
    }),
    actualizado: new Date("2026-09-28T12:00:00-03:00"),
  },
  {
    codigo: "W2SG5MZU",
    estado: "entregado",
    equipo: "Transformador monofásico 10 kVA · 7,62/0,231 kV",
    etapas: fechas({
      ingresado: "2026-04-13",
      diagnostico: "2026-04-14",
      presupuesto: "2026-04-16",
      reparacion: "2026-04-21",
      ensayos: "2026-05-04",
      listo: "2026-05-05",
      entregado: "2026-05-08",
    }),
    actualizado: new Date("2026-05-08T12:00:00-03:00"),
  },
  {
    codigo: "T3KA8PRW",
    estado: "diagnostico",
    equipo: "Transformador trifásico 630 kVA · 13,2/0,4 kV",
    etapas: fechas({ ingresado: "2026-10-01", diagnostico: "2026-10-03" }),
    actualizado: new Date("2026-10-03T12:00:00-03:00"),
  },
  {
    codigo: "Y6BD2HMS",
    estado: "reparacion",
    equipo: "Transformador trifásico 400 kVA · 13,2/0,4 kV",
    etapas: fechas({ ingresado: "2026-09-10", diagnostico: "2026-09-11", presupuesto: "2026-09-15", reparacion: "2026-09-19" }),
    actualizado: new Date("2026-09-19T12:00:00-03:00"),
  },
  {
    codigo: "N9QE4VXC",
    estado: "entregado",
    equipo: "Transformador trifásico 315 kVA · 13,2/0,4 kV",
    etapas: fechas({
      ingresado: "2026-06-02",
      diagnostico: "2026-06-03",
      presupuesto: "2026-06-05",
      reparacion: "2026-06-10",
      ensayos: "2026-06-24",
      listo: "2026-06-26",
      entregado: "2026-06-30",
    }),
    actualizado: new Date("2026-06-30T12:00:00-03:00"),
  },
  // Reparación anterior del mismo trafo que K7RM4XPA: muestra un reingreso y su historial.
  {
    codigo: "C8WP3JZT",
    estado: "entregado",
    equipo: "Transformador trifásico 315 kVA · 13,2/0,4 kV",
    etapas: fechas({
      ingresado: "2025-11-03",
      diagnostico: "2025-11-04",
      presupuesto: "2025-11-07",
      reparacion: "2025-11-12",
      ensayos: "2025-11-28",
      listo: "2025-12-01",
      entregado: "2025-12-05",
    }),
    actualizado: new Date("2025-12-05T12:00:00-03:00"),
  },
  // El transformador que tuvo antes el N.º T-0457 y se destruyó: muestra cómo el número pasa a otro.
  {
    codigo: "D2XL6RTN",
    estado: "entregado",
    equipo: "Transformador trifásico 200 kVA · 13,2/0,4 kV",
    etapas: fechas({
      ingresado: "2023-05-15",
      diagnostico: "2023-05-16",
      presupuesto: "2023-05-18",
      reparacion: "2023-05-24",
      ensayos: "2023-06-07",
      listo: "2023-06-08",
      entregado: "2023-06-12",
    }),
    actualizado: new Date("2023-06-12T12:00:00-03:00"),
  },
];

const EMPRESAS: Empresa[] = [
  { id: "coop-prueba", nombre: "Cooperativa Eléctrica de Prueba" },
  { id: "industria-prueba", nombre: "Industrias de Prueba S. A." },
];

/**
 * Datos privados de cada orden como se cargaban antes de que existieran los transformadores: la empresa,
 * la referencia, el N.º de fabricación (`serie`, ahora el N.º de trafo), el N.º de trafo del cliente
 * (`numeroTrafo`, ahora el N.º T) y, en algunos, la chapa. Se arman sus transformadores igual que en
 * Firestore (ver `migrarTransformadores`); los que no tienen N.º de fabricación reciben uno provisorio.
 */
const PLACA_BARRIO_NORTE: Placa = {
  fabricante: "Fábrica de Prueba S. A.",
  tipo: "TP-315",
  anio: 2014,
  norma: "IRAM 2250",
  fases: "trifasico",
  potencia: 315,
  frecuencia: 50,
  servicio: "Continuo",
  enfriamiento: "ONAN",
  tensionCortocircuito: 4,
  grupoConexion: "Dyn11",
  tensionPrimaria: 13200,
  tensionSecundaria: 400,
  conmutador: [13860, 13530, 13200, 12870, 12540],
  aceite: 310,
  masa: 1240,
  materialBobinados: "Cobre",
};

type OrdenDePrueba = Omit<OrdenAntigua, "codigo" | "equipo" | "ingreso"> & { referencia?: string; numeroOrden?: string; uso?: Uso };

const ORDENES: Record<string, OrdenDePrueba> = {
  K7RM4XPA: {
    empresa: "coop-prueba",
    referencia: "Subestación Barrio Norte",
    serie: "PRUEBA-3150-21",
    numeroOrden: "4512",
    numeroTrafo: "T-0457",
    uso: "distribucion",
    placa: PLACA_BARRIO_NORTE,
  },
  C8WP3JZT: {
    empresa: "coop-prueba",
    referencia: "Subestación Barrio Norte",
    serie: "PRUEBA-3150-21",
    numeroOrden: "4380",
    numeroTrafo: "T-0457",
    uso: "distribucion",
    placa: PLACA_BARRIO_NORTE,
  },
  B3NQ8HTW: { empresa: "coop-prueba", referencia: "Planta de bombeo 2", serie: "PRUEBA-5000-17", numeroOrden: "4470" },
  Z9FD2KCY: { empresa: "coop-prueba", referencia: "Línea rural, km 12" },
  H4GE6VRA: { empresa: "coop-prueba", referencia: "Plaza central", serie: "PRUEBA-1600-09" },
  M5TC7WQE: { empresa: "coop-prueba", referencia: "Escuela técnica" },
  R8VJ3NDS: { empresa: "coop-prueba", referencia: "Barrio Las Rosas", serie: "PRUEBA-1000-12", numeroTrafo: "T-0612" },
  P6XH9EBK: { empresa: "coop-prueba", referencia: "Parque industrial, lote 4", serie: "PRUEBA-2500-19" },
  W2SG5MZU: { empresa: "coop-prueba", referencia: "Línea rural, km 31" },
  T3KA8PRW: {
    empresa: "industria-prueba",
    referencia: "Nave de prensas",
    serie: "PRUEBA-6300-22",
    numeroOrden: "4498",
    placa: { fabricante: "Fábrica de Prueba S. A.", fases: "trifasico", potencia: 630, tensionPrimaria: 13200, tensionSecundaria: 400 },
  },
  Y6BD2HMS: { empresa: "industria-prueba", referencia: "Compresores" },
  N9QE4VXC: { empresa: "industria-prueba", referencia: "Oficinas", serie: "PRUEBA-3150-08" },
  D2XL6RTN: { empresa: "coop-prueba", referencia: "Subestación Barrio Norte", serie: "PRUEBA-2000-05", numeroTrafo: "T-0457" },
};

/** Los transformadores de prueba dados de baja, por N.º de trafo. */
const BAJAS: Record<string, Date> = { "PRUEBA-2000-05": new Date("2024-03-10T12:00:00-03:00") };

/** Datos del taller de la reparación anterior de Barrio Norte: un reingreso puede copiarlos. */
const DATOS_TALLER_BARRIO_NORTE: DatosTallerGuardados = {
  alta: { material: "cobre", medida: "1,25 mm", espiras: 1650, peso: 62 },
  baja: { material: "cobre", medida: "3 × 10 mm", espiras: 29, peso: 48 },
  prespanMedidas: "0,5 mm entre capas; 2 mm entre bobinas",
  prespanPeso: 6.5,
  derivaciones: 5,
  notas: "Se cambiaron los aisladores de BT.",
  actualizado: new Date("2025-11-20T12:00:00-03:00"),
  por: "jefe@prueba.tecvol.test",
};

export const CUENTAS: CuentaCliente[] = [{ uid: "local-cliente", email: "cliente@prueba.tecvol.test", empresa: "coop-prueba" }];

/** Una cuenta del personal por rol. El panel las lista y el administrador puede cambiarles el rol o darlas de baja. */
export const PERSONAL: CuentaPersonal[] = [
  { uid: "local-administrador", email: "administrador@prueba.tecvol.test", rol: "administrador" },
  { uid: "local-jefe-taller", email: "jefe@prueba.tecvol.test", rol: "jefe-taller" },
];

/**
 * Contraseña de las cuentas que se crean en el panel con datos de prueba: no hay email para elegir una,
 * así que todas entran con esta. La muestran el panel y el recuadro de prueba de /ingresar.
 */
export const CLAVE_CUENTAS_NUEVAS = "cuenta-prueba";

/** Los cuatro primeros códigos, para probar la consulta pública desde el pie del inicio. */
export const CODIGOS_DE_PRUEBA = SEGUIMIENTOS.slice(0, 4).map((s) => s.codigo);

export interface DatosLocales {
  empresas: Empresa[];
  /** Falta en los datos guardados antes de que existieran: `leerDatos` los arma con las órdenes. */
  transformadores: Transformador[];
  /** Las órdenes con lo de su transformador copiado (ver `conTransformador`). */
  equipos: EquipoTaller[];
  cuentas: CuentaCliente[];
  /** Cuentas del personal. Los datos guardados antes de que hubiera roles no la tienen: `leerDatos` la completa. */
  personal: CuentaPersonal[];
  /** Informes de diagnóstico por código. Falta en los datos guardados antes de que existieran. */
  informes?: Record<string, InformeGuardado>;
  /** Datos del taller por código. Falta en los datos guardados antes de que existieran. */
  datosTaller?: Record<string, DatosTallerGuardados>;
  /** Límites de los avisos. Sin ellos, los de por defecto. */
  avisos?: LimitesAvisos;
  /**
   * Desde la 2, cada orden guarda el N.º T con el que ingresó (`numeroTIngreso`). Las guardadas antes lo
   * reciben de su transformador, una sola vez: después ese número puede cambiar.
   */
  version?: number;
}

const VERSION = 2;

function semilla(): DatosLocales {
  const ordenes = SEGUIMIENTOS.map((seguimiento) => ({ seguimiento, orden: ORDENES[seguimiento.codigo] }));
  const { transformadores, asignados } = migrarTransformadores(
    ordenes.map(({ seguimiento, orden }) => ({ ...orden, codigo: seguimiento.codigo, equipo: seguimiento.equipo, ingreso: seguimiento.etapas.ingresado })),
    [],
    idsDePrueba(),
  );
  const trafos = transformadores.map((t) => (BAJAS[t.numero] ? { ...t, baja: BAJAS[t.numero] } : t));
  return {
    empresas: EMPRESAS.map((e) => ({ ...e })),
    transformadores: trafos,
    equipos: conTransformadores(
      ordenes.map(({ seguimiento, orden }) => ({
        ...seguimiento,
        etapas: { ...seguimiento.etapas },
        trafo: asignados.get(seguimiento.codigo)!,
        empresa: orden.empresa,
        referencia: orden.referencia,
        numeroOrden: orden.numeroOrden,
        numeroTIngreso: orden.numeroTrafo,
      })),
      trafos,
    ),
    cuentas: CUENTAS.map((c) => ({ ...c })),
    personal: PERSONAL.map((p) => ({ ...p })),
    datosTaller: { C8WP3JZT: { ...DATOS_TALLER_BARRIO_NORTE } },
    version: VERSION,
  };
}

/** Las órdenes con lo de su transformador, como las arma Firestore al leerlas. */
export function conTransformadores(equipos: EquipoTaller[], transformadores: Transformador[]): EquipoTaller[] {
  const porId = new Map(transformadores.map((t) => [t.id, t]));
  return equipos.map((e) => conTransformador(e, porId.get(e.trafo)));
}

/** Siempre los mismos, así un enlace a la ficha de un transformador de prueba sigue sirviendo. */
function idsDePrueba() {
  let n = 0;
  return () => `prueba-trafo-${++n}`;
}

const CLAVE_ALMACEN = "tecvol-datos-local-v1";
const ES_FECHA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Los datos de este navegador; la primera vez, o sin almacenamiento, los de prueba. */
export function leerDatos(): DatosLocales {
  if (typeof window === "undefined") return semilla();
  try {
    const valor = window.localStorage.getItem(CLAVE_ALMACEN);
    if (valor) {
      const datos = JSON.parse(valor, (_, v) => (typeof v === "string" && ES_FECHA.test(v) ? new Date(v) : v)) as Partial<DatosLocales> &
        Omit<DatosLocales, "personal" | "transformadores">;
      // Los guardados antes de que existieran los transformadores los reciben ahora, como en Firestore.
      const existentes = datos.transformadores ?? [];
      const { transformadores: nuevos, asignados } = migrarTransformadores(
        datos.equipos.map((e) => ({ ...(e as EquipoTaller & { numeroTrafo?: string }), trafo: e.trafo || undefined, ingreso: e.etapas.ingresado })),
        existentes,
      );
      const transformadores = [...existentes, ...nuevos];
      // Las de antes de la versión 2 ingresaron, hasta donde se sabe, con el N.º T que tiene hoy su
      // transformador: la orden guardó una copia (`numeroT`) la última vez que se guardaron los datos.
      const anteriores = (datos.version ?? 1) < VERSION;
      const equipos = conTransformadores(
        datos.equipos.map((e) => ({
          ...e,
          trafo: asignados.get(e.codigo) ?? e.trafo,
          ...(anteriores ? { numeroTIngreso: e.numeroTIngreso ?? e.numeroT } : {}),
        })),
        transformadores,
      );
      const leidos = { ...datos, transformadores, equipos, personal: datos.personal ?? PERSONAL.map((p) => ({ ...p })), version: VERSION };
      if (nuevos.length || anteriores) guardarDatos(leidos);
      return leidos;
    }
  } catch {
    // Datos dañados o sin almacenamiento: se vuelve a empezar con los de prueba.
  }
  return semilla();
}

export function guardarDatos(datos: DatosLocales) {
  try {
    window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(datos));
  } catch {
    // Sin almacenamiento (ventana privada, por ejemplo) los cambios duran lo que la página.
  }
}

export const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

/** Descarta los cambios de este navegador y vuelve a los datos de prueba. */
export function reiniciarDatos() {
  try {
    window.localStorage.removeItem(CLAVE_ALMACEN);
  } catch {
    // Sin almacenamiento no hay cambios guardados.
  }
}
