import { generarCodigo } from "@/lib/dominio/codigo";
import type { EstadoReparacion } from "@/lib/dominio/estados";
import { informeParaGuardar, type Informe, type InformeGuardado } from "@/lib/dominio/informe";
import { conTodosLosCampos, type CuentaCliente, type DatosEquipo, type Empresa, type EquipoTaller, type Taller } from "@/lib/dominio/tipos";
import { ErrorDePanel, type PanelRepositorio } from "../repositorios";
import { esperar, guardarDatos, leerDatos } from "./datos";

/**
 * Panel de prueba para desarrollar sin Firebase. En producción, solo en una demo (ver `modoDatos`).
 * Los cambios quedan en este navegador; las cuentas nuevas se registran pero no reciben email ni
 * pueden ingresar (en modo local solo ingresan las cuentas de prueba).
 */
export class PanelLocal implements PanelRepositorio {
  async obtenerTaller(): Promise<Taller> {
    await esperar(500);
    return leerDatos();
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

  async crearCuenta(email: string, empresa: string): Promise<CuentaCliente> {
    await esperar(600);
    const datos = leerDatos();
    if (datos.cuentas.some((c) => c.email === email)) throw new ErrorDePanel("email-en-uso");
    const cuenta = { uid: `local-${crypto.randomUUID()}`, email, empresa };
    datos.cuentas.push(cuenta);
    guardarDatos(datos);
    console.info("[modo local] Cuenta registrada (no se envía el email):", email);
    return cuenta;
  }
}
