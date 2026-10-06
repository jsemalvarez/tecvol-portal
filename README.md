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
empresas ficticias con sus equipos, y una cuenta de cliente y una del personal (en `/ingresar`; están en
`src/lib/datos/local/autenticacion.ts`). Los códigos para probar la consulta aparecen en el pie del inicio.
Lo que se cambia en el panel se guarda en el navegador, así la consulta
y el portal muestran los mismos cambios; el panel tiene un enlace para volver a los datos de prueba. En
producción sin Firebase, la consulta y el ingreso muestran que el servicio no está habilitado, salvo que
`NEXT_PUBLIC_DATOS_DE_PRUEBA=true` pida los datos de prueba para publicar una demo.

## Firebase

1. Copiar `.env.example` a `.env.local` y completar la configuración web del proyecto.
2. Publicar las reglas de Firestore (`firestore.rules`), con la consola o con la CLI:
   `firebase deploy --only firestore:rules`.
3. Cargar en Vercel las mismas variables `NEXT_PUBLIC_*`.

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

**`consultas/{id}`**: cualquiera crea (las reglas validan campos y largos); solo el personal lee.

El código de seguimiento se genera con `generarCodigo()` en `src/lib/dominio/codigo.ts`: 8 caracteres, sin
0/O/1/I/L, mostrado como `XXXX-XXXX`.

### Ingreso (Firebase Auth)

`/ingresar` usa email y contraseña. En la consola de Firebase hay que activar el proveedor
**Correo electrónico/contraseña** (Authentication → Método de acceso). La app no ofrece registro público: las
cuentas de clientes las crea el personal desde el panel (ver más abajo).

Después de ingresar, el cliente va a `/portal` y el personal a `/panel`. El enlace "¿Olvidó su contraseña?"
envía el email de Firebase para elegir una nueva.

### Personal del taller

Es personal quien tenga un documento en `personal/{uid}`, con el UID de su usuario de Authentication (el
contenido puede ser, por ejemplo, `{ nombre: "..." }`). Se crea a mano en la consola: el usuario en
Authentication → Usuarios → Agregar usuario, y el documento en Firestore. Las reglas dejan que cada usuario lea
solo su propio documento, para que la app sepa si va al panel; nadie puede listar ni escribir la colección
desde la app.

### Panel del taller

En `/panel` el personal:

- **Asigna el estado** de cada equipo, con la fecha del cambio (hoy, si no indica otra). Puede saltear etapas
  (quedan sin fecha) o volver atrás para corregir (se borran las fechas de las etapas posteriores). Un cambio
  se puede deshacer desde el aviso que aparece abajo.
- **Registra equipos**: la empresa dueña, la descripción, la referencia del cliente y la serie. La app genera
  el código de seguimiento, crea `seguimiento/{codigo}` y `ordenes/{codigo}` y muestra una **etiqueta para
  imprimir** con el código y un QR que abre `/seguimiento/{codigo}`.
- **Edita los datos** de un equipo.
- En `/panel/empresas`, **crea empresas y cuentas de clientes**. La cuenta se crea con una contraseña que
  nadie conoce y el cliente recibe el email de Firebase para elegir la suya.

Para que el alta de cuentas funcione, Firebase tiene que permitir crear cuentas desde la app: en Authentication
→ Configuración → Acciones del usuario, dejar marcada **Habilitar la creación (registro)**. Es gratis. La app
no muestra registro público, pero esa opción también permitiría crear una cuenta a quien use la API
directamente: esa cuenta no tendría empresa ni sería personal, así que no vería datos.

### Colecciones del portal y del panel

| Colección | Quién lee | Contenido |
|---|---|---|
| `empresas/{id}` | El personal; cada cliente, la suya | `nombre`: como lo ve el cliente en su portal |
| `clientes/{uid}` | El personal; cada cliente, la suya | `empresa` (el ID de `empresas`) y `email` |
| `ordenes/{codigo}` | El personal; cada cliente, las de su empresa | `empresa`, `referencia` y `serie` (opcionales) |

El estado y las etapas viven solo en `seguimiento/{codigo}`: el panel lo escribe y el portal y la consulta
pública lo leen. Solo el personal escribe estas colecciones y recorre `seguimiento` entera; las reglas
validan que el estado sea uno de la lista.

El portal es de consulta: el cliente ve los equipos de su empresa, el estado de cada uno, la fecha de cada
etapa y los entregados. No aprueba presupuestos ni manda mensajes desde la app; eso se arregla con el taller.
Una cuenta sin `clientes/{uid}` entra al portal y ve el aviso de que todavía no está asociada a una empresa.

### App Check (opcional)

Si `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` tiene una clave de reCAPTCHA v3, la app inicializa App Check. Protege
la cuota gratuita de lecturas frente a bots. **Pendiente:** registrar la clave y activar la verificación
obligatoria de Firestore en la consola. En localhost, `NEXT_PUBLIC_APPCHECK_DEBUG=true` imprime un token de
depuración en la consola del navegador.

## Acceso a datos

Los componentes no usan Firebase directamente: pasan por los repositorios de `src/lib/datos/repositorios.ts`.
Para migrar a Supabase/Postgres alcanza con una nueva implementación de esas interfaces.
