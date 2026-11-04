/**
 * El ambiente de pruebas (stage) se marca con `NEXT_PUBLIC_AMBIENTE=stage`; en producción no se define. Solo
 * cambia cómo se presenta el sitio, para no confundirlo con el real: de dónde salen los datos lo deciden las
 * variables de Firebase y de Supabase.
 */
export const enPruebas = process.env.NEXT_PUBLIC_AMBIENTE === "stage";
