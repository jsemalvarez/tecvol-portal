---
version: 1
slug: "src-app-ingresar-page-tsx"
primary_target: "src/app/ingresar/page.tsx"
related_targets: ["src/app/portal/page.tsx","src/app/panel/page.tsx"]
---

# Ingreso al portal y al panel

Modo: **Herramienta**. Una sola tarea: entrar con la cuenta que dio el taller.

## Audiencia y trabajo
- Cliente con cuenta (empresa registrada por el taller): entra para ver sus equipos, presupuestos e historial en `/portal`.
- Personal del taller: entra al panel en `/panel`. El rol lo decide el documento `personal/{uid}`, no el formulario.
- Quien no tiene cuenta: no hay alta pública. La página explica que las cuentas las crea el taller, lleva al formulario de consulta y a la consulta por código sin ingresar.

## Acciones y prueba
- Primaria: "Ingresar" (email y contraseña, Firebase Auth detrás de la capa de datos; en modo local, dos cuentas de prueba que se muestran en un recuadro punteado). Secundaria: "¿Olvidó su contraseña?", cuyo aviso nunca dice si el email tiene cuenta.
- Con la sesión abierta, en lugar del formulario: "Ya ingresó como…", ir al portal o al panel, o salir.
- `/portal` y `/panel` son provisorias: "Ingresó como", el título, la tarjeta de bloqueo "En preparación" y "Salir". Sin sesión vuelven a `/ingresar`; con la sesión del otro rol, van a su destino.
- Sin indexar (noindex en las tres rutas).

## Direction contract
THESIS: El acceso es la misma pared al atardecer: el formulario solo, impreso sobre el esmalte, sin placa ni marco, y abajo el horizonte del pie del inicio. Nada compite con los dos renglones y la placa naranja.
OWN-WORLD: Señalización de taller, como el inicio. Esmalte de fondo, títulos en tinta, rótulos en Barlow Condensed, renglones de acero que pasan a tinta al enfocar, naranja solo para la acción, el dibujo y los subrayados, rojo solo para errores, durazno para la banda de abajo. El logo va en su placa blanca y lleva al inicio.
STORY: Quien tiene cuenta escribe dos datos y entra. Quien no, lee abajo por qué y adónde ir, sin que esa explicación ocupe el formulario.
FIRST VIEWPORT: cabecera (placa del logo, "Reparación de transformadores" desde 640px, "Volver al inicio" o "Salir"); una columna centrada de 34rem con el rótulo gris "Portal de clientes · Panel del taller", "Ingresar" en Display (3rem, 4rem desde 640px) y el formulario; el dibujo del atardecer a todo el ancho (110px, 150px desde 640px) sobre una banda durazno con "¿No tiene cuenta?" y, en modo local, las cuentas de prueba. En `/portal` y `/panel` la columna es de 44rem y la banda queda como una franja de suelo de 32px.
SIGNATURE: el horizonte del pie del inicio, con el sol poniéndose, cierra también el acceso: la misma línea rural une la página pública con la de ingreso.
FORM: elegido el 05/10/2026 entre cuatro variantes (Pliego: como el hero, con marcas de corte y el dibujo del taller; Placa: una placa atornillada centrada; Durazno: panel con lo que ofrece el portal y el formulario en una chapa; Atardecer). El usuario eligió Atardecer; las otras variantes, su comparador y la hoja enmarcada anterior de /ingresar se descartaron.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones abiertas
- Configurar Firebase Auth (email y contraseña, sin alta pública) y desplegar la regla de `personal/{uid}`.
- El contenido real del portal y del panel: próxima etapa.
- Datos de contacto del taller: pendientes.
