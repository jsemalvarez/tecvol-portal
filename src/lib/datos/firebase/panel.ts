import { FirebaseError, getApps, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, inMemoryPersistence, initializeAuth, sendPasswordResetEmail, signOut, type Auth } from "firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { leerLimites, type LimitesAvisos } from "@/lib/dominio/avisos";
import { datosTallerParaGuardar, leerDatosTaller, type DatosTaller, type DatosTallerGuardados } from "@/lib/dominio/datos-taller";
import { generarCodigo } from "@/lib/dominio/codigo";
import type { EstadoReparacion } from "@/lib/dominio/estados";
import { informeParaGuardar, leerInforme, type Informe, type InformeGuardado } from "@/lib/dominio/informe";
import { esUso, leerPlaca } from "@/lib/dominio/placa";
import { esRolPersonal, puede } from "@/lib/dominio/roles";
import { facturacionParaGuardar, leerFacturacion } from "@/lib/dominio/facturacion";
import { conCambioDeT, migrarTransformadores, nuevoIdTrafo, type OrdenAntigua } from "@/lib/dominio/trafo";
import {
  conTransformador,
  type ArchivoOrden,
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
import { ErrorDePanel, type MotivoErrorDePanel, type PanelRepositorio } from "../repositorios";
import { obtenerFirestore } from "./app";
import { enlaceArchivo, enviarArchivo, leerArchivos, pedirSubida } from "./archivos";
import { configuracionFirebase } from "./config";
import { leerSeguimiento } from "./seguimiento";

const texto = (valor: unknown) => (typeof valor === "string" && valor.trim() ? valor.trim() : undefined);
const fecha = (valor: unknown) => (valor instanceof Timestamp ? valor.toDate() : undefined);

/** Dónde vive cada registro que se da de baja. El equipo son dos documentos: ver `cambiarBaja`. */
const COLECCIONES: Record<Exclude<Registro, "equipo">, string> = {
  transformador: "transformadores",
  empresa: "empresas",
  cuenta: "clientes",
  personal: "personal",
};

function motivo(error: unknown): MotivoErrorDePanel {
  if (!(error instanceof FirebaseError)) return "desconocido";
  switch (error.code) {
    case "auth/email-already-in-use":
      return "email-en-uso";
    case "auth/invalid-email":
      return "email-invalido";
    case "auth/operation-not-allowed":
    case "auth/admin-restricted-operation":
      return "altas-deshabilitadas";
    case "permission-denied":
      return "permiso";
    case "auth/too-many-requests":
      return "intentos";
    case "unavailable":
    case "auth/network-request-failed":
      return "conexion";
    default:
      return "desconocido";
  }
}

/** Ejecuta una escritura y traduce el error a un motivo que la interfaz sabe explicar. */
async function guardar<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion();
  } catch (error) {
    throw error instanceof ErrorDePanel ? error : new ErrorDePanel(motivo(error));
  }
}

function aTimestamps(etapas: Partial<Record<EstadoReparacion, Date>>) {
  return Object.fromEntries(Object.entries(etapas).map(([estado, fecha]) => [estado, Timestamp.fromDate(fecha)]));
}

/**
 * Las cuentas se crean con una segunda instancia de Firebase Auth, en memoria: así el alta no
 * cierra la sesión del personal que la hace. Requiere que el proyecto permita crear cuentas.
 */
let authAltas: Auth | null = null;

function obtenerAuthAltas(): Auth {
  if (!authAltas) {
    const app = getApps().find((a) => a.name === "altas") ?? initializeApp(configuracionFirebase, "altas");
    authAltas = initializeAuth(app, { persistence: inMemoryPersistence });
    authAltas.languageCode = "es";
  }
  return authAltas;
}

/** Contraseña inicial que nadie conoce: el cliente elige la suya con el email de restablecimiento. */
function claveInicial() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("");
}

export class PanelFirestore implements PanelRepositorio {
  async obtenerTaller(rol: RolPersonal): Promise<Taller> {
    const db = obtenerFirestore();
    // Las reglas solo dejan leer las cuentas a quien puede administrarlas: los demás ni las piden.
    const conCuentas = puede(rol, "cuentas");
    const [empresas, trafos, ordenes, seguimientos, clientes, personal, avisos] = await guardar(() =>
      Promise.all([
        getDocs(collection(db, "empresas")),
        getDocs(collection(db, "transformadores")),
        getDocs(collection(db, "ordenes")),
        getDocs(collection(db, "seguimiento")),
        conCuentas ? getDocs(collection(db, "clientes")) : null,
        conCuentas ? getDocs(collection(db, "personal")) : null,
        // Si no se puede leer (por ejemplo, con reglas viejas), se usan los límites por defecto: el panel igual carga.
        getDoc(doc(db, "ajustes", "avisos")).catch(() => null),
      ]),
    );

    const privados = new Map(ordenes.docs.map((o) => [o.id, o.data()]));
    const publicos = new Map(
      seguimientos.docs.flatMap((s) => {
        const publico = leerSeguimiento(s.id, s.data());
        return publico ? [[s.id, { publico, baja: fecha(s.data().baja) }] as const] : [];
      }),
    );
    const transformadores = trafos.docs.map((t) => leerTransformador(t.id, t.data()));
    const { nuevos, asignados } = await migrar(privados, publicos, transformadores);
    transformadores.push(...nuevos);
    const porId = new Map(transformadores.map((t) => [t.id, t]));

    const equipos: EquipoTaller[] = [];
    for (const [codigo, { publico, baja }] of publicos) {
      const orden = privados.get(codigo) ?? {};
      const trafo = asignados.get(codigo) ?? texto(orden.trafo);
      equipos.push(
        conTransformador(
          {
            ...publico,
            // Un seguimiento sin orden (no debería pasar) queda solo, con un transformador que no existe.
            trafo: trafo ?? nuevoIdTrafo(),
            empresa: texto(orden.empresa) ?? "",
            referencia: texto(orden.referencia),
            serie: texto(orden.serie),
            numeroOrden: texto(orden.numeroOrden),
            ...(orden.numeroOrdenTemporal === true ? { numeroOrdenTemporal: true } : {}),
            motivo: texto(orden.motivo),
            // Las cargadas antes de que existieran los transformadores tienen el N.º T como `numeroTrafo`.
            numeroTIngreso: texto(orden.numeroTIngreso) ?? texto(orden.numeroTrafo),
            archivos: leerArchivos(orden.archivos),
            baja,
          },
          trafo ? porId.get(trafo) : undefined,
        ),
      );
    }

    return {
      empresas: empresas.docs
        .map((e) => ({
          id: e.id,
          nombre: texto(e.data().nombre) ?? e.id,
          facturacion: leerFacturacion(e.data().facturacion),
          baja: fecha(e.data().baja),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      transformadores,
      equipos,
      cuentas: (clientes?.docs ?? []).map((c) => ({
        uid: c.id,
        email: texto(c.data().email) ?? "",
        empresa: texto(c.data().empresa) ?? "",
        baja: fecha(c.data().baja),
      })),
      // Un documento sin un rol válido no da acceso al panel (ver las reglas): no se lista.
      personal: (personal?.docs ?? []).flatMap((p) => {
        const datos = p.data();
        return esRolPersonal(datos.rol) ? [{ uid: p.id, email: texto(datos.email) ?? "", rol: datos.rol, baja: fecha(datos.baja) }] : [];
      }),
      avisos: leerLimites(avisos?.exists() ? avisos.data() : null),
    };
  }

  async guardarAvisos(limites: LimitesAvisos): Promise<void> {
    await guardar(() => setDoc(doc(obtenerFirestore(), "ajustes", "avisos"), { ingreso: limites.ingreso, aprobacion: limites.aprobacion }));
  }

  async guardarEstado(codigo: string, estado: EstadoReparacion, etapas: Partial<Record<EstadoReparacion, Date>>): Promise<void> {
    await guardar(() =>
      updateDoc(doc(obtenerFirestore(), "seguimiento", codigo), { estado, etapas: aTimestamps(etapas), actualizado: serverTimestamp() }),
    );
  }

  async registrarEquipo(
    datos: DatosOrden,
    ingreso: Date,
    trafo: string | { empresa: string; datos: DatosTransformador },
  ): Promise<{ equipo: EquipoTaller; transformador: Transformador }> {
    const db = obtenerFirestore();
    return guardar(async () => {
      let transformador: Transformador;
      if (typeof trafo === "string") {
        const guardado = await getDoc(doc(db, "transformadores", trafo));
        if (!guardado.exists()) throw new ErrorDePanel("desconocido");
        transformador = leerTransformador(guardado.id, guardado.data());
      } else {
        transformador = { id: doc(collection(db, "transformadores")).id, empresa: trafo.empresa, ...trafo.datos };
      }
      // El código es aleatorio: se descarta si ya existe, algo muy improbable.
      let codigo = generarCodigo();
      for (let intento = 0; (await getDoc(doc(db, "seguimiento", codigo))).exists(); intento++) {
        if (intento >= 4) throw new ErrorDePanel("desconocido");
        codigo = generarCodigo();
      }
      const lote = writeBatch(db);
      if (typeof trafo !== "string") {
        lote.set(doc(db, "transformadores", transformador.id), { ...transformadorParaGuardar(transformador), creado: serverTimestamp() });
      }
      lote.set(doc(db, "seguimiento", codigo), {
        estado: "ingresado",
        equipo: transformador.equipo,
        etapas: { ingresado: Timestamp.fromDate(ingreso) },
        actualizado: serverTimestamp(),
      });
      // La empresa y el N.º de trafo se copian en la orden: el portal del cliente lee solo las órdenes. El
      // N.º T queda como estaba al ingresar, aunque después se lo cambien al transformador.
      lote.set(doc(db, "ordenes", codigo), {
        trafo: transformador.id,
        empresa: transformador.empresa,
        serie: transformador.numero,
        ...(transformador.numeroT ? { numeroTIngreso: transformador.numeroT } : {}),
        numeroOrden: datos.numeroOrden,
        ...(datos.numeroOrdenTemporal ? { numeroOrdenTemporal: true } : {}),
        ...(datos.referencia ? { referencia: datos.referencia } : {}),
        ...(datos.motivo ? { motivo: datos.motivo } : {}),
        creada: serverTimestamp(),
      });
      await lote.commit();
      const equipo = conTransformador(
        {
          codigo,
          trafo: transformador.id,
          empresa: transformador.empresa,
          estado: "ingresado",
          etapas: { ingresado: ingreso },
          actualizado: new Date(),
          equipo: transformador.equipo,
          ...datos,
          numeroTIngreso: transformador.numeroT,
        },
        transformador,
      );
      return { equipo, transformador };
    });
  }

  async crearTransformador(empresa: string, datos: DatosTransformador): Promise<Transformador> {
    const db = obtenerFirestore();
    const transformador: Transformador = { id: doc(collection(db, "transformadores")).id, empresa, ...datos };
    await guardar(() =>
      setDoc(doc(db, "transformadores", transformador.id), { ...transformadorParaGuardar(transformador), creado: serverTimestamp() }),
    );
    return transformador;
  }

  async editarEquipo(codigo: string, datos: DatosOrden): Promise<void> {
    await guardar(() =>
      updateDoc(doc(obtenerFirestore(), "ordenes", codigo), {
        numeroOrden: datos.numeroOrden,
        numeroOrdenTemporal: datos.numeroOrdenTemporal ? true : deleteField(),
        referencia: datos.referencia ?? deleteField(),
        motivo: datos.motivo ?? deleteField(),
      }),
    );
  }

  async editarTransformador(id: string, datos: DatosTransformador): Promise<void> {
    const db = obtenerFirestore();
    await guardar(async () => {
      const [ordenes, guardado] = await Promise.all([
        getDocs(query(collection(db, "ordenes"), where("trafo", "==", id))),
        getDoc(doc(db, "transformadores", id)),
      ]);
      // Si cambia el N.º T, el de antes queda anotado con la fecha (ver `conCambioDeT`).
      const anterior = guardado.exists() ? leerTransformador(id, guardado.data()) : undefined;
      const cambiosT = anterior && conCambioDeT(anterior, datos.numeroT);
      const lote = writeBatch(db);
      // `update` reemplaza la placa entera: un `set` con `merge` mezclaría la anterior y no borraría lo que se vació.
      lote.update(doc(db, "transformadores", id), {
        numero: datos.numero,
        provisorio: datos.provisorio ? true : deleteField(),
        numeroT: datos.numeroT ?? deleteField(),
        ...(cambiosT && cambiosT !== anterior.cambiosT
          ? { cambiosT: cambiosT.map((c) => ({ numeroT: c.numeroT, hasta: Timestamp.fromDate(c.hasta) })) }
          : {}),
        equipo: datos.equipo,
        uso: datos.uso ?? deleteField(),
        placa: datos.placa ?? deleteField(),
      });
      // Sus órdenes copian la descripción (la ven el cliente y cualquiera con el código) y el N.º de trafo.
      for (const orden of ordenes.docs) {
        lote.update(doc(db, "seguimiento", orden.id), { equipo: datos.equipo, actualizado: serverTimestamp() });
        lote.update(orden.ref, { serie: datos.numero });
      }
      await lote.commit();
    });
  }

  async obtenerInforme(codigo: string): Promise<InformeGuardado | null> {
    const informe = await guardar(() => getDoc(doc(obtenerFirestore(), "informes", codigo)));
    if (!informe.exists()) return null;
    const datos = informe.data();
    return {
      ...leerInforme(datos),
      actualizado: datos.actualizado instanceof Timestamp ? datos.actualizado.toDate() : null,
      por: texto(datos.por),
    };
  }

  async guardarInforme(codigo: string, informe: Informe, por: string): Promise<void> {
    // Sin `merge`: el informe se reemplaza entero, así lo que se borró en el formulario no queda guardado.
    await guardar(() =>
      setDoc(doc(obtenerFirestore(), "informes", codigo), { ...informeParaGuardar(informe), por, actualizado: serverTimestamp() }),
    );
  }

  async obtenerDatosTaller(codigo: string): Promise<DatosTallerGuardados | null> {
    const documento = await guardar(() => getDoc(doc(obtenerFirestore(), "datosTaller", codigo)));
    if (!documento.exists()) return null;
    const datos = documento.data();
    return {
      ...leerDatosTaller(datos),
      actualizado: datos.actualizado instanceof Timestamp ? datos.actualizado.toDate() : null,
      por: texto(datos.por),
    };
  }

  async guardarDatosTaller(codigo: string, datos: DatosTaller, por: string): Promise<void> {
    // Como el informe: se reemplaza entero, sin `merge`.
    await guardar(() =>
      setDoc(doc(obtenerFirestore(), "datosTaller", codigo), { ...datosTallerParaGuardar(datos), por, actualizado: serverTimestamp() }),
    );
  }

  async subirArchivo(codigo: string, archivo: File, por: string, alAvanzar: (fraccion: number) => void): Promise<ArchivoOrden> {
    const { id, ruta, url } = await pedirSubida(codigo, archivo.name);
    await enviarArchivo(url, archivo, alAvanzar);
    // Dentro de una lista no se puede usar `serverTimestamp`: la fecha es la del navegador.
    const subido = Timestamp.now();
    const anotado = { id, nombre: archivo.name, ruta, tamano: archivo.size, subido, por };
    // Si esto falla, el PDF queda en el bucket sin anotar: no se ve en ningún lado y se puede volver a subir.
    await guardar(() => updateDoc(doc(obtenerFirestore(), "ordenes", codigo), { archivos: arrayUnion(anotado) }));
    return { id, nombre: archivo.name, tamano: archivo.size, subido: subido.toDate(), por };
  }

  async cambiarBajaArchivo(codigo: string, id: string, baja: boolean): Promise<void> {
    const db = obtenerFirestore();
    const ref = doc(db, "ordenes", codigo);
    await guardar(() =>
      runTransaction(db, async (transaccion) => {
        const orden = await transaccion.get(ref);
        if (!orden.exists()) throw new ErrorDePanel("desconocido");
        // Un elemento de una lista no se cambia solo: se reescribe la lista con la baja de ese archivo.
        const archivos = (Array.isArray(orden.data().archivos) ? orden.data().archivos : []).map((a: DocumentData) => {
          if (a?.id !== id) return a;
          const { baja: _baja, ...resto } = a;
          return baja ? { ...resto, baja: Timestamp.now() } : resto;
        });
        transaccion.update(ref, { archivos });
      }),
    );
  }

  async enlaceArchivo(codigo: string, id: string): Promise<string> {
    return enlaceArchivo(codigo, id);
  }

  async crearEmpresa({ nombre, facturacion }: DatosEmpresa): Promise<Empresa> {
    const datos = facturacionParaGuardar(facturacion);
    const ref = await guardar(() =>
      addDoc(collection(obtenerFirestore(), "empresas"), { nombre, ...(datos && { facturacion: datos }), creada: serverTimestamp() }),
    );
    return { id: ref.id, nombre, facturacion: datos };
  }

  async editarEmpresa(id: string, { nombre, facturacion }: DatosEmpresa): Promise<void> {
    const datos = facturacionParaGuardar(facturacion);
    await guardar(() => updateDoc(doc(obtenerFirestore(), "empresas", id), { nombre, facturacion: datos ?? deleteField() }));
  }

  async crearCuenta(email: string, empresa: string): Promise<CuentaCliente> {
    return guardar(async () => {
      const uid = await crearUsuario(email);
      await setDoc(doc(obtenerFirestore(), "clientes", uid), { empresa, email, creada: serverTimestamp() });
      return { uid, email, empresa };
    });
  }

  async editarCuenta(uid: string, empresa: string): Promise<void> {
    await guardar(() => updateDoc(doc(obtenerFirestore(), "clientes", uid), { empresa }));
  }

  async crearPersonal(email: string, rol: RolPersonal): Promise<CuentaPersonal> {
    return guardar(async () => {
      const uid = await crearUsuario(email);
      await setDoc(doc(obtenerFirestore(), "personal", uid), { rol, email, creada: serverTimestamp() });
      return { uid, email, rol };
    });
  }

  async editarPersonal(uid: string, rol: RolPersonal): Promise<void> {
    await guardar(() => updateDoc(doc(obtenerFirestore(), "personal", uid), { rol }));
  }

  async reenviarAcceso(email: string): Promise<void> {
    await guardar(() => sendPasswordResetEmail(obtenerAuthAltas(), email));
  }

  async cambiarBaja(registro: Registro, id: string, baja: boolean): Promise<void> {
    const db = obtenerFirestore();
    const valor = { baja: baja ? serverTimestamp() : deleteField() };
    await guardar(async () => {
      if (registro !== "equipo") return updateDoc(doc(db, COLECCIONES[registro], id), valor);
      // El seguimiento esconde el código de la consulta pública; la orden, el equipo del portal del cliente.
      const lote = writeBatch(db);
      lote.update(doc(db, "seguimiento", id), valor);
      lote.update(doc(db, "ordenes", id), valor);
      await lote.commit();
    });
  }
}

/** Un transformador como está guardado. Un N.º de trafo vacío (no debería pasar) se muestra como "Sin número". */
function leerTransformador(id: string, datos: DocumentData): Transformador {
  return {
    id,
    empresa: texto(datos.empresa) ?? "",
    numero: texto(datos.numero) ?? "Sin número",
    ...(datos.provisorio === true ? { provisorio: true } : {}),
    numeroT: texto(datos.numeroT),
    cambiosT: Array.isArray(datos.cambiosT)
      ? datos.cambiosT.flatMap((c: DocumentData) => {
          const numeroT = texto(c?.numeroT);
          const hasta = fecha(c?.hasta);
          return numeroT && hasta ? [{ numeroT, hasta }] : [];
        })
      : undefined,
    equipo: texto(datos.equipo) ?? "Transformador",
    uso: esUso(datos.uso) ? datos.uso : undefined,
    placa: leerPlaca(datos.placa),
    baja: fecha(datos.baja),
  };
}

/** El transformador como se guarda: sin los campos vacíos, que Firestore no acepta como `undefined`. */
function transformadorParaGuardar(trafo: Transformador) {
  return {
    empresa: trafo.empresa,
    numero: trafo.numero,
    ...(trafo.provisorio ? { provisorio: true } : {}),
    ...(trafo.numeroT ? { numeroT: trafo.numeroT } : {}),
    equipo: trafo.equipo,
    ...(trafo.uso ? { uso: trafo.uso } : {}),
    ...(trafo.placa ? { placa: trafo.placa } : {}),
  };
}

/** Cuántas escrituras entran en un lote de Firestore (el límite es 500). */
const POR_LOTE = 450;

/**
 * Da de alta los transformadores de las órdenes que todavía no tienen uno guardado (las cargadas antes de
 * que existieran), con su chapa y sus números, y les anota el transformador. Se hace una sola vez; si no
 * se puede guardar, el panel igual carga con esa asignación y se reintenta la próxima vez.
 */
async function migrar(
  privados: Map<string, DocumentData>,
  publicos: Map<string, { publico: { equipo: string; etapas: { ingresado?: Date } } }>,
  existentes: Transformador[],
): Promise<{ nuevos: Transformador[]; asignados: Map<string, string> }> {
  const ordenes: OrdenAntigua[] = [...privados].map(([codigo, datos]) => ({
    codigo,
    trafo: texto(datos.trafo),
    empresa: texto(datos.empresa) ?? "",
    serie: texto(datos.serie),
    numeroTrafo: texto(datos.numeroTrafo),
    equipo: publicos.get(codigo)?.publico.equipo ?? "Transformador",
    uso: esUso(datos.uso) ? datos.uso : undefined,
    placa: leerPlaca(datos.placa),
    ingreso: publicos.get(codigo)?.publico.etapas.ingresado,
  }));
  const { transformadores: nuevos, asignados } = migrarTransformadores(ordenes, existentes);
  if (!nuevos.length) return { nuevos, asignados };
  const db = obtenerFirestore();
  // Primero los transformadores: una orden nunca queda apuntando a uno que no está guardado.
  const escrituras: { coleccion: "transformadores" | "ordenes"; id: string; datos: DocumentData }[] = [
    ...nuevos.map((t) => ({ coleccion: "transformadores" as const, id: t.id, datos: { ...transformadorParaGuardar(t), creado: serverTimestamp() } })),
    ...[...asignados].map(([codigo, trafo]) => ({ coleccion: "ordenes" as const, id: codigo, datos: { trafo } })),
  ];
  try {
    for (let i = 0; i < escrituras.length; i += POR_LOTE) {
      const lote = writeBatch(db);
      for (const e of escrituras.slice(i, i + POR_LOTE)) {
        if (e.coleccion === "transformadores") lote.set(doc(db, e.coleccion, e.id), e.datos);
        else lote.update(doc(db, e.coleccion, e.id), e.datos);
      }
      await lote.commit();
    }
  } catch (error) {
    console.warn("No se pudieron guardar los transformadores de las órdenes anteriores; se reintenta al volver a cargar.", error);
  }
  return { nuevos, asignados };
}

/**
 * Crea el usuario en Firebase Auth con una contraseña que nadie conoce y le envía el email para elegir la
 * suya. Devuelve su UID, para asociarle la empresa o el rol.
 */
async function crearUsuario(email: string): Promise<string> {
  const auth = obtenerAuthAltas();
  const { user } = await createUserWithEmailAndPassword(auth, email, claveInicial());
  try {
    await sendPasswordResetEmail(auth, email);
  } finally {
    await signOut(auth);
  }
  return user.uid;
}
