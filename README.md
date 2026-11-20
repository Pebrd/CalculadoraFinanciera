# Pampa Finance

Terminal de datos del mercado argentino. PWA estática, sin backend ni framework: HTML, CSS y JavaScript vanilla que consultan las APIs públicas **directo desde el navegador**.

**Sitio:** https://pebrd.github.io/CalculadoraFinanciera/

## Páginas

| Archivo | Qué resuelve |
| :--- | :--- |
| `index.html` | Dólar oficial, blue, MEP y CCL; dólar bancario con logos; USDT; indicadores |
| `tasas.html` | Ranking de TNA por producto, cuentas remuneradas, FCI y referencia BCRA |
| `plazo-fijo.html` | Tasas de plazo fijo banco por banco y simulador |
| `calculadoras.html` | Plazo fijo, arbitraje bancario y dólar cripto |
| `Graficos historicos.html` | Series de dólar, riesgo país, inflación, UVA y reservas |
| `Hacienda.html` | Pizarra Rosario y mercado de hacienda |
| `ScreenerArgy.html` | Panel de acciones de BYMA con el screener de TradingView (demora 20 min) |
| `noticias.html` | Titulares de 9 feeds (8 medios), filtrables por categoría y texto |

## Arquitectura

No hay archivos de datos en el repositorio. Cada visita pide las fuentes a las APIs públicas, las normaliza en el navegador y las guarda en el cache del dispositivo.

1. **`data-sources.js`** define cada fuente: URL, TTL, transformación y fecha real del dato. Incluye un `fetch` propio para noticias (RSS agregado) y proxy para la única fuente sin CORS.
2. **`api-service.js`** orquesta: cache fresco → usa; cache vencido → pinta y refresca en segundo plano; sin cache → pide con timeout de 15 s. Usa Cache API con fallback a `localStorage`.
3. **`app.js`** aporta `window.PF`: formateo es-AR, navegación, `renderTable`, `chart` (SVG propio), `reveal` y `withData(fuentes, render)`.
4. **`sw.js`** cachea el shell (HTML, CSS, JS) con network-first. Los datos no pasan por el Service Worker.

Consecuencias: no hay commits automáticos ni bundle que envejezca; el dato es tan fresco como la fuente. Si una API no responde, se muestra la última copia local y se marca la fuente caída en la franja de sincronización.

## Fuentes

| Dato | Endpoint | TTL |
| :--- | :--- | :--- |
| Dólares | `https://dolarapi.com/v1/dolares` | 60 s |
| Dólar bancario | `https://api.comparadolar.ar/usd` | 60 s |
| USDT | `https://criptoya.com/api/usdt/ars/0.1` | 60 s |
| Variación diaria del dólar | `https://criptoya.com/api/dolar` | 5 min |
| MEP / CCL implícito | `https://data912.com/live/mep` · `/ccl` · `/arg_bonds` (AL30/AL30D, GD30/GD30D) | 2 min |
| Plazo fijo | `https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo` | 30 min |
| FCI | `https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/ultimo` · `/fci/otros/ultimo/` | 30 min |
| Billeteras | `https://space.tasas.ar/api/bancos-digitales` | 30 min |
| Referencia BCRA | `https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/12` · `/7` | 30 min |
| Granos | `https://s1.dekagb.com/dkmserver.services/html/acabaseservice.aspx?mt=GetPizarras&appname=acabase` | 10 min |
| Hacienda | `https://www.decampoacampo.com/gh_funciones.php?function=getListadoPreciosGordo` (vía proxy) | 15 min |
| Panel BYMA | Widget de TradingView (`embed-widget-screener`), mercado `argentina`; sin fuente propia | — |
| Riesgo país, inflación, dólar histórico | `https://api.argentinadatos.com/v1/finanzas/indices/*` · `/v1/cotizaciones/dolares` | 1–6 h |
| UVA y reservas | `https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/31` · `/1` | 1–3 h |
| Noticias | RSS de Ámbito, iProfesional, El Economista, La Nación, Clarín, Infobae, Cronista, BAE (vía `r.jina.ai`) | 15 min |

## Fórmulas

- **TEA:** `(1 + TNA × 30 / 365)^(365/30) − 1`
- **Plazo fijo:** `capital × TNA × días / 365`
- **Arbitraje:** `capital / compra × venta − capital`
- **Granos:** `toneladas × precio × (1 − retenciones / 100)`
- **Dólar blend:** `oficial × 0,8 + CCL × 0,2`
- **MEP por bonos:** `AL30 (ARS) / AL30D (USD)`; **CCL:** `GD30 / GD30D`
- **Tasa real:** `(1 + TEA) / (1 + inflación 12 m) − 1`

## Diseño

Canvas AMOLED `#000`, estructura de hairlines `rgba(255,255,255,.13)`, radios de 2 px, IBM Plex Sans para texto e IBM Plex Mono con numerales tabulares para cifras. Sin gradientes en superficies ni iconografía decorativa. Tokens en `styles.css` (`:root`).

## Desarrollo

```bash
python3 -m http.server 8000
```

No hay build ni dependencias. Para revisar: consola sin errores, tablas con filas reales y franja de sincronización con hora reciente.

## Licencia

MIT.
