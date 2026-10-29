import type { MetadataRoute } from "next";

/*
 * Manifiesto de instalación. Los íconos son los mismos de Monitoreo Tecvol: la empresa
 * tiene una sola marca de app. El nombre corto, debajo del ícono, dice cuál de los servicios es
 * (Android corta a unos 12 caracteres: "Tecvol" no entraría).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tecvol · Reparación de transformadores",
    short_name: "Transformadores",
    description:
      "Consulte el estado de su transformador en reparación con el código de seguimiento, o envíe una consulta al taller de Tecvol.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    /* El fondo de los íconos: la pantalla de arranque no muestra un borde alrededor del logo. */
    background_color: "#0e1114",
    theme_color: "#1a1a1a",
    lang: "es-AR",
    dir: "ltr",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icons/favicon-96x96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      /* Archivo aparte para el recorte a círculo: el disco va al 72 % del lado. */
      { src: "/icons/maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
