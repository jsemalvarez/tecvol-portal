/** Roles del personal de Tecvol. Cada uno entra al panel con distintos permisos. */
export type RolPersonal = "administrador" | "jefe-taller";

/** Quién ingresa: el cliente va al portal; el personal del taller, al panel. */
export type Rol = "cliente" | RolPersonal;

export const ROLES_PERSONAL: readonly RolPersonal[] = ["administrador", "jefe-taller"];

export const NOMBRES_ROL: Record<Rol, string> = {
  administrador: "Administrador",
  "jefe-taller": "Jefe de taller",
  cliente: "Cliente",
};

/** Qué puede hacer cada rol del personal, para elegirlo al crear una cuenta. */
export const DESCRIPCIONES_ROL: Record<RolPersonal, string> = {
  administrador: "Todo el panel: equipos, empresas, cuentas de clientes y cuentas del personal.",
  "jefe-taller":
    "Registra equipos, cambia su estado, corrige sus datos y carga el informe y el bobinado. No da de baja ni maneja empresas o cuentas.",
};

/**
 * - `equipos`: registrar equipos y actualizarlos (datos, estado, informe y bobinado).
 * - `baja-equipos`: dar de baja un equipo y reactivarlo.
 * - `empresas`: crear, editar y dar de baja empresas.
 * - `cuentas`: crear, editar y dar de baja cuentas de clientes y del personal.
 * - `avisos`: cambiar los días que puede llevar un equipo antes de que el panel avise.
 */
export type Permiso = "equipos" | "baja-equipos" | "empresas" | "cuentas" | "avisos";

/** Las reglas de Firestore (`firestore.rules`) aplican lo mismo: si cambia acá, cambia allá. */
const PERMISOS: Record<RolPersonal, readonly Permiso[]> = {
  administrador: ["equipos", "baja-equipos", "empresas", "cuentas", "avisos"],
  "jefe-taller": ["equipos"],
};

export function esRolPersonal(valor: unknown): valor is RolPersonal {
  return ROLES_PERSONAL.includes(valor as RolPersonal);
}

export function esRol(valor: unknown): valor is Rol {
  return valor === "cliente" || esRolPersonal(valor);
}

export function esPersonal(rol: Rol): rol is RolPersonal {
  return rol !== "cliente";
}

export function puede(rol: Rol, permiso: Permiso): boolean {
  return esPersonal(rol) && PERMISOS[rol].includes(permiso);
}
