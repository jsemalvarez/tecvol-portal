/**
 * Datos de una empresa para emitir el certificado y la factura. Todos son opcionales: el taller los
 * completa cuando los tiene. Viven en `empresas/{id}.facturacion`, que también lee el cliente de la empresa.
 */
export interface Facturacion {
  razonSocial?: string;
  /** Los 11 dígitos, sin guiones ni barras. Se muestra como 30-54574456-9. */
  cuit?: string;
  domicilio?: string;
  /** Texto libre: varios números, fax, guardia… */
  telefonos?: string;
  /** Inicio de actividades, como el valor de un campo de fecha ("1956-08-05"). */
  inicioActividades?: string;
}

export const CAMPOS_FACTURACION = ["razonSocial", "cuit", "domicilio", "telefonos", "inicioActividades"] as const;

/** Largos máximos de los textos libres. Los mismos que en firestore.rules. */
export const LARGOS_FACTURACION = { razonSocial: 160, domicilio: 200, telefonos: 200 } as const;

const PESOS_CUIT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Lo que se escribió en el CUIT, solo los dígitos: acepta 30-54574456-9, 30-54574456/9 o 30545744569. */
export function digitosCuit(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** 11 dígitos y el último coincide con el dígito verificador. */
export function cuitValido(digitos: string): boolean {
  if (!/^\d{11}$/.test(digitos)) return false;
  const suma = PESOS_CUIT.reduce((total, peso, i) => total + peso * Number(digitos[i]), 0);
  const verificador = (11 - (suma % 11)) % 11;
  return verificador < 10 && verificador === Number(digitos[10]);
}

/** 30-54574456-9. */
export function formatearCuit(digitos: string): string {
  return /^\d{11}$/.test(digitos) ? `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}` : digitos;
}

/** Solo los campos con algo escrito; `undefined` si no queda ninguno. */
export function facturacionParaGuardar(facturacion: Facturacion | undefined): Facturacion | undefined {
  if (!facturacion) return undefined;
  const llenos = Object.fromEntries(
    CAMPOS_FACTURACION.flatMap((campo) => {
      const valor = facturacion[campo]?.trim();
      return valor ? [[campo, valor]] : [];
    }),
  ) as Facturacion;
  return Object.keys(llenos).length > 0 ? llenos : undefined;
}

/** Lee lo guardado en Firestore, sin confiar en su forma. */
export function leerFacturacion(valor: unknown): Facturacion | undefined {
  if (!valor || typeof valor !== "object") return undefined;
  const datos = valor as Record<string, unknown>;
  return facturacionParaGuardar(
    Object.fromEntries(CAMPOS_FACTURACION.map((campo) => [campo, typeof datos[campo] === "string" ? datos[campo] : undefined])) as Facturacion,
  );
}
