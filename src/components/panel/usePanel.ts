"use client";

import { useCallback, useEffect, useState } from "react";
import { useSesionDe } from "@/components/ingreso/useSesionDe";
import { obtenerPanel } from "@/lib/datos/repositorios";
import { etapasConEstado, type EstadoReparacion } from "@/lib/dominio/estados";
import type { CuentaCliente, DatosEquipo, Empresa, EquipoTaller, Sesion, Taller } from "@/lib/dominio/tipos";

export type EstadoPanel =
  | { fase: "verificando" }
  | { fase: "cargando"; sesion: Sesion }
  | { fase: "error"; sesion: Sesion }
  | { fase: "listo"; sesion: Sesion; taller: Taller };

/** Estado y etapas de un equipo antes de un cambio, para poder deshacerlo. */
export type EstadoAnterior = Pick<EquipoTaller, "codigo" | "estado" | "etapas">;

export interface AccionesPanel {
  cambiarEstado(equipo: EquipoTaller, estado: EstadoReparacion, fecha: Date): Promise<EstadoAnterior>;
  restaurar(anterior: EstadoAnterior): Promise<void>;
  registrar(datos: DatosEquipo, ingreso: Date): Promise<EquipoTaller>;
  editar(codigo: string, datos: DatosEquipo): Promise<void>;
  crearEmpresa(nombre: string): Promise<Empresa>;
  crearCuenta(email: string, empresa: string): Promise<CuentaCliente>;
}

/**
 * Sesión del personal y datos del taller. Cada acción guarda primero y, si salió bien, actualiza
 * la lista en pantalla; si falla, lanza el error para que lo muestre quien la pidió.
 */
export function usePanel() {
  const { sesion, salir } = useSesionDe("personal");
  const [taller, setTaller] = useState<{ uid: string; taller: Taller } | { uid: string; error: true } | null>(null);
  const [intento, setIntento] = useState(0);
  const uid = sesion?.uid ?? null;

  useEffect(() => {
    if (!uid) return;
    let activo = true;
    obtenerPanel()
      .then((repositorio) => repositorio.obtenerTaller())
      .then((datos) => {
        if (activo) setTaller({ uid, taller: datos });
      })
      .catch(() => {
        if (activo) setTaller({ uid, error: true });
      });
    return () => {
      activo = false;
    };
  }, [uid, intento]);

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
    async cambiarEstado(equipo, estado, fecha) {
      const etapas = etapasConEstado(equipo.etapas, estado, fecha);
      await (await obtenerPanel()).guardarEstado(equipo.codigo, estado, etapas);
      reemplazarEquipo(equipo.codigo, { estado, etapas, actualizado: new Date() });
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
      reemplazarEquipo(codigo, { ...datos, referencia: datos.referencia, serie: datos.serie, actualizado: new Date() });
    },
    async crearEmpresa(nombre) {
      const empresa = await (await obtenerPanel()).crearEmpresa(nombre);
      actualizar((t) => ({ ...t, empresas: [...t.empresas, empresa].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")) }));
      return empresa;
    },
    async crearCuenta(email, empresa) {
      const cuenta = await (await obtenerPanel()).crearCuenta(email, empresa);
      actualizar((t) => ({ ...t, cuentas: [...t.cuentas, cuenta] }));
      return cuenta;
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
