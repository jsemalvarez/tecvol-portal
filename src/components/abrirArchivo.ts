/**
 * Abre un PDF en una pestaña nueva. La pestaña se abre en el mismo clic, antes de pedir el enlace: abierta
 * después de esperar la respuesta, el navegador la tomaría por una ventana emergente y la bloquearía. Si el
 * enlace no llega, la cierra y lanza el error.
 */
export async function abrirEnPestana(pedirEnlace: () => Promise<string>): Promise<void> {
  const pestana = window.open("", "_blank");
  if (pestana) {
    pestana.opener = null;
    pestana.document.title = "Abriendo el PDF…";
    pestana.document.body.textContent = "Abriendo el PDF…";
  }
  try {
    const enlace = await pedirEnlace();
    // Si el navegador no dejó abrir la pestaña, el PDF se abre en esta.
    if (pestana) pestana.location.href = enlace;
    else window.location.assign(enlace);
  } catch (error) {
    pestana?.close();
    throw error;
  }
}
