import type { EquipoCliente, PortalCliente } from "@/lib/dominio/tipos";
import type { PortalRepositorio } from "../repositorios";
import { esperar, leerDatos } from "./datos";

/** Portal de prueba para desarrollar sin Firebase. En producción, solo en una demo (ver `modoDatos`). */
export class PortalLocal implements PortalRepositorio {
  async obtenerPortal(uid: string): Promise<PortalCliente | null> {
    await esperar(600);
    const datos = leerDatos();
    const cuenta = datos.cuentas.find((c) => c.uid === uid);
    if (!cuenta) return null;
    const equipos: EquipoCliente[] = datos.equipos
      .filter((e) => e.empresa === cuenta.empresa)
      .map(({ empresa: _empresa, ...equipo }) => equipo);
    return { empresa: datos.empresas.find((e) => e.id === cuenta.empresa)?.nombre ?? "", equipos };
  }
}
