/** Diseños del panel en comparación. Temporal: se borra al elegir uno. */
export const ESTILOS_PANEL = [
  { id: "planilla", nombre: "Planilla" },
  { id: "etapas", nombre: "Etapas" },
  { id: "mesa", nombre: "Mesa" },
] as const;

export type EstiloPanel = (typeof ESTILOS_PANEL)[number]["id"];
