import type { Rol, Sesion } from "@/lib/dominio/tipos";
import { ErrorDeIngreso, type AutenticacionRepositorio } from "../repositorios";

/**
 * Ingreso de prueba para desarrollar sin Firebase. En producción, solo en una demo (ver `modoDatos`).
 * Las cuentas son ficticias y la sesión se guarda en este navegador.
 */
export const CUENTAS_DE_PRUEBA: { email: string; clave: string; rol: Rol }[] = [
  { email: "cliente@prueba.tecvol.test", clave: "cliente-prueba", rol: "cliente" },
  { email: "personal@prueba.tecvol.test", clave: "personal-prueba", rol: "personal" },
];

const CLAVE_ALMACEN = "tecvol-sesion-local";
const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

function leer(): Sesion | null {
  try {
    const valor = window.localStorage.getItem(CLAVE_ALMACEN);
    return valor ? (JSON.parse(valor) as Sesion) : null;
  } catch {
    return null;
  }
}

function guardar(sesion: Sesion | null) {
  try {
    if (sesion) window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(sesion));
    else window.localStorage.removeItem(CLAVE_ALMACEN);
  } catch {
    // Sin almacenamiento (ventana privada, por ejemplo) la sesión dura lo que la página.
  }
}

const oyentes = new Set<(sesion: Sesion | null) => void>();
let enMemoria: Sesion | null = null;

function avisar(sesion: Sesion | null) {
  enMemoria = sesion;
  guardar(sesion);
  for (const oyente of oyentes) oyente(sesion);
}

export class AutenticacionLocal implements AutenticacionRepositorio {
  async ingresar(email: string, clave: string): Promise<Sesion> {
    await esperar(500);
    // Sin espacios en los extremos: al copiar la contraseña del recuadro de prueba se suele arrastrar uno.
    const cuenta = CUENTAS_DE_PRUEBA.find((c) => c.email === email.trim().toLowerCase() && c.clave === clave.trim());
    if (!cuenta) throw new ErrorDeIngreso("credenciales");
    const sesion: Sesion = { uid: `local-${cuenta.rol}`, email: cuenta.email, rol: cuenta.rol };
    avisar(sesion);
    return sesion;
  }

  async salir(): Promise<void> {
    avisar(null);
  }

  async restablecerClave(email: string): Promise<void> {
    await esperar(500);
    console.info("[modo local] Enlace para restablecer la contraseña (no se envía):", email);
  }

  observarSesion(alCambiar: (sesion: Sesion | null) => void): () => void {
    oyentes.add(alCambiar);
    alCambiar(enMemoria ?? leer());
    const alCambiarOtraPestana = (evento: StorageEvent) => {
      if (evento.key === CLAVE_ALMACEN) alCambiar(leer());
    };
    window.addEventListener("storage", alCambiarOtraPestana);
    return () => {
      oyentes.delete(alCambiar);
      window.removeEventListener("storage", alCambiarOtraPestana);
    };
  }
}
