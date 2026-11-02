import { almacen, archivosDe, codigoDe, cuerpoDe, ErrorDeRuta, esPersonal, leerComoUsuario, responder, sesionDe } from "@/lib/servidor/archivos";

/** Cuánto vale el enlace para abrir un PDF: lo justo para que el visor del navegador lo termine de bajar. */
const DURACION_ENLACE = 10 * 60;

/**
 * Enlace firmado para abrir un PDF de una orden. Las reglas de `ordenes` dejan leer la orden al personal y al
 * cliente de su empresa: esos mismos pueden abrir sus PDF. Lo dado de baja (el archivo o la orden) lo abre
 * solo el personal, porque el cliente ya no lo ve.
 */
export async function POST(request: Request) {
  return responder(async () => {
    const sesion = sesionDe(request);
    const cuerpo = await cuerpoDe(request);
    const codigo = codigoDe(cuerpo.codigo);
    const bucket = almacen();
    const orden = await leerComoUsuario(sesion, `ordenes/${codigo}`);
    if (!orden) throw new ErrorDeRuta(404, "archivo-perdido");
    const archivo = archivosDe(orden).find((a) => a.id === cuerpo.id);
    // La ruta la escribe el navegador al anotarlo: tiene que ser de la carpeta de esta orden.
    if (!archivo || !archivo.ruta.startsWith(`${codigo}/`)) throw new ErrorDeRuta(404, "archivo-perdido");
    if ((archivo.baja || orden.baja?.timestampValue) && !(await esPersonal(sesion))) throw new ErrorDeRuta(404, "archivo-perdido");

    const { data, error } = await bucket.createSignedUrl(archivo.ruta, DURACION_ENLACE);
    if (error) throw /not.found/i.test(error.message) ? new ErrorDeRuta(404, "archivo-perdido") : error;
    return Response.json({ url: data.signedUrl });
  });
}
