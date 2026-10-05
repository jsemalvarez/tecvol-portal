# Tecvol · Reparación de transformadores

Sistema de seguimiento de reparaciones: página pública, portal de clientes y panel del taller.
Contexto del producto en [PRODUCT.md](PRODUCT.md).

Stack: Next.js (App Router) + Tailwind CSS + Firebase plan Spark (Auth y Firestore), deploy en Vercel.

## Desarrollo

```bash
npm install
npm run dev
```

Sin variables de Firebase, en desarrollo la app usa **datos locales de prueba** (`src/lib/datos/local`).
Los códigos de prueba aparecen en el pie de la página y las cuentas de prueba (una de cliente y una del
personal) en `/ingresar`; están en `src/lib/datos/local/autenticacion.ts`. En producción sin Firebase, la
consulta y el ingreso muestran que el servicio no está habilitado: nunca se usan datos de prueba.

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
**Correo electrónico/contraseña** (Authentication → Método de acceso). No hay registro público: las cuentas
las crea el taller (Authentication → Usuarios → Agregar usuario).

Después de ingresar, el cliente va a `/portal` y el personal a `/panel` (provisorio hasta construir el panel).
El enlace "¿Olvidó su contraseña?" envía el email de Firebase para elegir una nueva.

### Portal de clientes

El portal es de consulta: el cliente ve los equipos de su empresa, el estado de cada uno, la fecha de cada etapa
y los entregados. No aprueba presupuestos ni manda mensajes desde la app; eso se arregla con el taller. Hasta
que exista el panel, el personal carga los datos a mano en la consola de Firestore:

1. **Cuenta del cliente:** crear el usuario en Authentication y, con su UID, el documento `clientes/{uid}`:

   | Campo | Tipo | Contenido |
   |---|---|---|
   | `empresa` | string | Identificador de la empresa, el mismo en todas sus cuentas y órdenes (p. ej. `coop-norte`) |
   | `nombre` | string | Nombre de la empresa, como se muestra en el portal |

2. **Cada equipo:** además de `seguimiento/{codigo}` (estado y etapas), el documento privado
   `ordenes/{codigo}`, con el mismo código como ID:

   | Campo | Tipo | Contenido |
   |---|---|---|
   | `empresa` | string | El identificador de la empresa dueña del equipo |
   | `referencia` | string, opcional | Cómo identifica el cliente al equipo, p. ej. `Subestación Barrio Norte` |
   | `serie` | string, opcional | Número de serie de la placa |

3. **Cada cambio de estado:** solo en `seguimiento/{codigo}`: `estado`, la fecha en `etapas` y `actualizado`.
   El portal y la consulta pública leen el mismo documento.

Las reglas dejan que cada cliente lea solo su `clientes/{uid}` y las órdenes de su empresa. Una cuenta sin
`clientes/{uid}` entra al portal y ve el aviso de que todavía no está asociada a una empresa.

### Personal del taller

Provisorio hasta construir el panel: es personal quien tenga un documento en `personal/{uid}`, con el UID de
su usuario de Authentication (el contenido del documento puede ser, por ejemplo, `{ nombre: "..." }`). Las
reglas dejan que cada usuario lea solo su propio documento, para que la app sepa si va al panel; nadie puede
listar ni escribir la colección desde la app.

### App Check (opcional)

Si `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` tiene una clave de reCAPTCHA v3, la app inicializa App Check. Protege
la cuota gratuita de lecturas frente a bots. **Pendiente:** registrar la clave y activar la verificación
obligatoria de Firestore en la consola. En localhost, `NEXT_PUBLIC_APPCHECK_DEBUG=true` imprime un token de
depuración en la consola del navegador.

## Acceso a datos

Los componentes no usan Firebase directamente: pasan por los repositorios de `src/lib/datos/repositorios.ts`.
Para migrar a Supabase/Postgres alcanza con una nueva implementación de esas interfaces.
