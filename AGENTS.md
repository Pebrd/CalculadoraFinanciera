# Instrucciones para agentes — Pampa Finance

PWA estática del mercado argentino. Sin framework, sin backend y **sin datos en el repositorio**: el navegador pide las APIs públicas, normaliza y cachea en el dispositivo.

## Arquitectura

- `data-sources.js` — registro de fuentes: `url` o `fetch` propio, `ttl`, `transform`, `dateOf` (fecha real del dato) y `proxy` para orígenes sin CORS. Todo lo que se muestre en pantalla tiene que existir acá.
- `api-service.js` — orquesta la carga: cache fresco → usa; cache vencido → pinta y refresca en background; sin cache → fetch con timeout de 15 s. Usa Cache API (`pf-data-v2`) con fallback a `localStorage`. Expone `window.ApiService` (`load`, `refresh`, `subscribe`, `meta`, `health`, accesores y `teaFromTna`).
- `app.js` — `window.PF`: `Fmt` (es-AR), navegación, `renderTable`, `chart` (SVG propio), `reveal`, `withData(fuentes, render)` y el botón "actualizar" de la franja de sincronización.
- `sw.js` — cachea solo el shell. Los datos no pasan por el Service Worker. Al tocar assets, subir `CACHE`.

## Reglas de datos

- Nunca commitear JSON de datos ni reintroducir `data/` o un workflow de ingesta: el dato tiene que llegar al dispositivo del usuario, no al repo.
- Cada página declara las fuentes que usa en `PF.withData([...], fn)`. No pedir series pesadas en páginas que no las muestran (`dolar_hist` son ~3 MB).
- Una fuente nueva necesita: endpoint con CORS verificado, `ttl` acorde a su frecuencia real y `dateOf` si publica fecha. Sin `dateOf` se usa la hora de descarga.
- Fuente sin CORS: agregar `proxy: 'jina'` y aceptar que puede fallar; la página debe degradar con mensaje, no romperse.
- Noticias: los RSS no exponen CORS; se piden por `r.jina.ai` con `x-return-format: text` y se parsean en el navegador. No usar agregadores con cuota compartida (rss2json devuelve `status: error` después del primer request).
- Si una API cambia de contrato, verificar la respuesta cruda antes de tocar la transformación.

## Diseño (reglas fijas)

- Fondo AMOLED `#000` puro. Nada de grises de fondo grandes.
- Radios de 2 px. Prohibido `border-radius` grande, pills redondeadas o sombras.
- Separación por hairlines (`--line`, `--line-soft`) y aire, no por cajas elevadas.
- Cifras siempre en IBM Plex Mono con `font-variant-numeric: tabular-nums`.
- Tipografía: IBM Plex Sans; etiquetas en mayúscula con `letter-spacing` 0.12–0.2em.
- Colores semánticos únicos: `--up` verde, `--down` rojo, `--info` azul, `--warn` ámbar. Sin neones ni degradados de texto.
- Prohibido reintroducir `nox-tokens.css` o cualquier sistema de tokens anterior: el sistema vive en `styles.css`.
- Cada página responde primero: un héroe, una línea de lectura y después el detalle. No esconder datos para "limpiar" la interfaz.
- TNA se muestra siempre como **base**; las promociones van en columna aparte con su condición. No mezclar tasa promocional con tasa vigente.

## JavaScript

- 4 espacios, punto y coma, `const`/`let`, sin `import/export` (orden de scripts en el HTML).
- Nombres `camelCase`; constantes `SCREAMING_SNAKE_CASE`; módulos globales en `PascalCase` (`ApiService`, `PF`).
- Redes: siempre `try/catch` y `AbortSignal.timeout` (ver `api-service.js`).
- El HTML se arma con `PF.renderTable` o `innerHTML` escapando con `Fmt.esc`. Nunca interpolar texto de terceros sin escapar (los RSS traen HTML).
- Todo texto visible en español rioplatense, sin anglicismos innecesarios.

## Verificación antes de dar algo por terminado

1. `python3 -m http.server` y abrir cada página tocada.
2. Consola sin errores; sin requests 404 ni CORS bloqueados.
3. Las tablas tienen filas reales y `[data-sync]` muestra una hora coherente con la fuente.
4. Sin scroll horizontal en 390 px de ancho.
5. Contrastes: texto secundario ≥ 4.5:1 sobre negro.
6. Segunda visita: los datos salen del cache local sin volver a pedir todo.

## Commits

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`.
