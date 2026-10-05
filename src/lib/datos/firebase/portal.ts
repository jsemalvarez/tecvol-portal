import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { EquipoCliente, PortalCliente } from "@/lib/dominio/tipos";
import type { PortalRepositorio } from "../repositorios";
import { obtenerFirestore } from "./app";
import { SeguimientoFirestore } from "./seguimiento";

const texto = (valor: unknown) => (typeof valor === "string" && valor.trim() ? valor.trim() : undefined);

/**
 * Portal de una cuenta de cliente:
 * 1. `clientes/{uid}` dice a qué empresa pertenece la cuenta.
 * 2. `ordenes` (privada) lista los códigos de esa empresa; las reglas solo dejan leer las propias.
 * 3. El estado y las etapas salen de `seguimiento/{codigo}`, el mismo documento de la consulta pública,
 *    así el taller carga cada cambio en un solo lugar.
 */
export class PortalFirestore implements PortalRepositorio {
  async obtenerPortal(uid: string): Promise<PortalCliente | null> {
    const db = obtenerFirestore();
    const cliente = await getDoc(doc(db, "clientes", uid));
    const empresa = cliente.exists() ? texto(cliente.data().empresa) : undefined;
    if (!empresa) return null;

    const ordenes = await getDocs(query(collection(db, "ordenes"), where("empresa", "==", empresa)));
    const seguimiento = new SeguimientoFirestore();
    const equipos = await Promise.all(
      ordenes.docs.map(async (orden): Promise<EquipoCliente | null> => {
        const publico = await seguimiento.obtenerPorCodigo(orden.id);
        if (!publico) return null;
        const datos = orden.data();
        return { ...publico, referencia: texto(datos.referencia), serie: texto(datos.serie) };
      }),
    );

    return {
      empresa: texto(cliente.data()?.nombre) ?? "",
      equipos: equipos.filter((e): e is EquipoCliente => e !== null),
    };
  }
}
