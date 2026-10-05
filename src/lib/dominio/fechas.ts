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
