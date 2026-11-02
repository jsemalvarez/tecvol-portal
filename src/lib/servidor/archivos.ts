import { createClient } from "@supabase/supabase-js";
import { esRolPersonal } from "@/lib/dominio/roles";

/**
 * Lo que comparten las rutas de los PDF (`/api/archivos/…`). Corre solo en el servidor.
 *
 * Los archivos están en el bucket privado `ordenes` de Supabase Storage, al que llega solo la clave secreta de
 * este servidor. Cada ruta revisa la sesión de Firebase leyendo Firestore con el token del usuario, así deciden
 * las mismas reglas que en el navegador, y entrega un enlace firmado y temporal. El navegador sube y abre el
 * PDF directo en Supabase: el archivo no pasa por acá (Vercel corta los pedidos de más de 4,5 MB).
 */

const BUCKET = "ordenes";

/** Lo que una ruta le explica al navegador: los mismos motivos que `ErrorDePanel`. */
export type MotivoRuta = "permiso" | "conexion" | "sin-almacen" | "archivo-perdido" | "desconocido";

export class ErrorDeRuta extends Error {
  constructor(
    readonly estado: number,
    readonly motivo: MotivoRuta,
  ) {
    super(motivo);
    this.name = "ErrorDeRuta";
  }
}

/** Ejecuta la ruta y traduce cualquier error a `{ error: motivo }` con su código HTTP. */
export async function responder(ruta: () => Promise<Response>): Promise<Response> {
  try {
    return await ruta();
  } catch (error) {
    if (error instanceof ErrorDeRuta) return Response.json({ error: error.motivo }, { status: error.estado });
    console.error("Error en una ruta de archivos:", error);
    return Response.json({ error: "desconocido" }, { status: 500 });
  }
}

/** El bucket con la clave secreta. Sin `SUPABASE_URL` y `SUPABASE_SECRET_KEY`, no hay dónde guardar los PDF. */
export function almacen() {
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) throw new ErrorDeRuta(503, "sin-almacen");
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(BUCKET);
}

export interface SesionRuta {
  token: string;
  uid: string;
}

/**
 * El token de Firebase que manda el navegador (`Authorization: Bearer …`) y el UID que dice. El UID se lee sin
 * verificar la firma: la verifica Firestore en cada `leerComoUsuario`, y las rutas responden solo si esas
 * lecturas salen bien.
 */
export function sesionDe(request: Request): SesionRuta {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  try {
    const carga = token && JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    // Va en la ruta del documento `personal/{uid}`: solo letras y números, como los UID de Firebase.
    if (token && typeof carga?.user_id === "string" && /^[A-Za-z0-9]{1,128}$/.test(carga.user_id)) return { token, uid: carga.user_id };
  } catch {
    // Un token roto es como no tener sesión.
  }
  throw new ErrorDeRuta(401, "permiso");
}

/** El cuerpo JSON del pedido, o un objeto vacío si no viene. */
export async function cuerpoDe(request: Request): Promise<Record<string, unknown>> {
  const cuerpo = await request.json().catch(() => null);
  return cuerpo && typeof cuerpo === "object" ? cuerpo : {};
}

/** Un código de seguimiento: también es el ID de la orden, así que no puede traer barras ni nada raro. */
export function codigoDe(valor: unknown): string {
  if (typeof valor === "string" && /^[0-9A-Z]{4,20}$/.test(valor)) return valor;
  throw new ErrorDeRuta(400, "desconocido");
}

/** Un valor de un documento como lo devuelve la API REST de Firestore. */
interface Valor {
  stringValue?: string;
  timestampValue?: string;
  arrayValue?: { values?: Valor[] };
  mapValue?: { fields?: Campos };
}

export type Campos = Record<string, Valor | undefined>;

/**
 * Lee un documento de Firestore con la sesión del usuario: deciden las reglas, como en el navegador. `null`
 * si no existe; si el token no sirve o las reglas no lo dejan, lanza `ErrorDeRuta`.
 */
export async function leerComoUsuario({ token }: SesionRuta, ruta: string): Promise<Campos | null> {
  const proyecto = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  let respuesta: Response;
  try {
    respuesta = await fetch(`https://firestore.googleapis.com/v1/projects/${proyecto}/databases/(default)/documents/${ruta}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch (error) {
    console.error("Firestore no respondió:", error);
    throw new ErrorDeRuta(502, "conexion");
  }
  if (respuesta.status === 404) return null;
  if (respuesta.status === 401 || respuesta.status === 403) throw new ErrorDeRuta(403, "permiso");
  if (!respuesta.ok) {
    console.error(`Firestore respondió ${respuesta.status}:`, await respuesta.text());
    throw new ErrorDeRuta(502, "conexion");
  }
  return ((await respuesta.json()) as { fields?: Campos }).fields ?? {};
}

/** Si la sesión es de alguien del personal con un rol válido y sin baja (como `esPersonal` en las reglas). */
export async function esPersonal(sesion: SesionRuta): Promise<boolean> {
  // Sin permiso para leerlo es como no tenerlo; un corte de conexión, en cambio, se avisa como tal.
  const personal = await leerComoUsuario(sesion, `personal/${sesion.uid}`).catch((error) => {
    if (error instanceof ErrorDeRuta && error.motivo === "permiso") return null;
    throw error;
  });
  return !!personal && esRolPersonal(personal.rol?.stringValue) && !personal.baja?.timestampValue;
}

/** Los PDF anotados en una orden: lo que la ruta necesita de cada uno. */
export function archivosDe(orden: Campos): { id: string; ruta: string; baja: boolean }[] {
  return (orden.archivos?.arrayValue?.values ?? []).flatMap((valor) => {
    const campos = valor.mapValue?.fields;
    const id = campos?.id?.stringValue;
    const ruta = campos?.ruta?.stringValue;
    return id && ruta ? [{ id, ruta, baja: !!campos.baja?.timestampValue }] : [];
  });
}
