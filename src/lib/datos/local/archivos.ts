import { ErrorDePanel } from "../repositorios";

/**
 * Los PDF de prueba. El archivo va a IndexedDB de este navegador, porque en `localStorage` no entra; sus datos
 * van con la orden, como en Firestore. Sin IndexedDB (alguna ventana privada) duran lo que la página.
 */

const BASE = "tecvol-archivos-local";
const ALMACEN = "archivos";
const enMemoria = new Map<string, Blob>();

function abrirBase(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(ALMACEN);
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error);
  });
}

async function usarAlmacen<T>(modo: IDBTransactionMode, accion: (almacen: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const base = await abrirBase();
  try {
    return await new Promise<T>((resolver, rechazar) => {
      const transaccion = base.transaction(ALMACEN, modo);
      const pedido = accion(transaccion.objectStore(ALMACEN));
      transaccion.oncomplete = () => resolver(pedido.result);
      transaccion.onerror = () => rechazar(transaccion.error);
    });
  } finally {
    base.close();
  }
}

export async function guardarArchivo(id: string, archivo: Blob): Promise<void> {
  enMemoria.set(id, archivo);
  try {
    await usarAlmacen("readwrite", (almacen) => almacen.put(archivo, id));
  } catch {
    // Queda en memoria hasta que se recargue la página.
  }
}

/** Un enlace `blob:` al PDF de prueba. Si ya no está (se borraron los datos del navegador), lanza `ErrorDePanel`. */
export async function enlaceArchivoLocal(id: string): Promise<string> {
  let archivo = enMemoria.get(id);
  if (!archivo) archivo = await usarAlmacen<Blob | undefined>("readonly", (almacen) => almacen.get(id)).catch(() => undefined);
  if (!archivo) throw new ErrorDePanel("archivo-perdido");
  const enlace = URL.createObjectURL(archivo);
  // La pestaña lo abre enseguida; después el enlace ya no hace falta.
  setTimeout(() => URL.revokeObjectURL(enlace), 60_000);
  return enlace;
}
