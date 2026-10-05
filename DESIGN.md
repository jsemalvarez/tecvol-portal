---
name: Tecvol · Reparación de transformadores
description: Workshop safety signage in the Tecvol brand, where the shape and colour of a sign tell the customer what state their transformer is in.
colors:
  esmalte: "#f4f4f1"
  blanco: "#ffffff"
  tinta: "#1a1a1a"
  naranja: "#ff8929"
  durazno: "#f7d9bf"
  acero: "#747478"
  grafito: "#5c5c5c"
  amarillo: "#ffcd00"
  azul: "#154889"
  verde: "#237f52"
  rojo: "#a02128"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "clamp(4rem, 5.4vw, 6.25rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "normal"
  banner:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  firma:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.08em"
  numeral:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "6rem"
    fontWeight: 700
    lineHeight: 0.8
    letterSpacing: "normal"
  code:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.14em"
  station-number:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "normal"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "0.06em"
  body:
    fontFamily: "Barlow, Arial Narrow, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum, lnum"
  body-lead:
    fontFamily: "Barlow, Arial Narrow, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum, lnum"
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.06em"
  label-sm:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.1em"
  button:
    fontFamily: "Barlow Condensed, Arial Narrow, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.07em"
shadows:
  placa: "0 1px 2px rgb(26 26 26 / 0.07), 0 16px 32px -18px rgb(26 26 26 / 0.3)"
rounded:
  banner: "1rem"
  chapa: "0.875rem"
  bloqueo: "0.75rem"
  franja: "0.375rem"
  placa: "0.25rem"
  etiqueta: "0.125rem"
spacing:
  rule-gap: "28px"
  panel-sm: "24px"
  panel: "32px"
  column-gap: "48px"
  section-sm: "80px"
  section-lg: "112px"
  footer-gap-sm: "96px"
  footer-gap-lg: "128px"
components:
  placa:
    backgroundColor: "{colors.naranja}"
    textColor: "{colors.tinta}"
    typography: "{typography.button}"
    rounded: "{rounded.placa}"
    padding: "0 1.75rem"
    height: "3.5rem"
  placa-hover:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.naranja}"
  placa-cargando:
    backgroundColor: "{colors.esmalte}"
    textColor: "{colors.tinta}"
  placa-banda:
    backgroundColor: "{colors.naranja}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.placa}"
    padding: "0 1rem"
    height: "2.75rem"
  placa-banda-hover:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.naranja}"
  placa-secundaria:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    rounded: "{rounded.placa}"
    padding: "0 1.125rem"
    height: "2.75rem"
  placa-secundaria-hover:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.esmalte}"
  placa-logo:
    backgroundColor: "{colors.blanco}"
    rounded: "{rounded.franja}"
    padding: "0.375rem 0.75rem"
  renglon:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    padding: "0.5rem 0 0.375rem"
  renglon-focus:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.tinta}"
  etiqueta:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.esmalte}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.etiqueta}"
    padding: "0.125rem 0.5rem"
  tarjeta-bloqueo:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.tinta}"
    typography: "{typography.label-sm}"
    padding: "0.125rem 0.625rem 0.125rem 0.5rem"
  pliego:
    backgroundColor: "{colors.esmalte}"
    textColor: "{colors.tinta}"
    padding: "32px 96px 48px"
  banner:
    backgroundColor: "{colors.durazno}"
    textColor: "{colors.tinta}"
    typography: "{typography.banner}"
    rounded: "{rounded.banner}"
    padding: "28px 40px"
  chapa-senal:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.chapa}"
    padding: "20px"
  marco:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.placa}"
    padding: "24px 32px"
  marco-banda:
    backgroundColor: "{colors.acero}"
    textColor: "{colors.blanco}"
    padding: "12px 32px"
  pie:
    backgroundColor: "{colors.durazno}"
    textColor: "{colors.tinta}"
    padding: "64px 32px"
  acceso:
    backgroundColor: "{colors.esmalte}"
    textColor: "{colors.tinta}"
    padding: "48px 28px"
  acceso-banda:
    backgroundColor: "{colors.durazno}"
    textColor: "{colors.tinta}"
    padding: "32px 28px"
  progreso-actual:
    backgroundColor: "{colors.naranja}"
    rounded: "{rounded.etiqueta}"
    size: "12px"
  franja-registro:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.esmalte}"
    typography: "{typography.title}"
    rounded: "{rounded.franja}"
    padding: "0.625rem 0.75rem"
  franja-advertencia:
    backgroundColor: "{colors.amarillo}"
    textColor: "{colors.tinta}"
    typography: "{typography.title}"
    rounded: "{rounded.franja}"
    padding: "0.625rem 0.75rem"
  franja-obligacion:
    backgroundColor: "{colors.azul}"
    textColor: "{colors.esmalte}"
    typography: "{typography.title}"
    rounded: "{rounded.franja}"
    padding: "0.625rem 0.75rem"
  franja-seguridad:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.esmalte}"
    typography: "{typography.title}"
    rounded: "{rounded.franja}"
    padding: "0.625rem 0.75rem"
---

# Design System: Tecvol · Reparación de transformadores

## Overview

**Creative North Star: "Señalización de taller"**

The interface is a workshop wall in Tecvol's colours. The page is the light wall (esmalte). The first viewport is a printed sheet (the pliego) pasted straight onto it: crop marks at the corners, a narrow rail down each side, the question in large black condensed type, and an orange line drawing of the customers' world (a cooperative's rural line with a windmill and a pole-mounted transformer, and the workshop shed with a transformer going in). At the end, the same line runs on to the horizon under a setting sun: the page starts by day and ends at dusk. The access pages (/ingresar, /portal, /panel) stand at that dusk: a clear form on the wall above the same horizon. Below the first viewport, content panels are pure white enamel plates fixed to the wall, each lifted by a short mount shadow. Tecvol's steel grey draws the structure (the plate rims, the section rules, the footer, the fill-in lines of the form); signal black is kept for what must read hardest: every headline, the text, the borders of the safety signs, the focus ring and the floor line. Tecvol orange is the hand you act with and the brand's own ink: every primary plate, the opening segment of each section rule, the line drawing and its sun, and the overhead crane in the workshop scene. Hierarchy comes from black condensed capitals, line weight, bands and the step from wall to plate.

Colour that carries meaning enters only to say what state a repair is in, using the safety-sign grammar the customer already reads in their plant (IRAM 10005 / ISO 7010). A white rectangle is a record (received, delivered). A yellow triangle means the workshop is working. A blue circle means the next step is the customer's: their approval is needed. A green square means ready. Red belongs to errors and nothing else. Orange is the brand and the action and never a state, so it never fills a sign.

The page is dense and direct, like a notice on a workshop wall, and it moves once at length: a scroll-driven walk along the workshop floor where an orange crane carries a grey transformer from bay to bay and each bay's sign lights up when the unit is set down. The world rejects the trade's stock landing page (substation photo, navy with yellow, a row of service cards) and rejects yellow-and-black hazard tape as ornament.

**Key Characteristics:**
- A light wall: a printed pliego with crop marks as the first viewport, pure white plates mounted below; steel-grey structure; signal-black headlines, text and sign borders.
- An orange line drawing in the pliego, swapped for the customer's sign and data when a code is looked up, and its continuation at dusk across the footer and the access pages.
- Tecvol orange for brand and action only; four state colours bound to sign shapes; red only for errors.
- The official logo always sits on a light plate.
- Barlow Condensed capitals for bands, labels and actions; Barlow for reading; every headline in tinta.
- Tabular, lining figures everywhere.
- Two depths only: the wall (with the pliego printed on it) and the plates mounted on it. Everything inside a plate is flat and drawn with line weight.
- Motion: the sign catches light once when it changes, and the workshop scene follows the scroll.

## Colors

An enamel-and-steel palette with one brand accent for action and four normed safety colours that exist only as state.

### Primary
- **Tecvol Orange / Naranja** (`naranja`): brand and action, never a state. Fills the primary plate and the band plate (black text on it, 7.3:1; hover inverts to black with orange text), the first 5rem of every section rule, the pliego's sun, the full-strength segment of its left rail and the dot between the two services in its closing line, and strokes its line drawing (2.25 units); the footer's setting sun, its line drawing (2 units) and the bar markers of its services; the scene's crane beam, the current square in the scene's stage counter, the short bar markers of feature lists, and the underline colour of every link.

- **Peach / Durazno** (`durazno`, orange mixed 25% into esmalte): the pliego's banner plate ("¿Tiene un transformador para reparar?", black text, 13:1) and the soft fills of its line drawing (shed roof, transformer on the pole, pallet); the footer band and the access pages' bottom band (black text, 13:1) and the fills of the dusk drawing. A tint of the brand, never a state.

### Neutral
- **Steel / Acero** (`acero`, Tecvol logo grey): structure. The pliego's crop marks, the section top rules, the plate rims and caption bands, the form lines, the secondary plate and lockout-tag borders, the dashed outline of pending signs and of the local test-accounts box, the hairlines between rows, the scene's top and bottom borders, its station numeral, and the transformer's tank. Never a headline.
- **Graphite / Grafito** (`grafito`, Tecvol logo dark grey): secondary text (the pliego's code helper and its right rail, legend definitions, stage meanings, the scene's stage counter; 6.1:1 on esmalte), and in the scene the near columns, the hoist body and the transformer's radiators.
- **Signal Black / Tinta** (`tinta`): the H1 and every section headline, body text, the borders of active and past signs, pictogram ink on white and yellow signs, the focus ring, the floor line, the cable and hook, the gates and bay frames of the scene, and the browser theme colour.
- **Enamel White / Esmalte** (`esmalte`): the wall, that is the page ground, the scene's viewer and the reduced-motion table; the logo plate; the fill of record, past and pending signs.
- **Pure White / Blanco** (`blanco`): the plates mounted on the wall (the sign plate of a lookup result, the portal example, the services plate, the inquiry form and its confirmation, the portal's equipment plates), every logo plate, text on steel caption bands (4.65:1), the lockout tag body, the focused form line, and the flat exterior seen through the scene's gates.

### State colours (the only meaning-bearing colours)
- **Safety Yellow / Amarillo** (`amarillo`): the triangle "en trabajo" (diagnosis, repair, testing) and its label strip. Black text on it.
- **Signal Blue / Azul** (`azul`, RAL 5005): the circle "requiere su aprobación" and its label strip. White pictogram and text on it.
- **Signal Green / Verde** (`verde`, RAL 6032): the square "listo" and its label strip. White pictogram and text on it.
- **Signal Red / Rojo** (`rojo`): validation and request errors only: error text, the invalid form line, the alert icon disc.

### Named Rules
**The Colour Is State Rule.** Yellow, blue and green appear only to mean a repair state, and red only to mean an error. Section backgrounds, headings, links, icons and decoration never use them.

**The Orange Is Action Rule.** Tecvol orange marks the brand and what you can do: primary plates, the line drawing, the crane, the current-position marker, list markers and link underlines. It never fills a sign, a label strip or anything that could be read as a status.

**The Orange Ink Rule.** Orange on esmalte or white is 2.1:1, so it draws lines, fills shapes and underlines links but never sets text on a light ground. Text on orange is tinta.

**The Steel Structure Rule.** Structure is drawn in acero: plate rims, bands, rules, form lines. Headlines and text are tinta, never acero; tinta also draws sign borders, focus and the floor line.

**The Inverted Selection Rule.** Text selection is a tinta/esmalte inversion (black background, enamel text; reversed inside steel bands). Selection never borrows a state colour or orange.

## Typography

**Display Font:** Barlow Condensed (with Arial Narrow, Arial, sans-serif), weights 500 to 800
**Body Font:** Barlow (with Arial Narrow, Arial, sans-serif), weights 400 to 700

**Character:** The condensed face is the sign painter's lettering: tall capitals with open tracking for bands, labels and plates. Barlow is its plain reading companion from the same family, so the pairing stays one voice at two widths.

### Hierarchy
- **Display** (`display`; 3rem on phones, 4rem from 640px, fluid from 1024px): the single page question in the pliego. Sentence case, leading 0.92, max about 13ch, in tinta. The access pages use it at 3rem and 4rem from 640px, never fluid, for their one heading ("Ingresar", "Portal de clientes", "Panel del taller").
- **Banner** (`banner`; 1.625rem on phones, 2.25rem from 1024px): the question on the pliego's peach banner. Sentence case, semibold condensed.
- **Headline** (`headline`; 2.5rem on phones, 3rem from 640px, 3.5rem from 1024px): section headings below the pliego. Uppercase, in tinta.
- **Numeral** (`numeral`; 4.5rem on phones, 6rem from 1024px): the station number in the workshop scene, in acero.
- **Code** (`code`; 2.5rem, 3rem from 1024px): the tracking-code line. Uppercase, wide tracking so each of the 8 characters reads apart.
- **Station number** (`station-number`; 1.75rem, 2.5rem from 1024px): the number stencilled on each scene bay. The legend table uses the same face at 2rem / 2.5rem from 640px.
- **Title** (`title`; 1.125rem under the pliego's sign plate, 1.25rem from 1024px; 1.25rem on phones and 1.75rem from 1024px in the scene): state names in label strips, list item names, service names (1.25rem / 1.375rem), confirmation headings (1.75rem). Uppercase, extra-bold.
- **Body** (`body`) and **Lead** (`body-lead`, up to 1.25rem in the pliego): reading text, 42 to 60ch. Tabular lining figures always on.
- **Label** (`label`; 0.9375rem, and `label-sm` at 0.8125rem): form labels, definition terms, table headers, band links, footer headings, the scene's stage counter and bay names (0.8125rem / 0.9375rem). Uppercase.
- **Button** (`button`; 1.125rem on primary, 1rem on band plates, 0.9375rem on secondary and on the banner's outlined action): uppercase action text.
- **Signature** (`firma`; 1.25rem, 1.5rem from 640px): the pliego's closing line of services, uppercase with 0.08em tracking, in tinta.

### Named Rules
**The Black Headline Rule.** The page question and every section headline are tinta. Grey type is only secondary text in grafito; acero never sets a headline.

**The Sign Lettering Rule.** Uppercase is reserved for Barlow Condensed: bands, labels, plates, state names and section headlines. Body text in Barlow is never set in capitals.

**The Tabular Rule.** Every date, code and number uses tabular lining figures (set globally on body).

**The Usted Rule.** Copy addresses the customer as "usted"; buttons use impersonal infinitives ("Consultar estado", "Enviar consulta", "Ingresar al portal").

## Layout

The sections below the first viewport live in a centered column with a max width of 1680px.

**The pliego (first viewport).** At least one screen tall, full width, on esmalte, with its content in a 1500px column padded 28px on phones, 48px from 640px and 96px from 1280px. Crop marks (20px, 1.5px acero) sit 16px in from each corner (24px from 640px). From 1280px a rail runs down each side, centred vertically: on the left the © sign, the year stacked digit by digit, a registration crosshair and a bar of four 44px segments fading from orange to esmalte (100, 72, 48, 28%); on the right "Ingeniería electromecánica" set vertically in grafito labels. Top to bottom: the header (logo plate, the trade line from 640px, section links from 1280px, the orange "Ingresar" band plate); the peach banner, centred, up to 64rem wide; then the body; then the closing line of services. The body is one column on phones (question, code line, helper, drawing) and two columns from 1024px, split 1.05 to 1 with a 56px gap: the question and the code line on the left, the drawing on the right, vertically centred. When a lookup returns, the drawing's place shows the sign plate and the data below it, and on phones that block moves above the question, so whoever arrives from the QR sees the state first.

**The access pages (/ingresar, /panel).** At least one screen tall, on esmalte, with no crop marks and no plate. The header runs in the pliego's 1500px column and padding. The content is one centred column (34rem for the form, 44rem for the session page, padded 28px) that takes the free height and centres vertically. Below it, the dusk drawing strip runs full width (110px tall, 150px from 640px), sitting on a durazno band: on /ingresar the band holds the account note and, in local mode, the test-accounts box, in the 1500px column padded 32px down; on the session page it is a 32px strip of ground.

**The portal (/portal).** The same header, dusk strip and durazno band as the access pages; the content runs in the 1500px column from the top (40px down, 56px from 640px): a grafito label with the company name, the Display heading "Sus equipos", a lead line with the counts, then a 12-column grid from 1024px with 48px gaps: the equipment plates in 8 columns and the sign key in 4, sticky 32px from the top.

Below the first viewport, each section opens with a 6px acero rule whose first 5rem is orange (`filete-seccion`), `rule-gap` (28px) of space, then a 12-column grid from 1024px: heading and lead in 5 columns (4 at 1280px), content in 7 (8 at 1280px), with `column-gap` (48px). Sections are spaced `section-sm` (80px), `section-lg` (112px) from 1024px. Framed panels pad 24px, 32px from 640px. Forms run two columns of lines from 640px with 28px vertical rhythm. The footer starts 96px below the last section (128px from 1024px): a full-width drawing strip (110px tall, 150px from 640px, 180px from 1024px), then the durazno band with the same 12-column split as the sections (logo and services in 5, contact in 4, links in 3) and a closing row.

**The workshop scene.** Inside the legend section, a sticky full-height viewer (100svh, 6px acero rules above and below) sits in a track 100svh plus 70svh per station tall. A station header (numeral, label strip, meaning, and from 640px a stage counter) sits above the workshop floor. The camera step between stations is 92vw on phones and min(52vw, 820px) from 1024px; beam, trolley, floor, lift height, load width, sign width and chain length all scale with the viewport (see the sidecar).

Breakpoints in use: 640px, 768px, 1024px (the pliego's two columns, the scene switch and the larger logo), 1280px (header section links and the pliego's side rails appear).

## Elevation & Depth

The system has two depths: the wall (esmalte) and the white plates mounted on it. The pliego is printed on the wall itself: no rim, no shadow, framed only by its crop marks; its banner is a flat peach plate. A plate is the sign plate of a lookup result, the portal example, the services plate, the inquiry form and its confirmation, or a portal equipment plate. The access pages have no plate: the form is printed on the wall, like the pliego. Each plate has a mount shadow and, except the sign plate, an acero rim; the content plates are screwed on, with a screw at each corner. Nothing inside a plate is raised. Inside, grouping is drawn with line weight and bands, mostly in acero. The ladder, heaviest first: the section rule and scene rules (6px), form lines and the primary plate border (3px), plate rims and their footer rule, secondary plates, lockout tags and footer heading rules (2px), list and table hairlines (1px).

In the workshop scene, depth comes from parallax, not from shading: the back wall travels at 0.5×, the track (bays, signs, gates, exterior) at 1×, and the near columns at 1.4×. The back wall is drawn in acero mixed 50 to 55% into esmalte so it recedes behind the track; that mix exists only there.

### Shadow Vocabulary
- **Plate mount** (`shadow-placa`: `0 1px 2px` tinta at 7% plus `0 16px 32px -18px` tinta at 30%): under every white plate, the sign plate included.
- **Floor shadow** (a flat tinta ellipse, 12px tall and 95% of the load's width, at `opacity: calc(0.3 - var(--elev) * 0.2)`, narrowing to 60% width as the load rises): under the hanging transformer in the scene.
- **Reflective glint** (a white linear gradient 0 / 0.7 / 0 opacity, clipped to the sign silhouette): the one gradient, inside an active sign when it changes.

### Named Rules
**The Mounted Plate Rule.** Only a white plate on the wall gets a shadow, and only the plate mount shadow. Inside a plate, separate, group and emphasise with a heavier line or a band: no nested shadows, no raised cards within cards, no tonal gradients.

**The Hard-Stop Pattern Rule.** Where a gradient function is used to draw (the scene's wall and window band, the near columns and the rivets on the beam), every stop is hard: it draws flat lines and dots, never a blend.

## Shapes

Corners are rounded the way enamel signs are: generous on the pliego's banner (`banner`, 16px), the sign plate (`chapa`, 14px), small on state label strips and the logo plate (`franja`, 6px), nearly square on the screwed content plates and the action plates (`placa`, 4px), nearly square on example tags and the scene's progress squares (`etiqueta`, 2px). The lockout tag is the one asymmetric shape: square on the left, rounded 12px on the right (`bloqueo`), with a punched hole drawn as a 2px acero ring, like a padlock tag.

The four sign silhouettes are fixed geometry on a 120 x 120 grid: rounded rectangle (record), rounded-join triangle (work), circle (approval), and the rounded square (ready). Pictograms are filled silhouettes on a 100 x 100 grid in a single geometry, with cut-outs that take the sign's own fill. UI icons (arrow, alert) use a 2.75 stroke on a 24 x 24 grid.

The pliego's line drawing is outline only, 2.25 units wide with round caps and joins, on a 640 x 420 grid: trazo in naranja, soft fills in durazno, and esmalte fills wherever a shape must hide the lines behind it. Its sun is a flat orange disc. The dusk drawing (footer and access pages) uses the same hand at 2 units on a 1440 x 180 grid, cropped from the centre and anchored to the ground line on narrow screens: six poles with crossarms and sagging wires, a transformer on the third pole, a distant sawtooth shed, two birds, grass tufts, and the sun as an orange half disc setting on the horizon.

The scene is drawn in the same flat geometry: gates as 8px tinta arches rounded 6px at the top, bays as 3px tinta brackets open at the top and rounded 4px at the bottom, a beam with 5px tinta edges and tinta rivets every 48px, and a transformer of flat rectangles (acero tank, grafito radiators, esmalte nameplate, tinta lid, base, bushings, hook and slings).

## Components

### Buttons (plates)
Sign-painted plates that invert on hover.
- **Shape:** small radius (`placa`), condensed capitals, no wrapping.
- **Primary plate:** orange fill, black text, 3px orange border, 3.5rem minimum height (4rem for the code query), optional trailing arrow. Hover inverts to a black fill with orange text over 160ms on `ease-salida`; press nudges down 1px.
- **Loading / disabled:** enamel fill, black text, dashed acero border, progress cursor, label changes to the gerund ("Consultando…", "Enviando…").
- **Band plate:** the same orange plate at 2.75rem with a 2px border, for "Ingresar" in the pliego's header; hover inverts to black with orange text.
- **Secondary plate:** transparent with a 2px acero outline, 2.75rem tall; fills black with enamel text on hover.
- **Focus:** a 3px tinta outline offset 3px (enamel inside steel bands).

### Logo plate
The official Tecvol logo always sits on a pure white plate, so it reads as a plate on esmalte and on durazno: 6px radius, 6px by 12px padding. The logo is 1.75rem tall in the headers (2rem from 1024px) and 2.75rem in the footer.

### Pliego (first viewport)
The printed sheet described under Layout: crop marks, side rails, header, banner, question and code line, line drawing, closing line of services.
- **Banner:** durazno, `banner` radius, padded 20px by 24px (40px across from 640px, 28px down from 1024px). The question on the left in `banner` type; on the right an outlined action, "Enviar consulta" with an arrow, 2.75rem tall, 2px tinta border, 8px radius, label type. The whole banner is one link to the inquiry form; on hover the action fills tinta with durazno text.
- **Code line:** the label in tinta, the renglón at 2.5rem (3rem from 1024px) and the primary plate beside it from 640px, the helper below in grafito.
- **Line drawing:** decorative and aria-hidden. It never carries state, and it gives way to the sign plate when a code is looked up.
- **Closing line:** "Reparación y rebobinado · Mantenimiento y ensayos" in `firma` type, tinta, with the dot in orange.

### Sign plate (chapa)
The lookup result's sign, mounted like a real one: pure white, `chapa` radius, 16px padding (20px from 640px), plate mount shadow. It holds the sign, its label strip and the code ("Su equipo K7RM-4XPA", or "Código" when it was not found). The data and the next step follow below it.

### Tags
- **Example tag (etiqueta):** a solid black tag (inverted inside bands) that labels fictitious or example content.
- **Lockout tag (tarjeta-bloqueo):** brighter white body, 2px acero border, padlock-tag silhouette with a punched ring. Marks only pending or not-yet-enabled items ("Pendiente", "En preparación").

### Inputs / Fields (renglón)
- **Style:** the field is the fill-in line of a notice: no box, transparent, a 3px acero bottom rule. Placeholders are full tinta (the code field shows `____-____`).
- **Focus:** the line turns tinta and thickens to 5px, and the field takes the brighter white behind it. No outline ring.
- **Error:** the line turns rojo; a red alert icon and red message sit below.

### Bands
- **Footer (atardecer):** the drawing strip, then a durazno band in tinta: the logo on its white plate, the two services in label type (1.125rem, 1.25rem from 640px) each led by a 20 by 4px orange bar, "Contacto" (pending lockout tags) and "Accesos" under 2px tinta heading rules with hairlines of tinta mixed 25% into durazno between rows, and a closing row with the © line and, in local mode, the test codes.

### Access pages (ingreso)
The login and the provisional panel page, described under Layout.
- **Header:** the logo plate (a link home) with the trade line in labels from 640px; on the right "Volver al inicio" in labels, or the "Salir" secondary plate when a session is open.
- **Login column:** a grafito label line ("Portal de clientes · Panel del taller"), the Display heading "Ingresar", then the form 32px below: email and password as renglones 28px apart, a "Mostrar / Ocultar" toggle in small labels underlined in orange beside the password label, and a row with the primary plate "Ingresar" and the text link "¿Olvidó su contraseña?" (semibold, orange underline). Errors follow the field rules, and a request error sits above the fields as a red alert line. The reset mode keeps the email line only, and its confirmation never says whether the account exists.
- **Open session:** instead of the form, "Ya ingresó como" with the email, the primary plate to the portal or panel and the "Salir" secondary plate.
- **Session page (/panel, until the panel is built):** "Ingresó como" in grafito labels, the Display heading, and a lockout tag "En preparación" leading the lead text.
- **Bottom band:** the dusk strip on durazno. The account note ("¿No tiene cuenta?", with links to the inquiry form and to the lookup) sits in tinta at 0.9375rem, up to 52ch. In local mode, the test-accounts box: 2px dashed acero, `placa` corners, a small label title and one line per account.

### Portal (registro)
The client portal reads like the workshop's own register: the same screwed plate as the portal example on the home page, one row per unit. It is read-only: the workshop loads each state, and approvals and messages happen outside the app.
- **Plates:** "En el taller" and, when there are any, "Entregados", each a screwed plate with its caption band (label and count). Rows are ordered by what the customer must do: blue and green signs first, then the units in work from the most advanced, newest first within a state; delivered units newest first.
- **Row:** a button across the whole row, with a 1px acero hairline between rows. The simple sign (48px, 56px from 640px), the state's label-strip text in extra-bold labels with "Diagnóstico desde el 30/09/2026" below ("el" alone for record states: "Entregado el 03/08/2026"), then the customer's reference in semibold over the unit description and its code, and on the right "Etapas" / "Cerrar" in small labels from 768px with a chevron that turns over. Hover takes the esmalte fill.
- **Open row:** below a dashed acero rule, on esmalte at 60%: the state's meaning, the serial and "Entrega estimada: A confirmar por el taller" as small label pairs, then the stage line.
- **Stage line:** the seven stages with their date, in a row of seven from 768px and stacked with hairlines below it: past stages as tinta outlines, the current one lit (36px simple signs) with its name in bold, the rest as dashed acero outlines marked "Pendiente".
- **Sign key:** "Cómo leer las señales" under a 3px acero rule: the four shapes (40px simple signs) with the figure in semibold and what it means in grafito, divided by hairlines.
- **States:** loading shows three dashed acero rows with a dashed record outline and a bar, never an example state; an account with no company, no units, or a load error each get one plain sentence (the error in red with an alert icon and a "Reintentar" secondary plate). In local mode the band adds a dashed box saying the company and units are test data.

### Screwed plate (marco)
The content plate of the wall (portal example, portal equipment plates, services, inquiry form and its confirmation), fixed like a transformer's nameplate.
- **Shape:** `placa` corners (4px), 2px acero rim, content clipped, plate mount shadow, pure white.
- **Screws:** one in each corner, 7px in: a 10px ring drawn 2px in acero with a 6 by 2px slot at 45°. Over the steel caption band the top two turn pure white. Decorative and aria-hidden.
- **Caption band:** optional, acero with pure white label text and the example tag inverted to esmalte.
- **Internal Padding:** 32px across (40px from 640px), so the screws stay clear of the content; 24px down (32px from 640px) in a single-body plate such as the form. Rows are divided by 1px acero hairlines; a closing row (the services' pending note) sits under a 2px acero rule. Service names sit on acero name plates with pure white text.

### Señal (signature component)
The safety sign that carries state. Variants: **active** (normed shape filled in its state colour; record is enamel with a 7px tinta outline, work is yellow with a 9px tinta outline), **past** (the same shape as a 6px tinta outline on enamel, pictogram kept), **pending** (a dashed 4px acero outline, 7/7 dash, no pictogram). Below a large sign, a label strip (franja) repeats the state name in the state colour. At small sizes (legend, lists, the reduced-motion table) the sign uses the single-figure simple pictogram set.

The loading state is a dashed record outline with no colour and no example state: the real state is never preceded by a sample one.

**Motion.** When a sign switches on, it enters with `senal-entra` (420ms, from 0.4 opacity and 0.94 scale) and catches light once with `destello`: the glint sweeps across over 900ms after a 120ms delay. Both run only when reduced motion is not requested.

### Recorrido del taller (workshop scene)
A lateral camera walk along the workshop floor, bound to scroll.
- **Layers:** the back wall with columns and a window band (0.5×); the track (1×) with the entry gate, station bays with stencilled numbers and names, the signs hanging on two tinta chains beside each set-down point, the exit gate, and a flat blanco exterior beyond each gate with no wall; the near grafito columns (1.4×), whose rest phase (`--frente-fase`, 0.7 on phones, 0.38 from 1024px) keeps them off the unit and off every sign at rest.
- **Crane:** a fixed orange beam whose rivets scroll with the camera; a grafito hoist with tinta wheels and an enamel drum that turns with `--elev` (540° per full lift); a tinta cable that shortens as the load rises.
- **Manoeuvre:** each station span is 70svh of scroll; the first 42% is the manoeuvre (lift, travel, set down, in fractions 0 to 0.2, 0.2 to 0.65, 0.65 to 0.85) and the rest is the stop. The camera follows the scroll with frame-rate-independent inertia. A damped sway (at most 6°) answers the travel speed and is applied only while the load hangs; set down, it does not tilt.
- **State:** the station header and the bay's sign switch on at set-down: the sign goes active and glints, the header strip takes the state colour, the bay number turns tinta. While travelling, the header keeps the previous station with a dashed acero strip. The stage counter shows past stations as filled acero squares, the current one as an orange square with a tinta border, later ones as acero outlines.
- **Reduced motion:** the scene is hidden and the static legend table (number, simple sign, state and meaning) takes its place. Screen readers always get an ordered list of the seven stages.

### Named Rules
**The Meaningful Sign Rule.** A Señal appears only where it means a state. Services, features and decoration never get signs.

**The Simple Figure Rule.** At small sizes, use the single-figure simple pictograms.

**The One Glint Rule.** The glint plays once, when an active sign switches on: the sign plate when a lookup returns, a scene sign at set-down. Never on small signs, never in a loop.

**The Example and Lockout Rule.** The black example tag labels only example content; the lockout tag marks only pending or locked items. The two are never swapped or reused for other labels.

## Do's and Don'ts

### Do:
- **Do** mount content on white screwed plates over the esmalte wall (4px corners, 2px acero rim, a screw at each corner), draw structure in acero (6 / 4 / 3 / 2 / 1px) and keep tinta for headlines, text, sign borders, focus and the floor line.
- **Do** use Tecvol orange with black text for primary actions, inverting to black with orange text on hover.
- **Do** place the logo on its light plate, in the headers and the footer.
- **Do** open the page with the pliego: crop marks, the peach banner for new customers, the question with the code line, and the line drawing that gives way to the sign plate on a lookup.
- **Do** bind each state colour to its shape: yellow triangle in work, blue circle needs approval, green square ready, white rectangle record.
- **Do** mark example content with the black example tag and pending or locked items with the lockout tag, and keep the two apart.
- **Do** draw form fields as 3px acero bottom lines that turn tinta and thicken to 5px on focus.
- **Do** show loading as a dashed, colourless record outline and a dashed plate.
- **Do** use the simple pictogram set at small sizes.
- **Do** replace the workshop scene with the static legend table under reduced motion.
- **Do** write to the customer as "usted" and label buttons with impersonal infinitives.

### Don't:
- **Don't** use yellow, blue, green or red for anything that is not a state or an error: no coloured headings, links, icons, backgrounds or selection.
- **Don't** use orange as a state, in a sign or in a label strip.
- **Don't** put the logo directly on steel, orange or a photo.
- **Don't** add shadows beyond the plate mount shadow, raise anything inside a plate, or use tonal gradients (the sign glint is the one exception).
- **Don't** set headlines in acero or in two tones.
- **Don't** set text in orange on esmalte or white; orange text belongs only on tinta.
- **Don't** add illustrations beyond the pliego's drawing and its continuation at dusk (the footer and the access pages), or turn either into a status display.
- **Don't** place a Señal as decoration, on a service, or on a feature list.
- **Don't** use yellow-and-black hazard tape as ornament.
- **Don't** fall back on the trade's stock landing: substation photo, navy with yellow, a row of service cards.
- **Don't** show an example state while a real one is loading.
