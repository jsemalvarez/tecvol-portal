import { generarCodigo } from "@/lib/dominio/codigo";
import type { EstadoReparacion } from "@/lib/dominio/estados";
import { informeParaGuardar, type Informe, type InformeGuardado } from "@/lib/dominio/informe";
import { puede } from "@/lib/dominio/roles";
import {
  conBaja,
  conTodosLosCampos,
  type CuentaCliente,
  type CuentaPersonal,
  type DatosEquipo,
  type Empresa,
  type EquipoTaller,
  type Registro,
  type RolPersonal,
  type Taller,
} from "@/lib/dominio/tipos";
import { ErrorDePanel, type PanelRepositorio } from "../repositorios";
import { esperar, guardarDatos, leerDatos } from "./datos";

/**
 * Panel de prueba para desarrollar sin Firebase. En producción, solo en una demo (ver `modoDatos`).
 * Los cambios quedan en este navegador; las cuentas nuevas no reciben email: entran con la contraseña
 * común (`CLAVE_CUENTAS_NUEVAS`).
 */
export class PanelLocal implements PanelRepositorio {
  async obtenerTaller(rol: RolPersonal): Promise<Taller> {
    await esperar(500);
    const { empresas, equipos, cuentas, personal } = leerDatos();
    // Como en Firestore, las cuentas solo las ve quien puede administrarlas.
    return puede(rol, "cuentas") ? { empresas, equipos, cuentas, personal } : { empresas, equipos, cuentas: [], personal: [] };
  }

  async guardarEstado(codigo: string, estado: EstadoReparacion, etapas: Partial<Record<EstadoReparacion, Date>>): Promise<void> {
    await esperar(350);
    const datos = leerDatos();
    datos.equipos = datos.equipos.map((e) => (e.codigo === codigo ? { ...e, estado, etapas, actualizado: new Date() } : e));
    guardarDatos(datos);
  }

  async registrarEquipo(nuevos: DatosEquipo, ingreso: Date): Promise<EquipoTaller> {
    await esperar(450);
    const datos = leerDatos();
    let codigo = generarCodigo();
    while (datos.equipos.some((e) => e.codigo === codigo)) codigo = generarCodigo();
    const equipo: EquipoTaller = { codigo, estado: "ingresado", etapas: { ingresado: ingreso }, actualizado: new Date(), ...nuevos };
    datos.equipos.push(equipo);
    guardarDatos(datos);
    return equipo;
  }

  async editarEquipo(codigo: string, nuevos: DatosEquipo): Promise<void> {
    await esperar(350);
    const datos = leerDatos();
    datos.equipos = datos.equipos.map((e) => (e.codigo === codigo ? { ...e, ...conTodosLosCampos(nuevos), actualizado: new Date() } : e));
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

  async crearEmpresa(nombre: string): Promise<Empresa> {
    await esperar(350);
    const datos = leerDatos();
    const empresa = { id: `local-${crypto.randomUUID()}`, nombre };
    datos.empresas.push(empresa);
    guardarDatos(datos);
    return empresa;
  }

  async editarEmpresa(id: string, nombre: string): Promise<void> {
    await esperar(350);
    const datos = leerDatos();
    datos.empresas = datos.empresas.map((e) => (e.id === id ? { ...e, nombre } : e));
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

const emailEnUso = (datos: Taller, email: string) => [...datos.cuentas, ...datos.personal].some((c) => c.email === email);
