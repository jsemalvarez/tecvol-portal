/**
 * Código de seguimiento público: aleatorio, separado del N.º de orden,
 * corto y fácil de dictar por teléfono. Sin caracteres que se confunden
 * al leerlos o dictarlos (0/O, 1/I/L).
 */
export const ALFABETO_CODIGO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const LARGO_CODIGO = 8;

const CONFUSOS = /[01IOL]/;

/** Mayúsculas y sin separadores: "k7rm 4xpa" → "K7RM4XPA". */
export function normalizarCodigo(entrada: string): string {
  return entrada.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

/** "K7RM4XPA" → "K7RM-4XPA". Acepta códigos incompletos mientras se escriben. */
export function formatearCodigo(codigo: string): string {
  const limpio = normalizarCodigo(codigo).slice(0, LARGO_CODIGO);
  const mitad = LARGO_CODIGO / 2;
  return limpio.length > mitad ? `${limpio.slice(0, mitad)}-${limpio.slice(mitad)}` : limpio;
}

export type ValidacionCodigo =
  | { ok: true; codigo: string }
  | { ok: false; motivo: "vacio" | "largo" | "confusos" | "invalidos" };

export function validarCodigo(entrada: string): ValidacionCodigo {
  const codigo = normalizarCodigo(entrada);
  if (codigo.length === 0) return { ok: false, motivo: "vacio" };
  if (CONFUSOS.test(codigo)) return { ok: false, motivo: "confusos" };
  if (codigo.length !== LARGO_CODIGO) return { ok: false, motivo: "largo" };
  for (const caracter of codigo) {
    if (!ALFABETO_CODIGO.includes(caracter)) return { ok: false, motivo: "invalidos" };
  }
  return { ok: true, codigo };
}

/** Genera un código nuevo con el generador criptográfico del navegador o de Node. */
export function generarCodigo(): string {
  const base = ALFABETO_CODIGO.length;
  const limite = 256 - (256 % base);
  let codigo = "";
  while (codigo.length < LARGO_CODIGO) {
    const bytes = crypto.getRandomValues(new Uint8Array(LARGO_CODIGO * 2));
    for (const byte of bytes) {
      if (byte < limite && codigo.length < LARGO_CODIGO) codigo += ALFABETO_CODIGO[byte % base];
    }
  }
  return codigo;
}
