import { nombreParaRuta } from "@/lib/dominio/archivos";
import { almacen, codigoDe, cuerpoDe, ErrorDeRuta, esPersonal, leerComoUsuario, responder, sesionDe } from "@/lib/servidor/archivos";

/**
 * Pide dónde subir un PDF a una orden: solo el personal. Responde el id del archivo, su ruta en el bucket
 * (`{codigo}/{id}/{nombre}.pdf`) y el enlace firmado para subirlo, que vale dos horas. Después el navegador
 * anota el archivo en la orden.
 */
export async function POST(request: Request) {
  return responder(async () => {
    const sesion = sesionDe(request);
    const cuerpo = await cuerpoDe(request);
    const codigo = codigoDe(cuerpo.codigo);
    const bucket = almacen();
    if (!(await esPersonal(sesion))) throw new ErrorDeRuta(403, "permiso");
    if (!(await leerComoUsuario(sesion, `ordenes/${codigo}`))) throw new ErrorDeRuta(404, "desconocido");

    const id = crypto.randomUUID();
    const ruta = `${codigo}/${id}/${nombreParaRuta(typeof cuerpo.nombre === "string" ? cuerpo.nombre : "")}`;
    const { data, error } = await bucket.createSignedUploadUrl(ruta);
    if (error) throw error;
    return Response.json({ id, ruta, url: data.signedUrl });
  });
}
