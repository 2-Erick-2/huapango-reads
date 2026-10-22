# Identidad visual Huapango (fuente: landing `editorialhuapangolanding`)

La landing es la fuente de verdad. Si cambia allá, actualiza esta tabla.

## Colores (copiar tal cual a Tailwind/CSS de +reads)

```js
bond:     { 50:'#FFFEFA', 100:'#FDFBF7', 200:'#F5EFE6', 300:'#EADFCF', 400:'#D5C4AC', 500:'#BCA88E' }, // papel bond crema
carbon:   { 950:'#0C0C0B', 900:'#141413', 850:'#1C1C1A', 800:'#232321', 700:'#3A3935', 600:'#5A5953',
            500:'#74736C', 400:'#8E8D86', 300:'#ABA9A0', 200:'#C7C6BE', 100:'#E6E5DE' },             // carbón editorial
terregal: { 400:'#D66E53', 500:'#C05A3E', 600:'#A3452B', 700:'#7E341F', 800:'#562112', 900:'#381308' }, // teja / ladrillo noreste
ochre:    { 300:'#E5BF7A', 400:'#D4A359', 500:'#BF8A3D', 600:'#9E6F2C' },
```

### Uso en +reads (dark-first, basado en la sección +reads de la landing)

- **Fondo de la app:** `carbon-900`. Superficies y tarjetas: `carbon-800/80` con borde `carbon-700/80`. Pantallas del lector: `#1C1C1A` (`carbon-850`).
- **Texto:** principal `bond-100`/`bond-50`; secundario `bond-300`/`bond-400`; terciario `carbon-400`.
- **Acento:** `terregal-500/600` en botones primarios (texto blanco). Texto naranja pequeño sobre carbón: **`terregal-400`** (contraste 5.5:1; `terregal-500` no pasa AA en texto chico).
- **Etiquetas de sección:** mayúsculas, `tracking-[0.25em]–[0.3em]`, `text-xs font-bold`, color terregal, con una línea de 1 px al lado.
- **Píldora de estado:** `bg-terregal-900/60 border-terregal-600/40 text-terregal-400 rounded-full` con un punto animado.
- **Temas del lector:** Bond (`#FDFBF7` + `#141413`), Sepia y Carbón (`#1C1C1A` + `bond-200`).

## Tipografía (autoalojada, no usar Google Fonts)

- **Serif de títulos y texto literario:** `"Newsreader Variable"` (paquete `@fontsource-variable/newsreader`, wght e italic). Títulos `font-light`, `tracking-tight`, con énfasis en _cursiva_.
- **Sans de UI:** `"Plus Jakarta Sans Variable"` (`@fontsource-variable/plus-jakarta-sans`).
- **Mono para metadatos y fichas técnicas:** `ui-monospace, SFMono-Regular, Menlo`.
- Negritas en `font-semibold` (600). Precarga solo el subset latino.
- **Prohibido:** Cinzel, Playfair, Inter, Merriweather.

## Sombras y efectos

```js
book:       '0 18px 38px -10px rgba(20,20,19,0.28), 0 8px 16px -6px rgba(20,20,19,0.15)',
'book-hover':'0 25px 50px -12px rgba(20,20,19,0.38), 0 12px 24px -8px rgba(163,69,43,0.22)',
paper:      '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
```

- **Lomo de libro** (`.book-spine-effect::before`): franja de 14 px a la izquierda con `linear-gradient(90deg, rgba(0,0,0,.24) 0%, rgba(255,255,255,.16) 35%, rgba(0,0,0,.18) 75%, transparent)`.
- **Textura de papel** (`.paper-texture`): `radial-gradient(#d3c7b5 0.75px, transparent 0.75px)` a `24px 24px`. En oscuro, usa luces ambientales `bg-terregal-600/10 blur-3xl`.
- **Radios:** `rounded-sm` en tarjetas y botones (look editorial, nada de `rounded-2xl`).
- **Hover de portadas:** `-translate-y-2` más `shadow-book-hover`, con `duration-300`.

## Logos (copiar desde `editorialhuapangolanding/public/`)

- `logo-huapango-claro.svg`: solo "Huapango" en crema `#FDFBF7`, viewBox 484×114. **Este es el logo de +reads**, acompañado de "+reads" en Newsreader cursiva `terregal-500`.
- `logo-editorial-huapango-claro.svg` / `logo-editorial-huapango.svg`: logo completo "editorial Huapango" claro y oscuro.
- `favicon.svg`: la "H" del logo sobre carbón.
- **Slogan:** `#siemprecuenta` (el `#` en terregal). Sello: "siempre cuenta®".

## Portadas

`editorialhuapangolanding/public/books/`: `portada-*.jpg` y `.webp` (500×720, ya recortadas al libro, proporción real 25:36 = 12.5×18 cm) y `portada-*-260.webp`. Muéstralas con `aspect-[25/36]`, `object-cover`, `shadow-book` y el lomo.
