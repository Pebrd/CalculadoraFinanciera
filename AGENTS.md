# Instrucciones para agentes — Pampa Finance

PWA estática del mercado argentino. Sin framework, sin backend: HTML + CSS + JS vanilla y un bundle JSON que GitHub Actions mantiene al día.

## Arquitectura

- `scripts/fetch_data.js` descarga y normaliza todas las fuentes. Escribe `data/finanzas.json` (bundle `{ last_updated, sources, data, counts }`) y un archivo por fuente.
- `api-service.js` es la única puerta a los datos: bundle primero, APIs en vivo después, cache del Service Worker al final. Expone `window.ApiService` con accesores (`getDolares()`, `getPlazofijo()`, `getStocks()`, etc.) y helpers (`teaFromTna`, `dollarVariation`, `gap`, `health`).
- `app.js` aporta `window.PF`: formateo es-AR (`Fmt`), navegación, `renderTable`, `chart` (SVG propio), `reveal`, `withData`.
- `sw.js` cachea shell y datos con network-first. Al tocar assets, subir `CACHE`.

## Comandos

```bash
python3 -m http.server 8000            # desarrollo
node scripts/fetch_data.js --all       # todas las fuentes
node scripts/fetch_data.js --quotes    # dólar, dólar bancario, USDT
node scripts/fetch_data.js --rates     # FCI, plazo fijo, billeteras
node scripts/fetch_data.js --agro      # pizarra y hacienda
node scripts/fetch_data.js --market    # acciones, bonos, notas, CEDEARs
node scripts/fetch_data.js --series    # series históricas
node scripts/fetch_data.js --news      # titulares
```

Después de tocar el fetcher, correr `--all` y confirmar que `sources` no quede con fuentes en `ok: false`.

## Diseño (reglas fijas)

- Fondo AMOLED `#000` puro. Nada de grises de fondo grandes.
- Radios de 2 px. Prohibido `border-radius` grande, pills redondeadas o sombras.
- Separación por hairlines (`--line`, `--line-soft`) y aire, no por cajas elevadas.
- Cifras siempre en IBM Plex Mono con `font-variant-numeric: tabular-nums`.
- Tipografía: IBM Plex Sans; etiquetas en mayúscula con `letter-spacing` 0.12–0.2em.
- Colores semánticos únicos: `--up` verde, `--down` rojo, `--info` azul, `--warn` ámbar. Sin neones ni degradados de texto.
- Prohibido reintroducir `nox-tokens.css` o cualquier sistema de tokens anterior: el sistema vive en `styles.css`.
- Cada página responde primero: un héroe, una línea de lectura y después el detalle. No esconder datos para "limpiar" la interfaz.

## JavaScript

- 4 espacios, punto y coma, `const`/`let`, sin `import/export` (orden de scripts en el HTML).
- Nombres `camelCase`; constantes `SCREAMING_SNAKE_CASE`; módulos globales en `PascalCase` (`ApiService`, `PF`).
- Redes: siempre `try/catch` y `AbortSignal.timeout` (ver `api-service.js`).
- No consultar APIs externas desde una página: agregar la fuente al fetcher y al bundle.
- El HTML se arma con `PF.renderTable` o `innerHTML` escapando con `Fmt.esc`. Nunca interpolar texto de terceros sin escapar (los RSS traen HTML).
- Todo texto visible en español rioplatense, sin anglicismos innecesarios.

## Datos

- No commitear datos voluminosos: el fetcher recorta series y topes (400 puntos de series, 60 noticias, 40 CEDEARs).
- Si una API cambia, verificar el contrato antes de tocar transformaciones; `data/<fuente>.json` sirve para inspeccionar el último resultado normalizado.
- Frecuencias y endpoints documentados en `README.md`.

## Verificación antes de dar algo por terminado

1. `python3 -m http.server` y abrir cada página tocada.
2. Consola sin errores; sin requests 404.
3. Las tablas tienen filas reales (no vacías) y `[data-sync]` muestra una hora reciente.
4. Sin scroll horizontal en 390 px de ancho.
5. Contrastes: texto secundario ≥ 4.5:1 sobre negro.

## Commits

Conventional commits: `feat:`, `fix:`, `chore:` (datos), `docs:`. Los commits de datos automáticos usan `[skip ci]`.
