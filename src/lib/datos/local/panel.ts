import { leerLimites, type LimitesAvisos } from "@/lib/dominio/avisos";
import { datosTallerParaGuardar, type DatosTaller, type DatosTallerGuardados } from "@/lib/dominio/datos-taller";
import { generarCodigo } from "@/lib/dominio/codigo";
import type { EstadoReparacion } from "@/lib/dominio/estados";
import { facturacionParaGuardar } from "@/lib/dominio/facturacion";
import { informeParaGuardar, type Informe, type InformeGuardado } from "@/lib/dominio/informe";
import { puede } from "@/lib/dominio/roles";
import {
  conBaja,
  conTransformador,
  type CuentaCliente,
  type CuentaPersonal,
  type DatosEmpresa,
  type DatosOrden,
  type DatosTransformador,
  type Empresa,
  type EquipoTaller,
  type Registro,
  type RolPersonal,
  type Taller,
  type Transformador,
} from "@/lib/dominio/tipos";
import { conCambioDeT, nuevoIdTrafo } from "@/lib/dominio/trafo";
import { ErrorDePanel, type PanelRepositorio } from "../repositorios";
import { conTransformadores, esperar, guardarDatos, leerDatos } from "./datos";

/**
 * Panel de prueba para desarrollar sin Firebase. En producción, solo en una demo (ver `modoDatos`).
 * Los cambios quedan en este navegador; las cuentas nuevas no reciben email: entran con la contraseña
 * común (`CLAVE_CUENTAS_NUEVAS`).
 */
export class PanelLocal implements PanelRepositorio {
  async obtenerTaller(rol: RolPersonal): Promise<Taller> {
    await esperar(500);
    const { empresas, transformadores, equipos, cuentas, personal, avisos } = leerDatos();
    const limites = leerLimites(avisos);
    // Como en Firestore, las cuentas solo las ve quien puede administrarlas.
    return puede(rol, "cuentas")
      ? { empresas, transformadores, equipos, cuentas, personal, avisos: limites }
      : { empresas, transformadores, equipos, cuentas: [], personal: [], avisos: limites };
  }

  async guardarAvisos(limites: LimitesAvisos): Promise<void> {
    await esperar(350);
    guardarDatos({ ...leerDatos(), avisos: limites });
  }

  async guardarEstado(codigo: string, estado: EstadoReparacion, etapas: Partial<Record<EstadoReparacion, Date>>): Promise<void> {
    await esperar(350);
    const datos = leerDatos();
    datos.equipos = datos.equipos.map((e) => (e.codigo === codigo ? { ...e, estado, etapas, actualizado: new Date() } : e));
    guardarDatos(datos);
  }

  async registrarEquipo(
    nuevos: DatosOrden,
    ingreso: Date,
    trafo: string | { empresa: string; datos: DatosTransformador },
  ): Promise<{ equipo: EquipoTaller; transformador: Transformador }> {
    await esperar(450);
    const datos = leerDatos();
    let transformador: Transformador | undefined;
    if (typeof trafo === "string") {
      transformador = datos.transformadores.find((t) => t.id === trafo);
      if (!transformador) throw new ErrorDePanel("desconocido");
    } else {
      transformador = { id: nuevoIdTrafo(), empresa: trafo.empresa, ...trafo.datos };
      datos.transformadores.push(transformador);
    }
    let codigo = generarCodigo();
    while (datos.equipos.some((e) => e.codigo === codigo)) codigo = generarCodigo();
    const equipo = conTransformador(
      {
        codigo,
        trafo: transformador.id,
        empresa: transformador.empresa,
        estado: "ingresado",
        etapas: { ingresado: ingreso },
        actualizado: new Date(),
        equipo: transformador.equipo,
        ...nuevos,
        numeroTIngreso: transformador.numeroT,
      },
      transformador,
    );
    datos.equipos.push(equipo);
    guardarDatos(datos);
    return { equipo, transformador };
  }

  async crearTransformador(empresa: string, nuevos: DatosTransformador): Promise<Transformador> {
    await esperar(350);
    const datos = leerDatos();
    const transformador: Transformador = { id: nuevoIdTrafo(), empresa, ...nuevos };
    datos.transformadores.push(transformador);
    guardarDatos(datos);
    return transformador;
  }

  async editarEquipo(codigo: string, nuevos: DatosOrden): Promise<void> {
    await esperar(350);
    const datos = leerDatos();
    const cambios = {
      numeroOrden: nuevos.numeroOrden,
      numeroOrdenTemporal: nuevos.numeroOrdenTemporal,
      referencia: nuevos.referencia,
      motivo: nuevos.motivo,
      actualizado: new Date(),
    };
    datos.equipos = datos.equipos.map((e) => (e.codigo === codigo ? { ...e, ...cambios } : e));
    guardarDatos(datos);
  }

  async editarTransformador(id: string, nuevos: DatosTransformador): Promise<void> {
    await esperar(350);
    const datos = leerDatos();
    const cambios = { numero: nuevos.numero, provisorio: nuevos.provisorio, numeroT: nuevos.numeroT, equipo: nuevos.equipo, uso: nuevos.uso, placa: nuevos.placa };
    datos.transformadores = datos.transformadores.map((t) => (t.id === id ? { ...t, ...cambios, cambiosT: conCambioDeT(t, nuevos.numeroT) } : t));
    datos.equipos = conTransformadores(datos.equipos, datos.transformadores);
    guardarDatos(datos);
  }

  async obtenerInforme(codigo: string): Promise<InformeGuardado | null> {
    await esperar(300);
    return leerDatos().informes?.[codigo] ?? null;
  }

  async guardarInforme(codigo: string, informe: Informe, por: string): Promise<void> {
    await esperar(350);
    const datos = leerDatos();
    datos.informes = { ...datos.informes, [codigo]: { ...informeParaGuardar(informe), por, actualizado: new Date() } };
    guardarDatos(datos);
  }

  async obtenerDatosTaller(codigo: string): Promise<DatosTallerGuardados | null> {
    await esperar(300);
    return leerDatos().datosTaller?.[codigo] ?? null;
  }

  async guardarDatosTaller(codigo: string, datosTaller: DatosTaller, por: string): Promise<void> {
    await esperar(350);
    const datos = leerDatos();
    datos.datosTaller = { ...datos.datosTaller, [codigo]: { ...datosTallerParaGuardar(datosTaller), por, actualizado: new Date() } };
    guardarDatos(datos);
  }

  async crearEmpresa({ nombre, facturacion }: DatosEmpresa): Promise<Empresa> {
    await esperar(350);
    const datos = leerDatos();
    const empresa = { id: `local-${crypto.randomUUID()}`, nombre, facturacion: facturacionParaGuardar(facturacion) };
    datos.empresas.push(empresa);
    guardarDatos(datos);
    return empresa;
  }

  async editarEmpresa(id: string, { nombre, facturacion }: DatosEmpresa): Promise<void> {
    await esperar(350);
    const datos = leerDatos();
    datos.empresas = datos.empresas.map((e) => (e.id === id ? { ...e, nombre, facturacion: facturacionParaGuardar(facturacion) } : e));
    guardarDatos(datos);
  }

  async crearCuenta(email: string, empresa: string): Promise<CuentaCliente> {
    await esperar(600);
    const datos = leerDatos();
    // Como en Firebase Auth, un email tiene una sola cuenta, sea de cliente o del personal.
    if (emailEnUso(datos, email)) throw new ErrorDePanel("email-en-uso");
    const cuenta = { uid: `local-${crypto.randomUUID()}`, email, empresa };
    datos.cuentas.push(cuenta);
    guardarDatos(datos);
    console.info("[modo local] Cuenta registrada (no se envía el email):", email);
    return cuenta;
  }

  async editarCuenta(uid: string, empresa: string): Promise<void> {
    await esperar(350);
    const datos = leerDatos();
    datos.cuentas = datos.cuentas.map((c) => (c.uid === uid ? { ...c, empresa } : c));
    guardarDatos(datos);
  }

  async crearPersonal(email: string, rol: RolPersonal): Promise<CuentaPersonal> {
    await esperar(600);
    const datos = leerDatos();
    if (emailEnUso(datos, email)) throw new ErrorDePanel("email-en-uso");
    const cuenta = { uid: `local-${crypto.randomUUID()}`, email, rol };
    datos.personal.push(cuenta);
    guardarDatos(datos);
    console.info("[modo local] Cuenta del personal registrada (no se envía el email):", email);
    return cuenta;
  }

  async editarPersonal(uid: string, rol: RolPersonal): Promise<void> {
    await esperar(350);
    const datos = leerDatos();
    datos.personal = datos.personal.map((p) => (p.uid === uid ? { ...p, rol } : p));
    guardarDatos(datos);
  }

  async reenviarAcceso(email: string): Promise<void> {
    await esperar(500);
    console.info("[modo local] Email para elegir la contraseña (no se envía):", email);
  }

  async cambiarBaja(registro: Registro, id: string, baja: boolean): Promise<void> {
    await esperar(350);
    guardarDatos(conBaja(leerDatos(), registro, id, baja ? new Date() : undefined));
  }
}

const emailEnUso = (datos: Pick<Taller, "cuentas" | "personal">, email: string) => [...datos.cuentas, ...datos.personal].some((c) => c.email === email);
