import { esRol } from "@/lib/dominio/roles";
import type { Rol, Sesion } from "@/lib/dominio/tipos";
import { ErrorDeIngreso, type AutenticacionRepositorio } from "../repositorios";
import { CLAVE_CUENTAS_NUEVAS, CUENTAS, leerDatos, PERSONAL } from "./datos";

/**
 * Ingreso de prueba para desarrollar sin Firebase. En producción, solo en una demo (ver `modoDatos`).
 * Las cuentas son ficticias (una por rol) y la sesión se guarda en este navegador.
 */
export const CUENTAS_DE_PRUEBA: { email: string; clave: string; rol: Rol }[] = [
  { email: PERSONAL[0].email, clave: "administrador-prueba", rol: "administrador" },
  { email: PERSONAL[1].email, clave: "jefe-prueba", rol: "jefe-taller" },
  { email: CUENTAS[0].email, clave: "cliente-prueba", rol: "cliente" },
];

const CLAVE_ALMACEN = "tecvol-sesion-local";
const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

function leer(): Sesion | null {
  try {
    const valor = window.localStorage.getItem(CLAVE_ALMACEN);
    const sesion = valor ? (JSON.parse(valor) as Sesion) : null;
    // Una sesión guardada antes de que hubiera roles ("personal") ya no vale: hay que volver a ingresar.
    return sesion && esRol(sesion.rol) ? sesion : null;
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
    const correo = email.trim().toLowerCase();
    const contrasena = clave.trim();
    // Las cuentas de prueba entran con su contraseña; las creadas en el panel de este navegador, con la común.
    const fija = CUENTAS_DE_PRUEBA.find((c) => c.email === correo);
    if (contrasena !== (fija ? fija.clave : CLAVE_CUENTAS_NUEVAS)) throw new ErrorDeIngreso("credenciales");

    // El rol y la baja salen de los datos de este navegador, como en Firestore: el panel puede cambiarlos.
    const datos = leerDatos();
    const personal = datos.personal.find((p) => p.email === correo);
    if (personal) {
      if (personal.baja) throw new ErrorDeIngreso("deshabilitada");
      return this.iniciar({ uid: personal.uid, email: personal.email, rol: personal.rol });
    }
    const cliente = datos.cuentas.find((c) => c.email === correo);
    if (cliente) {
      if (cliente.baja) throw new ErrorDeIngreso("deshabilitada");
      return this.iniciar({ uid: cliente.uid, email: cliente.email, rol: "cliente" });
    }
    throw new ErrorDeIngreso("credenciales");
  }

  private iniciar(sesion: Sesion): Sesion {
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
