import type { ArchivoOrden } from "./tipos";

/** Lo más grande que acepta el plan gratis de Supabase Storage. El bucket `ordenes` tiene el mismo límite. */
export const TAMANO_MAXIMO = 50 * 1024 * 1024;

/** "850 KB", "2,3 MB". */
export function formatearTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
}

export type MotivoArchivoRechazado = "vacio" | "muy-grande" | "no-es-pdf";

/**
 * Por qué no se puede subir un archivo, o `null` si es un PDF que entra. No alcanza con la extensión: un PDF
 * tiene "%PDF-" en su primer kilobyte.
 */
export async function revisarPdf(archivo: File): Promise<MotivoArchivoRechazado | null> {
  if (archivo.size === 0) return "vacio";
  if (archivo.size > TAMANO_MAXIMO) return "muy-grande";
  const inicio = new Uint8Array(await archivo.slice(0, 1024).arrayBuffer());
  return String.fromCharCode(...inicio).includes("%PDF-") ? null : "no-es-pdf";
}

/** Los PDF activos, del más nuevo al más viejo: los que ve el cliente. */
export function archivosActivos(archivos: ArchivoOrden[] = []): ArchivoOrden[] {
  return archivos.filter((a) => !a.baja).sort((a, b) => b.subido.getTime() - a.subido.getTime());
}

/**
 * Nombre del archivo dentro de su carpeta en Supabase: el original sin acentos ni símbolos, así quien lo
 * descarga desde el visor recibe un nombre que reconoce. "Protocolo de ensayo Nº 5.pdf" → "Protocolo-de-ensayo-N-5.pdf".
 */
export function nombreParaRuta(nombre: string): string {
  const base = nombre
    .replace(/\.pdf$/i, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9_.]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return `${base || "archivo"}.pdf`;
}
