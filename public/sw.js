/*
 * Service worker de Tecvol Transformadores.
 *
 * Escrito a mano: next-pwa depende de webpack y Next 16 compila con Turbopack.
 * No guarda páginas ni datos: el estado de una reparación cambia a mano en el taller
 * y una copia vieja mostraría un estado que ya no es. Solo guarda una página de
 * "sin conexión" para cuando la red se cae al navegar.
 */

const CACHE = "tecvol-transformadores-v1";
const SIN_CONEXION = "/sin-conexion.html";
const ARCHIVOS = [SIN_CONEXION, "/icons/android-chrome-192x192.png"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((clave) => clave !== CACHE).map((clave) => caches.delete(clave))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;

  /* El ícono de la página sin conexión sale del caché; todo lo demás va a la red. */
  if (request.method === "GET" && ARCHIVOS.includes(new URL(request.url).pathname)) {
    evento.respondWith(caches.match(request).then((guardado) => guardado || fetch(request)));
    return;
  }

  if (request.mode !== "navigate") return;

  evento.respondWith(fetch(request).catch(() => caches.match(SIN_CONEXION)));
});
