import { Timestamp, type DocumentData } from "firebase/firestore";
import type { ArchivoOrden } from "@/lib/dominio/tipos";
import { ErrorDePanel, type MotivoErrorDePanel } from "../repositorios";
import { obtenerAuth } from "./app";

/**
 * Los PDF de las órdenes. El archivo va a Supabase Storage con el enlace firmado que da la ruta del servidor
 * (`/api/archivos/…`), que revisa la sesión; la orden guarda en `archivos` el id, el nombre, el tamaño, quién
 * lo subió, la ruta en el bucket y la baja.
 */

const texto = (valor: unknown) => (typeof valor === "string" && valor.trim() ? valor.trim() : undefined);
const fecha = (valor: unknown) => (valor instanceof Timestamp ? valor.toDate() : undefined);

/** Los PDF como están guardados en la orden. Uno sin id o sin fecha (no debería pasar) no se muestra. */
export function leerArchivos(valor: unknown): ArchivoOrden[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((a: DocumentData): ArchivoOrden[] => {
    const id = texto(a?.id);
    const subido = fecha(a?.subido);
    if (!id || !subido) return [];
    return [{ id, nombre: texto(a.nombre) ?? "Sin nombre.pdf", tamano: typeof a.tamano === "number" ? a.tamano : 0, subido, por: texto(a.por) ?? "", baja: fecha(a.baja) }];
  });
}

const MOTIVOS_RUTA: readonly MotivoErrorDePanel[] = ["permiso", "conexion", "sin-almacen", "archivo-perdido", "desconocido"];

/** Pide algo a una ruta de archivos con la sesión de Firebase. Si responde con error, lanza `ErrorDePanel`. */
async function pedir<T>(ruta: string, cuerpo: object): Promise<T> {
  const usuario = obtenerAuth().currentUser;
  if (!usuario) throw new ErrorDePanel("permiso");
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await usuario.getIdToken()}` },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorDePanel("conexion");
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new ErrorDePanel(MOTIVOS_RUTA.includes(datos.error) ? datos.error : "desconocido");
  return datos as T;
}

/** Dónde subir un PDF a la orden: el id nuevo, la ruta en el bucket y el enlace firmado. Solo el personal. */
export function pedirSubida(codigo: string, nombre: string) {
  return pedir<{ id: string; ruta: string; url: string }>("/api/archivos/subida", { codigo, nombre });
}

/** Sube el PDF al enlace firmado. Con `XMLHttpRequest` y no `fetch`, que no avisa cuánto lleva subido. */
export function enviarArchivo(url: string, archivo: File, alAvanzar: (fraccion: number) => void): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const pedido = new XMLHttpRequest();
    pedido.open("PUT", url);
    pedido.setRequestHeader("Content-Type", "application/pdf");
    pedido.upload.onprogress = (evento) => {
      if (evento.lengthComputable) alAvanzar(evento.loaded / evento.total);
    };
    pedido.onload = () => (pedido.status >= 200 && pedido.status < 300 ? resolver() : rechazar(new ErrorDePanel("desconocido")));
    pedido.onerror = () => rechazar(new ErrorDePanel("conexion"));
    pedido.send(archivo);
  });
}

/** Enlace temporal para abrir un PDF de la orden: el personal, o el cliente de la empresa. */
export async function enlaceArchivo(codigo: string, id: string): Promise<string> {
  return (await pedir<{ url: string }>("/api/archivos/enlace", { codigo, id })).url;
}
