import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lo que antes tenía su página ahora es un paso de la hoja de la O.T. El `?codigo=` pasa solo.
  async redirects() {
    return [
      { source: "/panel/editar", destination: "/panel/equipo?paso=1", permanent: false },
      { source: "/panel/informe", destination: "/panel/equipo?paso=3", permanent: false },
      { source: "/panel/datos-taller", destination: "/panel/equipo?paso=5", permanent: false },
    ];
  },
};

export default nextConfig;
