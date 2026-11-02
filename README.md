# Tecvol · Reparación de transformadores

Sistema de seguimiento de reparaciones: página pública, portal de clientes y panel del taller.
Contexto del producto en [PRODUCT.md](PRODUCT.md).

Stack: Next.js (App Router) + Tailwind CSS + Firebase plan Spark (Auth y Firestore), deploy en Vercel.

## Desarrollo

```bash
npm install
npm run dev
```

Sin variables de Firebase, en desarrollo la app usa **datos locales de prueba** (`src/lib/datos/local`): dos
empresas ficticias con sus equipos, y una cuenta por rol: administrador, jefe de taller y cliente (en
`/ingresar`; están en `src/lib/datos/local/autenticacion.ts`). Los códigos para probar la consulta aparecen en el pie del inicio.
Lo que se cambia en el panel se guarda en el navegador, así la consulta
y el portal muestran los mismos cambios; el panel tiene un enlace para volver a los datos de prueba. Las
cuentas que se crean en el panel (de clientes o del personal) no reciben email: entran con la contraseña común de
`CLAVE_CUENTAS_NUEVAS` (`src/lib/datos/local/datos.ts`), que el panel y `/ingresar` muestran. En
producción sin Firebase, la consulta y el ingreso muestran que el servicio no está habilitado, salvo que
`NEXT_PUBLIC_DATOS_DE_PRUEBA=true` pida los datos de prueba para publicar una demo.

## Firebase

1. Copiar `.env.example` a `.env.local` y completar la configuración web del proyecto.
2. Publicar las reglas de Firestore (`firestore.rules`), con la consola o con la CLI:
   `firebase deploy --only firestore:rules`.
3. Cargar en Vercel las mismas variables `NEXT_PUBLIC_*`. Hoy están solo en **Production**; en **Preview**
   queda `NEXT_PUBLIC_DATOS_DE_PRUEBA=true`, así los deploys de prueba muestran la demo. Como Next.js fija
   estas variables en el build, después de cambiarlas hay que volver a desplegar.

### Colecciones que usa la página pública

**`seguimiento/{codigo}`**: lectura pública de un código conocido (`get`), sin listado (`list`).
El ID del documento es el código de seguimiento normalizado, sin guion (por ejemplo `K7RM4XPA`).

| Campo | Tipo | Contenido |
|---|---|---|
| `estado` | string | `ingresado`, `diagnostico`, `presupuesto`, `reparacion`, `ensayos`, `listo` o `entregado` |
| `equipo` | string | Descripción básica, p. ej. `Transformador trifásico 315 kVA · 13,2/0,4 kV` |
| `etapas` | map | Fecha (timestamp) de inicio de cada etapa alcanzada, con las mismas claves que `estado` |
| `actualizado` | timestamp | Último cambio |

Solo datos públicos: nada del cliente ni presupuestos. El panel interno actualiza este documento cada vez que
cambia el estado del equipo.

**`consultas/{id}`**: cualquiera crea (las reglas validan campos y largos); solo el personal lee. No se borran.

El código de seguimiento se genera con `generarCodigo()` en `src/lib/dominio/codigo.ts`: 8 caracteres, sin
0/O/1/I/L, mostrado como `XXXX-XXXX`.

### Ingreso (Firebase Auth)

`/ingresar` usa email y contraseña. En la consola de Firebase hay que activar el proveedor
**Correo electrónico/contraseña** (Authentication → Método de acceso). La app no ofrece registro público: las
cuentas las crea un administrador desde el panel (ver más abajo).

Después de ingresar, el cliente va a `/portal` y el personal a `/panel`. El enlace "¿Olvidó su contraseña?"
envía el email de Firebase para elegir una nueva.

**Enlace para elegir la contraseña.** Vence en poco tiempo y cada email nuevo anula el anterior; Firebase no
deja alargar el plazo. Para que el cliente vea qué pasó y pida otro en el mismo lugar, el enlace lleva a
`/ingresar/clave`, una página propia: hay que configurarlo en la consola, en Authentication → Plantillas →
Restablecimiento de contraseña → editar (lápiz) → **Personalizar la URL de acción**, con
`https://<dominio de producción>/ingresar/clave`. Esa URL vale para todas las plantillas; la app solo usa la
de la contraseña. Primero hay que desplegar la página, después cambiar la URL. Con datos de prueba,
`/ingresar/clave?oobCode=VENCIDO` (o `USADO`) muestra un enlace que no sirve y cualquier otro código, uno que
sirve. Además, el administrador puede **reenviar el email de acceso** desde cada cuenta del panel.

### Personal del taller y roles

Es personal quien tenga un documento en `personal/{uid}` (el UID de su usuario de Authentication) con
`rol` y `email`, sin `baja`. Hay dos roles (`src/lib/dominio/roles.ts`; las reglas aplican lo mismo):

| Rol (`rol`) | Puede |
|---|---|
| `administrador` | Todo: equipos (alta, edición, estado, informe, baja), transformadores (alta, edición, baja), empresas, cuentas de clientes y cuentas del personal |
| `jefe-taller` | Registrar equipos y actualizarlos (datos, estado e informe), y dar de baja transformadores. No da de baja O.T. ni ve empresas o cuentas |

Las cuentas de clientes solo leen los equipos de su empresa, en el portal.

**El primer administrador se crea a mano** en la consola: el usuario en Authentication → Usuarios → Agregar
usuario, y en Firestore el documento `personal/{UID}` con `rol: "administrador"` y `email`. Desde ahí, ese
administrador da de alta al resto del personal en `/panel/personal`. Un documento de `personal` sin un `rol`
válido no entra al panel.

**Nada se borra.** Las bajas son lógicas: el documento queda con `baja` (fecha) y se puede reactivar. Un
equipo de baja desaparece del portal y de la consulta pública; una cuenta de baja no puede ingresar; una
empresa se da de baja después de dar de baja (o mover) sus cuentas. Las reglas no permiten `delete`.

### Panel del taller

En `/panel` el personal (los dos roles):

- **Asigna el estado** de cada equipo, con la fecha del cambio (hoy, si no indica otra). Puede saltear etapas
  (quedan sin fecha) o volver atrás para corregir (se borran las fechas de las etapas posteriores). Un cambio
  se puede deshacer desde el aviso que aparece abajo.
- **Corrige las fechas** de cualquier etapa ya pasada, desde la misma ventana, sin cambiar el estado ni borrar
  las otras. Las etapas salteadas pueden quedar sin fecha; el ingreso y la etapa actual, no. Las fechas tienen
  que seguir el orden del taller (dos etapas pueden empezar el mismo día), también al cambiar el estado.
- Crea **órdenes de trabajo** ("+ Nueva O.T."): cada ingreso al taller es una O.T. de un **transformador**, en
  una sola pantalla. Arriba la orden: el cliente, el N.º de O.T. (obligatorio: lo genera el sistema de gestión
  de la empresa y se usa para facturar; si todavía no llegó, el botón "Usar N.º temporal" pone uno, `TEMP-0001`,
  que queda marcado como temporal hasta que se escribe el verdadero desde "Editar"; si ya está en otra O.T.
  avisa pero deja seguir, porque varias se facturan juntas), la fecha, la referencia y el motivo del ingreso.
  Abajo el transformador: se busca entre los del cliente por N.º de trafo o N.º T (también uno que tuvo antes);
  si ya pasó por el taller se elige, y si llegó con otro N.º T se le cambia ahí mismo; si no, se da de alta con
  su chapa. La app genera el código de seguimiento, crea `seguimiento/{codigo}` y `ordenes/{codigo}` y muestra
  una **etiqueta para imprimir** con el código y un QR que abre `/seguimiento/{codigo}` (sin el N.º de O.T. si
  es temporal).
- Cada **transformador** (`transformadores/{id}`) es de un solo cliente y no cambia de dueño. Tiene su
  **N.º de trafo** (el de fábrica; obligatorio, y si no lo tiene o no se ve en la chapa, el botón "Usar N.º
  temporal" pone uno, `NT-0001`, marcado como temporal hasta que se corrige), su **N.º T** (el interno del
  cliente, opcional) y su chapa. El N.º T no se repite entre los transformadores activos de un cliente: si se
  le pone a uno el que tiene otro, se pregunta qué pasó (el cliente se lo pasó a este y aquel queda sin N.º T;
  aquel se destruyó y se da de baja; o es un error). Cada orden copia la empresa y el
  N.º de trafo (`serie`), que el portal del cliente lee sin acceder a `transformadores`, y guarda el N.º T con
  el que ingresó (`numeroTIngreso`), que no cambia aunque después se lo cambien al transformador; el
  transformador anota los N.º T que tuvo y hasta cuándo (`cambiosT`). Con eso se sigue un N.º T de un
  transformador a otro. Las órdenes cargadas antes reciben su transformador al abrir el panel
  (`migrarTransformadores`): el N.º de fabricación pasa a ser el N.º de trafo y el N.º de trafo de antes
  (`numeroTrafo`), el N.º T y el N.º T con el que ingresaron.
- La sección **Transformadores** (`/panel/transformadores`) los lista con su última O.T. y los busca también
  por un N.º T que tuvieron antes o por el N.º de cualquiera de sus O.T. Su botón "Nuevo transformador"
  (`/panel/transformador/nuevo`) da de alta uno sin O.T.: el cliente, el N.º de trafo (o uno temporal), el N.º T
  y la chapa, con aviso si el cliente ya tiene uno con el mismo N.º de trafo. La **ficha del transformador**
  (`/panel/transformador?id=`) muestra sus datos y su chapa (se editan en `/panel/transformador/editar`), todas
  sus O.T. (cada una con el N.º T con el que ingresó, si era otro), la **trazabilidad de cada N.º T** que tuvo
  (qué transformadores lo tuvieron, hasta cuándo y con qué O.T. ingresaron con él), el botón para crear su O.T.
  nueva cuando vuelve al taller y la baja (los dos roles). Por ahora la ve solo el taller.
- Abre cada **orden de trabajo** (`/panel/equipo`, tocando su N.º de O.T. en la lista): su transformador, el
  **recorrido** desde el ingreso hasta hoy, con la fecha de cada etapa y cuántos días duró (o cuántos lleva la
  actual), sus datos, las demás O.T. del transformador y todas las acciones.
- En la lista, cada fila tiene **"Cambiar estado"**, lo de todos los días, y un menú **"Más"** con el resto: la
  ficha, editar los datos, el informe, los datos del taller, la ficha del transformador y la etiqueta. Las acciones salen de un solo lugar
  (`accionesDe`, en `AccionesEquipo.tsx`): una nueva aparece en el menú y en la ficha.
- **Edita los datos** de un equipo y carga su **informe de diagnóstico**.
- **Lleva el orden de los trabajos**: la lista muestra cuántos días lleva cada equipo en el taller (desde el
  ingreso, hasta que está listo) y desde la aprobación del presupuesto (el inicio de "Reparación", mientras está
  en reparación o en ensayos). Pasado el límite, lo marca en rojo y lo cuenta arriba ("con aviso de demora"); hay
  una vista con solo esos. De entrada ordena por ingreso, el más antiguo primero; también por aprobación o por
  último cambio. Los límites (30 y 15 días por defecto) los cambia el administrador desde la lista y se guardan
  en `ajustes/avisos`. Los avisos se ven solo en el panel: no hay emails.
- Carga los **datos del taller** de cada reparación (`/panel/datos-taller`): lo que anota el taller y no va en
  el informe. Hoy, por bobina de alta y de baja, el material y la medida del alambre, las espiras y el peso del
  conductor; el aislamiento de prespan (medidas y peso), las derivaciones y los materiales. Si se suman otros
  datos del taller, van en esta misma página. En un reingreso, puede copiar los de una orden anterior del mismo
  transformador. Como el informe, solo lo ve el personal.

Solo el administrador:

- **Da de baja un equipo** desde "Editar", y lo reactiva desde la vista "Dados de baja" de la lista.
- En `/panel/empresas`, **crea, renombra y da de baja empresas y cuentas de clientes**, y pasa una cuenta a
  otra empresa. La cuenta se crea con una contraseña que nadie conoce y el cliente recibe el email de
  Firebase para elegir la suya.
- En `/panel/personal`, **crea cuentas del personal** con su rol, les cambia el rol o las da de baja. Su
  propia cuenta no la puede tocar, para no quedarse sin acceso por error.

Para que el alta de cuentas funcione, Firebase tiene que permitir crear cuentas desde la app: en Authentication
→ Configuración → Acciones del usuario, dejar marcada **Habilitar la creación (registro)**. Es gratis. La app
no muestra registro público, pero esa opción también permitiría crear una cuenta a quien use la API
directamente: esa cuenta no tendría empresa ni sería personal, así que no vería datos.

### Colecciones del portal y del panel

| Colección | Quién lee | Quién escribe | Contenido |
|---|---|---|---|
| `personal/{uid}` | El administrador; cada uno, el suyo | El administrador (no el suyo) | `rol`, `email` y `baja` (opcional) |
| `empresas/{id}` | El personal; cada cliente, la suya | El administrador | `nombre`: como lo ve el cliente en su portal; `baja` |
| `clientes/{uid}` | El administrador; cada cliente, la suya | El administrador | `empresa` (el ID de `empresas`), `email` y `baja` |
| `ordenes/{codigo}` | El personal; cada cliente, las de su empresa | El personal | `empresa`, `trafo`, `referencia`, `serie`, `numeroOrden`, `numeroOrdenTemporal`, `numeroTIngreso` (antes `numeroTrafo`), chapa, `archivos` (los PDF, ver abajo)… y `baja` |
| `informes/{codigo}` | El personal | El personal | Informe de diagnóstico |
| `datosTaller/{codigo}` | El personal | El personal | Datos del taller: bobinado (alambre, espiras, peso), prespan, derivaciones y materiales |
| `ajustes/avisos` | El personal | El administrador | `ingreso` y `aprobacion`: días (enteros, de 1 a 365) antes del aviso de demora |

El estado y las etapas viven solo en `seguimiento/{codigo}`: el panel lo escribe y el portal y la consulta
pública lo leen. Solo el personal recorre `seguimiento` entera; las reglas validan que el estado sea uno de
la lista. En `seguimiento` y `ordenes`, solo el administrador pone o saca `baja`; en `transformadores`, los
dos roles.

El portal es de consulta: el cliente ve los equipos de su empresa, el estado de cada uno, la fecha de cada
etapa y los entregados. Con "Compartir seguimiento" le pasa un equipo a otra persona (un operario, por
ejemplo): la misma etiqueta con QR del panel y el enlace a `/seguimiento/{codigo}`, que en el celular se
manda con el menú de compartir del teléfono. No aprueba presupuestos ni manda mensajes desde la app; eso se arregla con el taller.
Una cuenta sin `clientes/{uid}` entra al portal y ve el aviso de que todavía no está asociada a una empresa.

### App Check (opcional)

Si `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` tiene una clave de reCAPTCHA v3, la app inicializa App Check. Protege
la cuota gratuita de lecturas frente a bots. **Pendiente:** registrar la clave y activar la verificación
obligatoria de Firestore en la consola. En localhost, `NEXT_PUBLIC_APPCHECK_DEBUG=true` imprime un token de
depuración en la consola del navegador.

## PDF de las órdenes (Supabase Storage)

En la ficha de cada O.T., el personal (los dos roles) arrastra PDF a un recuadro o los elige; el cliente de
la empresa los ve y los abre en su portal, dentro de la O.T. Hasta 50 MB cada uno, el máximo del plan gratis.
Uno subido por error se da de baja: el cliente deja de verlo y el archivo queda guardado.

Firebase Storage necesita el plan Blaze (con tarjeta), así que los archivos van al bucket privado `ordenes`
del proyecto `tecvol-portal` de Supabase (São Paulo, plan Free: 1 GB en total). El bucket se crea con
`supabase/migrations/20261101213900_bucket_ordenes.sql` y no tiene políticas: nadie llega con la clave
pública. Las rutas `/api/archivos/subida` y `/api/archivos/enlace` (`src/lib/servidor/archivos.ts`) leen la
orden de Firestore con el token del usuario, así deciden las mismas reglas, y con la clave secreta entregan un
enlace firmado: el navegador sube y abre el PDF directo en Supabase. La orden guarda en `archivos` el id, el
nombre, el tamaño, quién lo subió, la fecha, la ruta en el bucket (`{codigo}/{id}/{nombre}.pdf`) y la baja.

Variables, solo del servidor (en Vercel, en Production; en local, en `.env.local`):

- `SUPABASE_URL`: Supabase → Project Settings → Data API → Project URL.
- `SUPABASE_SECRET_KEY`: Supabase → Project Settings → API Keys → Secret keys. Nunca con `NEXT_PUBLIC_`.

Cuidados del plan Free: el proyecto se pausa si pasa una semana casi sin actividad (Supabase avisa por email
una semana antes; se reactiva desde el panel de Supabase) y la cuenta admite dos proyectos activos gratis. Si
algún día se activa la verificación obligatoria de App Check en Firestore, las rutas dejan de poder leer las
órdenes: habría que mandarles también el token de App Check. Con datos de prueba, los PDF quedan en IndexedDB
de ese navegador.

## Acceso a datos

Los componentes no usan Firebase directamente: pasan por los repositorios de `src/lib/datos/repositorios.ts`.
Para migrar a Supabase/Postgres alcanza con una nueva implementación de esas interfaces.
