import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { Instalar } from "@/components/Instalar";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tecvol · Reparación de transformadores",
  description:
    "Consulte el estado de su transformador en reparación con el código de seguimiento, o envíe una consulta al taller de Tecvol.",
  applicationName: "Tecvol Transformadores",
  /* Mismo logo que Monitoreo Tecvol, en la pestaña y en la app instalada. */
  icons: {
    icon: [{ url: "/icons/favicon-96x96.png", sizes: "96x96", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  /* iOS no lee el manifiesto: la app instalada desde Safari se configura acá. */
  appleWebApp: {
    capable: true,
    title: "Transformadores",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        {children}
        <Instalar />
      </body>
    </html>
  );
}
