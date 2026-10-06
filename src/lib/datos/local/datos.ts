import type { EstadoReparacion } from "@/lib/dominio/estados";
import type { CuentaCliente, Empresa, EquipoTaller, SeguimientoPublico } from "@/lib/dominio/tipos";

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
];

const EMPRESAS: Empresa[] = [
  { id: "coop-prueba", nombre: "Cooperativa Eléctrica de Prueba" },
  { id: "industria-prueba", nombre: "Industrias de Prueba S. A." },
];

/** Datos privados de cada orden: la empresa dueña, la referencia del cliente y la serie de la placa. */
const ORDENES: Record<string, { empresa: string; referencia?: string; serie?: string }> = {
  K7RM4XPA: { empresa: "coop-prueba", referencia: "Subestación Barrio Norte", serie: "PRUEBA-3150-21" },
  B3NQ8HTW: { empresa: "coop-prueba", referencia: "Planta de bombeo 2", serie: "PRUEBA-5000-17" },
  Z9FD2KCY: { empresa: "coop-prueba", referencia: "Línea rural, km 12" },
  H4GE6VRA: { empresa: "coop-prueba", referencia: "Plaza central", serie: "PRUEBA-1600-09" },
  M5TC7WQE: { empresa: "coop-prueba", referencia: "Escuela técnica" },
  R8VJ3NDS: { empresa: "coop-prueba", referencia: "Barrio Las Rosas", serie: "PRUEBA-1000-12" },
  P6XH9EBK: { empresa: "coop-prueba", referencia: "Parque industrial, lote 4", serie: "PRUEBA-2500-19" },
  W2SG5MZU: { empresa: "coop-prueba", referencia: "Línea rural, km 31" },
  T3KA8PRW: { empresa: "industria-prueba", referencia: "Nave de prensas", serie: "PRUEBA-6300-22" },
  Y6BD2HMS: { empresa: "industria-prueba", referencia: "Compresores" },
  N9QE4VXC: { empresa: "industria-prueba", referencia: "Oficinas", serie: "PRUEBA-3150-08" },
};

const CUENTAS: CuentaCliente[] = [{ uid: "local-cliente", email: "cliente@prueba.tecvol.test", empresa: "coop-prueba" }];

/**
 * Contraseña de las cuentas que se crean en el panel con datos de prueba: no hay email para elegir una,
 * así que todas entran con esta. La muestran el panel y el recuadro de prueba de /ingresar.
 */
export const CLAVE_CUENTAS_NUEVAS = "cuenta-prueba";

/** Los cuatro primeros códigos, para probar la consulta pública desde el pie del inicio. */
export const CODIGOS_DE_PRUEBA = SEGUIMIENTOS.slice(0, 4).map((s) => s.codigo);

export interface DatosLocales {
  empresas: Empresa[];
  equipos: EquipoTaller[];
  cuentas: CuentaCliente[];
}

function semilla(): DatosLocales {
  return {
    empresas: EMPRESAS.map((e) => ({ ...e })),
    equipos: SEGUIMIENTOS.map((s) => ({ ...s, etapas: { ...s.etapas }, ...ORDENES[s.codigo] })),
    cuentas: CUENTAS.map((c) => ({ ...c })),
  };
}

const CLAVE_ALMACEN = "tecvol-datos-local-v1";
const ES_FECHA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Los datos de este navegador; la primera vez, o sin almacenamiento, los de prueba. */
export function leerDatos(): DatosLocales {
  if (typeof window === "undefined") return semilla();
  try {
    const valor = window.localStorage.getItem(CLAVE_ALMACEN);
    if (valor) return JSON.parse(valor, (_, v) => (typeof v === "string" && ES_FECHA.test(v) ? new Date(v) : v)) as DatosLocales;
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
