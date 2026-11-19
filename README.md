# Pampa Finance

Terminal de datos del mercado argentino. PWA estática, sin backend ni framework: HTML, CSS y JavaScript vanilla, con un bundle de datos que GitHub Actions regenera solo.

**Sitio:** https://pebrd.github.io/CalculadoraFinanciera/

## Páginas

| Archivo | Qué resuelve |
| :--- | :--- |
| `index.html` | Dólar oficial, blue, MEP y CCL; dólar bancario; USDT; indicadores |
| `tasas.html` | Cuentas remuneradas, billeteras y FCI comparados en TNA y TEA |
| `plazo-fijo.html` | Tasas de plazo fijo banco por banco y simulador |
| `calculadoras.html` | Plazo fijo, arbitraje bancario, dólar cripto y liquidación de granos |
| `Graficos historicos.html` | Series de dólar, riesgo país, inflación, UVA y reservas |
| `Hacienda.html` | Pizarra Rosario y mercado de hacienda |
| `ScreenerArgy.html` | Acciones, bonos, notas y CEDEARs del panel BYMA |
| `noticias.html` | Titulares de economía, mercados y política |

## Arquitectura

1. **Ingesta:** `.github/workflows/fetch-data.yml` ejecuta `scripts/fetch_data.js` según cron. Cada fuente falla de forma aislada y, si una API no responde, el bundle conserva el último valor bueno.
2. **Bundle:** `data/finanzas.json` concentra todo (`{ last_updated, sources, data, counts }`). Cada fuente mantiene además su archivo individual en `data/`.
3. **Capa de datos:** `api-service.js` lee el bundle; si no está, cae a las APIs en vivo; si tampoco, el Service Worker responde con la última copia cacheada.
4. **PWA:** `sw.js` usa network-first para HTML, JS, CSS y datos, con fallback offline.

## Comandos

```bash
# servidor local
python3 -m http.server 8000

# datos (Node 20+)
node scripts/fetch_data.js --all      # todo
node scripts/fetch_data.js --quotes   # dólar, dólar bancario, USDT
node scripts/fetch_data.js --rates    # FCI, plazo fijo, billeteras
node scripts/fetch_data.js --agro     # pizarra y hacienda
node scripts/fetch_data.js --market   # panel BYMA (data912)
node scripts/fetch_data.js --series   # series históricas + noticias
node scripts/fetch_data.js --news     # solo noticias
```

## Fuentes

| Dato | Endpoint | Frecuencia |
| :--- | :--- | :--- |
| Dólares | `https://dolarapi.com/v1/dolares` | 5 min |
| Dólar bancario | `https://api.comparadolar.ar/usd` | 5 min |
| USDT | `https://criptoya.com/api/usdt/ars/0.1` | 5 min |
| Plazo fijo | `https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo` | 3 h |
| FCI | `https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/ultimo` · `/fci/otros/ultimo/` | 3 h |
| Billeteras | `https://space.tasas.ar/api/bancos-digitales` | 3 h |
| Granos | `https://s1.dekagb.com/dkmserver.services/html/acabaseservice.aspx?mt=GetPizarras&appname=acabase` | 30 min |
| Hacienda | `https://www.decampoacampo.com/gh_funciones.php?function=getListadoPreciosGordo` | 30 min |
| Panel BYMA | `https://data912.com/live/arg_stocks` · `arg_bonds` · `arg_notes` · `arg_cedears` · `mep` · `ccl` | 30 min |
| Riesgo país, inflación, UVA, dólar histórico | `https://api.argentinadatos.com/v1/finanzas/indices/*` · `/v1/cotizaciones/dolares` | 6 h |
| Reservas | `https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/1` | 6 h |
| Noticias | RSS de Ámbito, La Nación, Clarín, iProfesional, El Economista, Investing | 6 h |

## Fórmulas

- **TEA:** `(1 + TNA × 30 / 365)^(365/30) − 1`
- **Plazo fijo:** `capital × TNA × días / 365`
- **Arbitraje:** `capital / compra × venta − capital`
- **Granos:** `toneladas × precio × (1 − retenciones / 100)`
- **Dólar blend:** `oficial × 0,8 + CCL × 0,2`

## Diseño

Canvas AMOLED `#000`, estructura de hairlines `rgba(255,255,255,.13)`, radios de 2 px, IBM Plex Sans para texto e IBM Plex Mono con numerales tabulares para cifras. Sin gradientes en superficies ni iconografía decorativa. Tokens en `styles.css` (`:root`).

## Verificación

No hay test runner. Para revisar cambios:

```bash
python3 -m http.server 8765
# en otra terminal, con Chromium headless:
chromium --headless --dump-dom --virtual-time-budget=6000 http://127.0.0.1:8765/index.html
```

Revisar consola del navegador, que `data/finanzas.json` tenga `last_updated` reciente y que `sources` no acumule fuentes en `ok: false`.

## Licencia

MIT.
