/** Íconos de interfaz con el mismo trazo que los pictogramas de las señales. */

export function Flecha({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d="M4 12 H19 M13 6 L19 12 L13 18" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Alerta({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="11" fill="var(--color-rojo)" />
      <path d="M12 6.5 V13.5" stroke="var(--color-esmalte)" strokeWidth={2.75} strokeLinecap="round" />
      <circle cx="12" cy="17.25" r="1.6" fill="var(--color-esmalte)" />
    </svg>
  );
}
