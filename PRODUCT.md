# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Next.js (App Router) + Tailwind CSS.
- Firebase en plan Spark (gratuito): Firebase Auth con email y contraseña, Firestore como base de datos.
- Deploy en Vercel.
- Restricción de costo: nada que genere gastos. No se usan Firebase Storage ni Cloud Functions (requieren plan Blaze).
- Toda la lógica de acceso a datos vive en una capa aparte (repositorios o servicios). Los componentes nunca hablan con Firebase directamente, para poder migrar después a Supabase/Postgres sin tocarlos.

## Users

**Clientes.** Ingenieros y jefes de mantenimiento de cooperativas eléctricas, distribuidoras e industrias (pesqueras, frigoríficos, plantas) que dejaron un transformador a reparar en Tecvol. Llegan con una pregunta concreta: en qué estado está mi equipo, cuándo lo tengo y si tengo que aprobar algo. Entran muchas veces desde el celular, en planta o en campo, y quieren el dato en segundos.

**Personal de Tecvol.** Técnicos y administración del taller. Usan el panel interno todos los días desde la PC del taller para cargar ingresos, actualizar estados y cargar novedades y presupuestos. Necesitan rapidez y poca fricción.

## Product Purpose

Sistema de seguimiento de reparaciones de transformadores para el área nueva de reparación de Tecvol. Tiene dos partes:

1. **Portal de clientes.** Cada empresa ve el estado de sus equipos en reparación, una línea de tiempo con novedades, y aprueba presupuestos online. Más adelante también descargará los protocolos de ensayo y el historial de cada equipo.
2. **Panel interno del taller.** Alta de clientes, ingreso de transformadores con sus datos de placa, tablero por estados, y carga de novedades y presupuestos.

El sistema funciona si cumple con estos tres objetivos confirmados:

- **Menos llamadas y WhatsApp.** El cliente consulta el estado por su cuenta, sin preguntarle al taller.
- **Trazabilidad por equipo.** Cada transformador tiene su historial de estados, novedades y presupuestos, útil para auditorías o reclamos.
- **Imagen profesional.** El área nueva tiene que percibirse seria y confiable frente a talleres con más trayectoria.

Alcance actual: una demo funcional completa, no un prototipo con datos fijos.

## Positioning

En vez de dar el estado del equipo por teléfono, Tecvol le muestra al cliente el registro vivo de cada reparación, desde el ingreso hasta la entrega. El mismo registro que usa el taller para trabajar es el que ve el cliente. Lo que el cliente ve es lo que el taller cargó y nada más, así que la confianza sale de la transparencia y no de lo que la empresa diga de sí misma.

## Operating Context

- **Flujo de reparación.** Estados fijos, en este orden: Ingresado → Diagnóstico → Presupuesto → Reparación → Ensayos finales → Listo → Entregado.
- **Presupuesto.** El taller lo carga como texto y el cliente lo aprueba online desde el portal.
- **Informe de diagnóstico.** Después de desarmar el equipo, el jefe del taller anota la inspección visual (cada parte OK, Regular o Mal y si hay que reparar o cambiar), la resistencia de aislamiento y la relación de transformación, como en su planilla de papel. Quien cotiza usa ese informe. Se descarga en PDF con la grilla de esa planilla (con la chapa y lugar para las firmas), para imprimirlo o mandarlo. Por ahora es solo para el taller; el cliente no lo ve.
- **Orden de los trabajos.** Pedido del cliente: que el sistema avise por fecha de ingreso o de aprobación del presupuesto. La lista del panel muestra los días de cada equipo en el taller y desde la aprobación (se toma el inicio de "Reparación"), marca los que pasaron el límite y ordena del más antiguo al más nuevo. Los límites los ajusta el administrador (30 y 15 días por defecto). Los avisos son solo dentro del panel, sin costo.
- **Datos del taller.** Pedido del jefe de taller: por cada reparación, lo que anota el taller y no va en el informe. Hoy, la medida y el material del alambre, las espiras y el peso del conductor de cada bobina (alta y baja), el aislamiento de prespan (medidas y peso), la cantidad de derivaciones y los materiales usados. Se llama "datos del taller" y no "bobinado" para que los datos que se sumen después entren en la misma página. Es conocimiento del taller: solo lo ve el personal, nunca el cliente. En un reingreso se parte de los datos anteriores.
- **Novedades.** Actualizaciones en texto que el taller carga sobre un equipo. Aparecen en la línea de tiempo del cliente.
- **Ingreso.** El transformador se registra con los datos de su chapa (placa de características), en el mismo orden en que figuran en ella. El trabajo empieza con la orden de trabajo de Punto Técnico: su número es lo primero que se carga, y es obligatorio. El sistema no numera órdenes; guarda ese número y avisa si ya está en otro equipo (una orden puede incluir más de uno). Después va el N.º de trafo: si ese trafo ya pasó por el taller, es un **reingreso** y el panel muestra su historial y deja reusar los datos de una reparación anterior. El historial lo ve solo el taller; un flujo distinto para los reingresos (garantía, por ejemplo) queda para más adelante.
- **Contextos de uso.** Clientes desde el celular, en planta o en campo, con una sola pregunta y poco tiempo. El personal trabaja en la PC del taller, varias veces al día.
- **Servicios de Tecvol sobre transformadores:** reparación / rebobinado, mantenimiento y ensayos. Tecvol no fabrica, vende ni alquila equipos.

## Capabilities and Constraints

**Confirmado para la demo:**
- El personal de Tecvol da de alta clientes (empresas) e ingresa transformadores con sus datos de placa.
- El personal cambia estados, carga novedades y carga presupuestos (como texto).
- El cliente aprueba presupuestos online.
- Cada cliente ve en su portal solo sus propios equipos. El aislamiento entre clientes tiene que estar garantizado a nivel de datos (reglas de seguridad de Firestore), no solo ocultado en la interfaz, porque no hay backend propio que lo controle.
- Autenticación por email y contraseña.
- **Consulta pública de estado sin login**, con un código de seguimiento. Muestra solo el estado y la fecha; el presupuesto, el historial y los detalles quedan detrás del login.
- **Código de seguimiento:** aleatorio y separado del N.º de orden, para que nadie pueda probar números y ver equipos ajenos. Es corto y fácil de dictar por teléfono: de 6 a 8 caracteres, sin caracteres que se confundan (O/0, I/1).
- **QR de seguimiento:** se genera en el navegador con una librería gratuita y se muestra en la vista de ingreso del panel interno, con opción de imprimir la orden de ingreso. El QR abre directamente el estado del equipo.
- **Formulario de consulta** en la página pública para clientes potenciales. Las consultas se guardan en Firestore y aparecen en una bandeja del panel interno.

**Previsto pero no disponible todavía:** subida de archivos, fotos y PDFs (protocolos de ensayo, fotos del equipo, presupuestos en PDF). La interfaz reserva su lugar y lo marca como "próximamente".

**Decisiones abiertas:**
- Los datos de la chapa se tomaron de una chapa real y de la planilla de ejemplo del taller, que todavía va a cambiar.
- Si técnicos y administración tienen permisos distintos en el panel interno.
- Si una empresa cliente puede tener más de un usuario.
- Cómo se comunica una fecha estimada de entrega (el cliente pregunta "cuándo lo tengo", pero el dato no está definido).
- Si hay notificaciones (por email u otro canal) ante cambios de estado o presupuestos pendientes. Hoy no hay ninguna confirmada, y cualquier opción tiene que funcionar sin costo.
- Qué pasa cuando el cliente no aprueba un presupuesto (rechazo, observaciones, renegociación).

## Brand Commitments

- Nombre: **Tecvol**. El área es "reparación de transformadores" de Tecvol.
- Idioma de la interfaz: español (Argentina).
- Trato: **usted** en los textos; tono impersonal en botones y etiquetas, como en la señalización de planta ("Consultar estado", "Ingresar").
- **Logo oficial de Tecvol:** isotipo naranja con "TEC" en gris y "VOL" en naranja, y la bajada "Ingeniería electromecánica". Archivo: `public/marca/tecvol-logo.png` (PNG 1600×379, descargado de tecvol.com.ar con autorización). Se usa tal cual, sobre fondo claro; no se redibuja.
- **Colores de marca**, tomados del logo y de tecvol.com.ar: naranja `#FF8929`, gris `#747478` y gris oscuro `#5C5C5C`. El usuario pidió sumarlos a esta área conservando el fondo claro.
- El naranja de marca nunca significa un estado de reparación: es color de marca y de acción.
- Sitio institucional: https://tecvol.com.ar/

## Evidence on Hand

Disponible: el logo oficial (`public/marca/tecvol-logo.png`) y, fuera del repositorio (`referencias/taller/`, ignorada por git), la planilla de entrada de ejemplo del taller, la foto de una chapa real y las transcripciones de los audios del jefe del taller.

El área es nueva. No hay fotos del taller o de equipos, modelos de protocolo de ensayo, presupuesto, clientes con nombre, testimonios ni métricas.

Pendientes, sin inventar:
- **Datos de contacto** del taller (teléfono, email, dirección).
- **Detalles técnicos del servicio** (rango de potencias y tensiones, tipos de transformador que se reparan).

Hasta que lleguen, se muestran marcados como pendientes.

El trabajo futuro no debe fabricar nada de esto:
- Los datos de demo (empresas, equipos, números de serie) tienen que ser ficticios y reconocibles como tales, nunca presentados como clientes reales.
- No se inventan certificaciones, normas cumplidas, años de trayectoria, cantidad de equipos reparados ni tiempos promedio.
- Los lugares para fotos y documentos se muestran como "próximamente", sin imágenes ni archivos falsos.

## Product Principles

1. **El estado, en segundos.** La primera pantalla del cliente responde tres preguntas: en qué estado está mi equipo, cuándo lo tengo y si tengo que aprobar algo. Lo demás queda en segundo plano.
2. **Cargar tiene que costar menos que mandar un WhatsApp.** Si actualizar el sistema es más lento que avisar por teléfono, el portal queda desactualizado y los clientes vuelven a llamar. La velocidad del panel interno es una condición para que el portal sirva.
3. **Cada equipo, una historia completa.** Cada cambio de estado, novedad y presupuesto queda fechado y asociado a su transformador. Ese historial es el producto, no un extra.
4. **Seriedad que se demuestra, no que se declara.** La imagen profesional sale de la precisión, la consistencia y el cumplimiento de lo prometido, nunca de afirmaciones sin respaldo.
5. **Honestidad sobre lo que todavía no existe.** Las funciones pendientes se muestran como pendientes. Una demo que simula lo que no hace contradice el principio anterior.
