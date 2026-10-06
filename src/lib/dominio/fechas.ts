const partes = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

function componentes(fecha: Date) {
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.formatToParts(fecha).find((p) => p.type === tipo)?.value.padStart(2, "0") ?? "";
  return { dia: valor("day"), mes: valor("month"), anio: valor("year") };
}

/** 12/09/2026, siempre con dos dígitos en día y mes. */
export function formatearFecha(fecha: Date): string {
  const { dia, mes, anio } = componentes(fecha);
  return `${dia}/${mes}/${anio}`;
}

/** "2026-10-05": el valor de un campo de fecha, en la hora de Argentina. */
export function fechaParaCampo(fecha: Date): string {
  const { dia, mes, anio } = componentes(fecha);
  return `${anio}-${mes}-${dia}`;
}

/** El día de un campo de fecha, al mediodía de Argentina para que ningún huso lo corra de día. */
export function fechaDeCampo(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const fecha = new Date(`${valor}T12:00:00-03:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}
