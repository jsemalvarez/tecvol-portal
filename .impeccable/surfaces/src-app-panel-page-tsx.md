---
version: 1
slug: "src-app-panel-page-tsx"
primary_target: "src/app/panel/page.tsx"
related_targets: ["src/app/panel/empresas/page.tsx"]
---

# Panel del taller

Modo: **Herramienta** de trabajo diario para el personal de Tecvol.

## Audiencia y trabajo
- Personal del taller (cuentas con `personal/{uid}`): asigna a mano el estado de cada equipo, registra los equipos que entran, corrige datos e imprime la etiqueta con el código y el QR.
- También crea las empresas clientes y las cuentas con las que esas empresas entran al portal.
- Tecvol todavía no definió un cronograma propio: se usan los siete estados del sistema y el personal puede saltear etapas o volver atrás para corregir.

## Acciones y prueba
- Primaria: "Cambiar estado" (fecha de hoy por defecto, nunca futura; deshacer desde el aviso). Secundarias: "Registrar equipo" (genera el código, crea `seguimiento` y `ordenes`, muestra la etiqueta), "Editar", "Etiqueta"; en Empresas y cuentas, "Nueva empresa" y "Agregar cuenta" (crea la cuenta en Firebase Auth con una segunda instancia en memoria y envía el email para elegir la contraseña).
- Lo que se carga lo ve el cliente en su portal y cualquiera con el código en la consulta pública; la banda de abajo lo recuerda.
- Con datos de prueba (desarrollo o `NEXT_PUBLIC_DATOS_DE_PRUEBA`), los cambios se guardan en el navegador y hay un enlace para volver a los datos de prueba.

## Direction contract
THESIS: El panel es el registro del taller: una planilla atornillada con todos los equipos, del último que cambió al primero, con búsqueda y filtros, y en cada fila la acción de cambiar el estado.
OWN-WORLD: Señalización de taller. Pared en esmalte, placas blancas atornilladas con banda acero, señales simples con forma y color de estado, rótulos en Barlow Condensed, renglones de acero, naranja solo para la acción, el subrayado de los enlaces y la pestaña actual; rojo solo para errores. Abajo, el horizonte del atardecer sobre la banda durazno, como el ingreso y el portal.
STORY: El personal entra, busca o filtra, cambia el estado de un equipo con dos clics y, si se equivoca, lo deshace; registra un equipo nuevo e imprime su etiqueta para la orden de ingreso.
FIRST VIEWPORT: cabecera (logo, email, "Salir"); pestañas "Equipos · Empresas y cuentas"; "Panel del taller" en rótulo gris, "Equipos" en Display y "Registrar equipo" a la derecha; la línea de conteos; la barra de búsqueda y filtros; la placa con la tabla.
SIGNATURE: la etiqueta del equipo con el QR a la consulta pública, que se imprime sola, sin el resto de la página.
FORM: elegido el 05/10/2026 entre tres diseños de la lista de equipos (Planilla; Etapas: una columna por etapa con "Pasar a…"; Mesa: lista y equipo elegido al lado). El usuario eligió Planilla; los otros dos y su comparador se descartaron.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones abiertas
- Las reglas y el alta de cuentas están probados solo con datos de prueba; falta probarlos contra el proyecto de Firebase.
- Para el alta de cuentas, Firebase tiene que permitir crear cuentas desde la app (Authentication → Configuración → Acciones del usuario).
- Borrar equipos o empresas no está previsto todavía.
