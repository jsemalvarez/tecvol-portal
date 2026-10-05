---
version: 1
slug: "src-app-portal-page-tsx"
primary_target: "src/app/portal/page.tsx"
related_targets: []
---

# Portal de clientes

Modo: **Herramienta** de consulta. Una tarea: saber en qué estado está cada equipo de su empresa.

## Audiencia y trabajo
- Cliente con cuenta (cooperativa, industria): entra para ver todos los equipos de su empresa en el taller, el estado de cada uno, la fecha de cada etapa y los equipos ya entregados.
- Muchas veces tiene varios equipos a la vez; los identifica por su propia referencia ("Subestación Barrio Norte") más que por el código.

## Acciones y prueba
- Solo lectura (decisión del usuario, 05/10/2026): el personal de Tecvol asigna el estado a mano y el cliente lo ve. No hay aprobación de presupuestos ni mensajes en la app; eso se arregla con el taller por fuera. Tecvol todavía no definió un cronograma de pasos propio: se usan los siete estados del sistema.
- Primero lo que espera algo del cliente (círculo azul: aprobar el presupuesto; cuadrado verde: coordinar la entrega), después lo que está en trabajo y al final el historial de entregados.
- Datos: `clientes/{uid}` asocia la cuenta con su empresa; `ordenes/{codigo}` (privada) dice de qué empresa es cada equipo, con su referencia y serie; el estado y las etapas salen de `seguimiento/{codigo}`, el mismo documento de la consulta pública. Las reglas no dejan leer órdenes de otra empresa.
- Estados: verificando y cargando (contornos punteados, nunca un estado de ejemplo), cuenta sin empresa, sin equipos, error con reintento. El personal que entra a /portal va a /panel; sin sesión, a /ingresar.

## Direction contract
THESIS: El portal es el mismo registro con el que trabaja el taller, como promete el inicio: la placa atornillada "Sus equipos" del ejemplo, ahora con los equipos reales de la empresa, una fila por equipo que se abre para mostrar sus siete etapas con fecha.
OWN-WORLD: Señalización de taller. Pared en esmalte, placas blancas atornilladas con banda acero, señales simples con su forma y color de estado, rótulos en Barlow Condensed, cifras tabulares, títulos en tinta, naranja solo para acción y marca, rojo solo para errores. Abajo, el horizonte del atardecer sobre la banda durazno, como el ingreso.
STORY: El cliente entra, lee el resumen ("6 en el taller · 2 entregados · 2 requieren su atención"), ve arriba lo que espera algo de él y abre la fila de un equipo para ver cuándo pasó cada etapa.
FIRST VIEWPORT: cabecera del ingreso (placa del logo, email y "Salir"); el nombre de la empresa en rótulo gris, "Sus equipos" en Display y la línea de conteos; desde 1024px, la placa "En el taller" en 8 columnas y "Cómo leer las señales" fija en 4.
SIGNATURE: la línea de etapas dentro de cada fila: las siete señales en fila, las pasadas en contorno, la actual encendida y las que faltan punteadas, cada una con su fecha.
FORM: elegido el 05/10/2026 entre cuatro diseños (Registro; Tablero: cada equipo como una señal en su chapa; Ficha: lista y ficha al lado; Recorrido: las siete estaciones con los equipos en cada una). El usuario eligió Registro; los otros tres y su comparador se descartaron.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones abiertas
- El panel del taller para asignar estados y asociar cuentas y órdenes; hasta entonces, carga manual en la consola de Firestore (ver README).
- Las reglas de `clientes` y `ordenes` están probadas solo en modo local; falta probarlas contra Firebase.
- Datos de contacto del taller: pendientes.
