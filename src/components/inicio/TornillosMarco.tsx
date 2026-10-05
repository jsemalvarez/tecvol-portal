/** Los cuatro tornillos de una placa (marco), uno por esquina. */
export function TornillosMarco() {
  return (
    <>
      {["si", "sd", "ii", "id"].map((esquina) => (
        <span key={esquina} aria-hidden="true" className="marco-tornillo" data-esquina={esquina} />
      ))}
    </>
  );
}
