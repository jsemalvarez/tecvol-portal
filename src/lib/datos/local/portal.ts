import { archivosActivos } from "@/lib/dominio/archivos";
import type { EquipoCliente, PortalCliente } from "@/lib/dominio/tipos";
import { ErrorDePanel, type PortalRepositorio } from "../repositorios";
import { enlaceArchivoLocal } from "./archivos";
import { esperar, leerDatos } from "./datos";

/** Portal de prueba para desarrollar sin Firebase. En producción, solo en una demo (ver `modoDatos`). */
export class PortalLocal implements PortalRepositorio {
  async obtenerPortal(uid: string): Promise<PortalCliente | null> {
    await esperar(600);
    const datos = leerDatos();
    const cuenta = datos.cuentas.find((c) => c.uid === uid);
    if (!cuenta || cuenta.baja) return null;
    const equipos: EquipoCliente[] = datos.equipos
      .filter((e) => e.empresa === cuenta.empresa && !e.baja)
      .map(({ empresa: _empresa, baja: _baja, archivos, ...equipo }) => ({ ...equipo, archivos: archivosActivos(archivos) }));
    return { empresa: datos.empresas.find((e) => e.id === cuenta.empresa)?.nombre ?? "", equipos };
  }

  async enlaceArchivo(codigo: string, id: string): Promise<string> {
    await esperar(200);
    // Como en la ruta del servidor: lo dado de baja, el cliente no lo abre.
    const equipo = leerDatos().equipos.find((e) => e.codigo === codigo);
    if (!equipo || equipo.baja || !archivosActivos(equipo.archivos).some((a) => a.id === id)) throw new ErrorDePanel("archivo-perdido");
    return enlaceArchivoLocal(id);
  }
}
