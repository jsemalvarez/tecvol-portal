"use client";

import { useCallback, useEffect, useState } from "react";
import { useSesionDe } from "@/components/ingreso/useSesionDe";
import { obtenerPanel } from "@/lib/datos/repositorios";
import type { LimitesAvisos } from "@/lib/dominio/avisos";
import type { DatosTaller, DatosTallerGuardados } from "@/lib/dominio/datos-taller";
import { etapasConEstado, type EstadoReparacion } from "@/lib/dominio/estados";
import { facturacionParaGuardar } from "@/lib/dominio/facturacion";
import type { Informe, InformeGuardado } from "@/lib/dominio/informe";
import { esPersonal } from "@/lib/dominio/roles";
import {
  conBaja,
  conTodosLosCampos,
  type CuentaCliente,
  type CuentaPersonal,
  type DatosEmpresa,
  type DatosEquipo,
  type Empresa,
  type EquipoTaller,
  type Registro,
  type RolPersonal,
  type Sesion,
  type Taller,
} from "@/lib/dominio/tipos";

/** La sesión de quien usa el panel: siempre alguien del personal, con su rol. */
export type SesionPersonal = Sesion & { rol: RolPersonal };

export type EstadoPanel =
  | { fase: "verificando" }
  | { fase: "cargando"; sesion: SesionPersonal }
  | { fase: "error"; sesion: SesionPersonal }
  | { fase: "listo"; sesion: SesionPersonal; taller: Taller };

/** Estado y etapas de un equipo antes de un cambio, para poder deshacerlo. */
export type EstadoAnterior = Pick<EquipoTaller, "codigo" | "estado" | "etapas">;

export interface AccionesPanel {
  guardarAvisos(limites: LimitesAvisos): Promise<void>;
  cambiarEstado(equipo: EquipoTaller, estado: EstadoReparacion, fecha: Date): Promise<EstadoAnterior>;
  /** Corrige las fechas de las etapas sin cambiar el estado. */
  corregirFechas(equipo: EquipoTaller, etapas: Partial<Record<EstadoReparacion, Date>>): Promise<EstadoAnterior>;
  restaurar(anterior: EstadoAnterior): Promise<void>;
  registrar(datos: DatosEquipo, ingreso: Date): Promise<EquipoTaller>;
  editar(codigo: string, datos: DatosEquipo): Promise<void>;
  obtenerInforme(codigo: string): Promise<InformeGuardado | null>;
  /** Guarda el informe a nombre de quien tiene la sesión abierta. */
  guardarInforme(codigo: string, informe: Informe): Promise<void>;
  obtenerDatosTaller(codigo: string): Promise<DatosTallerGuardados | null>;
  /** Guarda los datos del taller a nombre de quien tiene la sesión abierta. */
  guardarDatosTaller(codigo: string, datos: DatosTaller): Promise<void>;
  crearEmpresa(datos: DatosEmpresa): Promise<Empresa>;
  editarEmpresa(id: string, datos: DatosEmpresa): Promise<void>;
  crearCuenta(email: string, empresa: string): Promise<CuentaCliente>;
  editarCuenta(uid: string, empresa: string): Promise<void>;
  crearPersonal(email: string, rol: RolPersonal): Promise<CuentaPersonal>;
  editarPersonal(uid: string, rol: RolPersonal): Promise<void>;
  reenviarAcceso(email: string): Promise<void>;
  /** Baja lógica: el registro queda guardado y se puede reactivar. */
  darDeBaja(registro: Registro, id: string): Promise<void>;
  reactivar(registro: Registro, id: string): Promise<void>;
}

/**
 * Sesión del personal y datos del taller. Cada acción guarda primero y, si salió bien, actualiza
 * la lista en pantalla; si falla, lanza el error para que lo muestre quien la pidió.
 */
export function usePanel() {
  const { sesion: sesionArea, salir } = useSesionDe("panel");
  const sesion = sesionArea && esPersonal(sesionArea.rol) ? (sesionArea as SesionPersonal) : null;
  const [taller, setTaller] = useState<{ uid: string; taller: Taller } | { uid: string; error: true } | null>(null);
  const [intento, setIntento] = useState(0);
  const uid = sesion?.uid ?? null;
  const rol = sesion?.rol ?? null;

  useEffect(() => {
    if (!uid || !rol) return;
    let activo = true;
    obtenerPanel()
      .then((repositorio) => repositorio.obtenerTaller(rol))
      .then((datos) => {
        if (activo) setTaller({ uid, taller: datos });
      })
      .catch(() => {
        if (activo) setTaller({ uid, error: true });
      });
    return () => {
      activo = false;
    };
  }, [uid, rol, intento]);

  const reintentar = useCallback(() => {
    setTaller(null);
    setIntento((n) => n + 1);
  }, []);

  const actualizar = useCallback((cambio: (t: Taller) => Taller) => {
    setTaller((actual) => (actual && "taller" in actual ? { ...actual, taller: cambio(actual.taller) } : actual));
  }, []);

  const reemplazarEquipo = useCallback(
    (codigo: string, cambios: Partial<EquipoTaller>) =>
      actualizar((t) => ({ ...t, equipos: t.equipos.map((e) => (e.codigo === codigo ? { ...e, ...cambios } : e)) })),
    [actualizar],
  );

  const acciones: AccionesPanel = {
    async guardarAvisos(limites) {
      await (await obtenerPanel()).guardarAvisos(limites);
      actualizar((t) => ({ ...t, avisos: limites }));
    },
    async cambiarEstado(equipo, estado, fecha) {
      const etapas = etapasConEstado(equipo.etapas, estado, fecha);
      await (await obtenerPanel()).guardarEstado(equipo.codigo, estado, etapas);
      reemplazarEquipo(equipo.codigo, { estado, etapas, actualizado: new Date() });
      return { codigo: equipo.codigo, estado: equipo.estado, etapas: equipo.etapas };
    },
    async corregirFechas(equipo, etapas) {
      await (await obtenerPanel()).guardarEstado(equipo.codigo, equipo.estado, etapas);
      reemplazarEquipo(equipo.codigo, { etapas, actualizado: new Date() });
      return { codigo: equipo.codigo, estado: equipo.estado, etapas: equipo.etapas };
    },
    async restaurar(anterior) {
      await (await obtenerPanel()).guardarEstado(anterior.codigo, anterior.estado, anterior.etapas);
      reemplazarEquipo(anterior.codigo, { estado: anterior.estado, etapas: anterior.etapas, actualizado: new Date() });
    },
    async registrar(datos, ingreso) {
      const equipo = await (await obtenerPanel()).registrarEquipo(datos, ingreso);
      actualizar((t) => ({ ...t, equipos: [...t.equipos, equipo] }));
      return equipo;
    },
    async editar(codigo, datos) {
      await (await obtenerPanel()).editarEquipo(codigo, datos);
      reemplazarEquipo(codigo, { ...conTodosLosCampos(datos), actualizado: new Date() });
    },
    async obtenerInforme(codigo) {
      return (await obtenerPanel()).obtenerInforme(codigo);
    },
    async guardarInforme(codigo, informe) {
      await (await obtenerPanel()).guardarInforme(codigo, informe, sesion?.email ?? "");
    },
    async obtenerDatosTaller(codigo) {
      return (await obtenerPanel()).obtenerDatosTaller(codigo);
    },
    async guardarDatosTaller(codigo, datos) {
      await (await obtenerPanel()).guardarDatosTaller(codigo, datos, sesion?.email ?? "");
    },
    async crearEmpresa(datos) {
      const empresa = await (await obtenerPanel()).crearEmpresa(datos);
      actualizar((t) => ({ ...t, empresas: [...t.empresas, empresa].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")) }));
      return empresa;
    },
    async editarEmpresa(id, datos) {
      await (await obtenerPanel()).editarEmpresa(id, datos);
      const cambios = { nombre: datos.nombre, facturacion: facturacionParaGuardar(datos.facturacion) };
      actualizar((t) => ({
        ...t,
        empresas: t.empresas.map((e) => (e.id === id ? { ...e, ...cambios } : e)).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      }));
    },
    async crearCuenta(email, empresa) {
      const cuenta = await (await obtenerPanel()).crearCuenta(email, empresa);
      actualizar((t) => ({ ...t, cuentas: [...t.cuentas, cuenta] }));
      return cuenta;
    },
    async editarCuenta(uid, empresa) {
      await (await obtenerPanel()).editarCuenta(uid, empresa);
      actualizar((t) => ({ ...t, cuentas: t.cuentas.map((c) => (c.uid === uid ? { ...c, empresa } : c)) }));
    },
    async crearPersonal(email, rol) {
      const cuenta = await (await obtenerPanel()).crearPersonal(email, rol);
      actualizar((t) => ({ ...t, personal: [...t.personal, cuenta] }));
      return cuenta;
    },
    async editarPersonal(uid, rol) {
      await (await obtenerPanel()).editarPersonal(uid, rol);
      actualizar((t) => ({ ...t, personal: t.personal.map((p) => (p.uid === uid ? { ...p, rol } : p)) }));
    },
    async reenviarAcceso(email) {
      await (await obtenerPanel()).reenviarAcceso(email);
    },
    async darDeBaja(registro, id) {
      await (await obtenerPanel()).cambiarBaja(registro, id, true);
      actualizar((t) => conBaja(t, registro, id, new Date()));
    },
    async reactivar(registro, id) {
      await (await obtenerPanel()).cambiarBaja(registro, id, false);
      actualizar((t) => conBaja(t, registro, id, undefined));
    },
  };

  let estado: EstadoPanel = { fase: "verificando" };
  if (sesion) {
    if (!taller || taller.uid !== sesion.uid) estado = { fase: "cargando", sesion };
    else if ("taller" in taller) estado = { fase: "listo", sesion, taller: taller.taller };
    else estado = { fase: "error", sesion };
  }

  return { estado, acciones, reintentar, salir };
}
