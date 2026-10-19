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
| `administrador` | Todo: equipos (alta, edición, estado, informe, baja), empresas, cuentas de clientes y cuentas del personal |
| `jefe-taller` | Registrar equipos y actualizarlos (datos, estado e informe). No da de baja ni ve empresas o cuentas |

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
- **Registra equipos**: primero el N.º de orden de Punto Técnico (obligatorio; si ya está en otro equipo, avisa
  pero deja seguir, porque una orden puede incluir varios), la empresa dueña, la referencia del cliente y la chapa. La app genera
  el código de seguimiento, crea `seguimiento/{codigo}` y `ordenes/{codigo}` y muestra una **etiqueta para
  imprimir** con el código y un QR que abre `/seguimiento/{codigo}`.
- **Reconoce los reingresos** por el N.º de trafo (opcional, después del N.º de orden): si ese número ya pasó
  por el taller, muestra el **historial del trafo** (cada reparación con su orden, fechas, estado, datos e
  informe) y, al registrar, deja **usar los datos** de una reparación anterior para no copiar la chapa de nuevo.
  Cada reparación sigue siendo un equipo con su propio código y su propia chapa; el historial se arma juntando
  las que tienen el mismo N.º de trafo, sin una colección aparte. Lo ve solo el taller.
- **Edita los datos** de un equipo y carga su **informe de diagnóstico**.

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
| `ordenes/{codigo}` | El personal; cada cliente, las de su empresa | El personal | `empresa`, `referencia`, `serie`, `numeroOrden`, `numeroTrafo`, chapa… y `baja` |
| `informes/{codigo}` | El personal | El personal | Informe de diagnóstico |

El estado y las etapas viven solo en `seguimiento/{codigo}`: el panel lo escribe y el portal y la consulta
pública lo leen. Solo el personal recorre `seguimiento` entera; las reglas validan que el estado sea uno de
la lista. En `seguimiento` y `ordenes`, solo el administrador pone o saca `baja`.

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

## Acceso a datos

Los componentes no usan Firebase directamente: pasan por los repositorios de `src/lib/datos/repositorios.ts`.
Para migrar a Supabase/Postgres alcanza con una nueva implementación de esas interfaces.
