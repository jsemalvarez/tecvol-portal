/** Marcas de corte en las cuatro esquinas, como en un pliego impreso. El contenedor tiene que ser `relative`. */
export function MarcasDeCorte() {
  const base = "pointer-events-none absolute size-5 border-acero";
  return (
    <>
      <span aria-hidden="true" className={`${base} left-4 top-4 border-l-[1.5px] border-t-[1.5px] sm:left-6 sm:top-6`} />
      <span aria-hidden="true" className={`${base} right-4 top-4 border-r-[1.5px] border-t-[1.5px] sm:right-6 sm:top-6`} />
      <span aria-hidden="true" className={`${base} bottom-4 left-4 border-b-[1.5px] border-l-[1.5px] sm:bottom-6 sm:left-6`} />
      <span aria-hidden="true" className={`${base} bottom-4 right-4 border-b-[1.5px] border-r-[1.5px] sm:bottom-6 sm:right-6`} />
    </>
  );
}
