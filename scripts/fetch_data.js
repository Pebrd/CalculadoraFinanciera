/**
 * Pampa Finance - Data fetcher
 * ------------------------------------------------------------------
 * Descarga todas las fuentes, normaliza y escribe:
 *   - data/finanzas.json  (bundle que consume el frontend)
 *   - data/<fuente>.json  (archivos individuales, compatibilidad)
 *
 * Uso:
 *   node scripts/fetch_data.js --all
 *   node scripts/fetch_data.js --quotes
 *   node scripts/fetch_data.js --rates
 *   node scripts/fetch_data.js --agro
 *   node scripts/fetch_data.js --market
 *   node scripts/fetch_data.js --news
 *
 * Cada fuente falla de forma aislada: si una API se cae, el bundle
 * conserva el último valor bueno que ya estaba en disco.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const BUNDLE_PATH = path.join(DATA_DIR, 'finanzas.json');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/** GET JSON con timeout y reintentos. */
async function getJson(url, attempts = 3) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': UA, Accept: 'application/json,text/plain,*/*' },
                signal: AbortSignal.timeout(20000)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            lastError = err;
            if (i < attempts - 1) await new Promise(r => setTimeout(r, 1200 * (i + 1)));
        }
    }
    throw lastError;
}

/** GET texto con timeout y reintentos. */
async function getText(url, attempts = 3) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': UA, Accept: 'application/rss+xml,application/xml,text/xml,*/*' },
                signal: AbortSignal.timeout(20000)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } catch (err) {
            lastError = err;
            if (i < attempts - 1) await new Promise(r => setTimeout(r, 1200 * (i + 1)));
        }
    }
    throw lastError;
}

const round = (n, d = 2) => (Number.isFinite(+n) ? +(+n).toFixed(d) : null);
const sortByDesc = (arr, pick) => [...arr].sort((a, b) => (pick(b) || 0) - (pick(a) || 0));

function median(values) {
    const nums = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    if (!nums.length) return null;
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function daysAgoISO(days) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
}

// ------------------------------------------------------------------
// Transformaciones
// ------------------------------------------------------------------

const transform = {
    dolares: (raw) => (Array.isArray(raw) ? raw : [])
        .map(d => ({
            casa: d.casa,
            nombre: d.nombre,
            compra: round(d.compra),
            venta: round(d.venta),
            fecha: d.fechaActualizacion
        }))
        .filter(d => d.casa),

    usd_providers: (raw) => (Array.isArray(raw) ? raw : [])
        .filter(p => Number(p.ask) > 0)
        .map(p => ({
            slug: p.slug,
            nombre: p.prettyName || p.name,
            logo: p.logoUrl || null,
            compra: round(p.bid),
            venta: round(p.ask),
            variacion: round(p.pct_variation, 3),
            tipo: p.usdType || null,
            esBanco: !!p.isBank,
            stale: !!p.stale,
            actualizado: p.lastSeenAt || null
        }))
        .sort((a, b) => a.venta - b.venta),

    usdt: (raw) => Object.fromEntries(
        Object.entries(raw || {})
            .filter(([, v]) => Number(v.ask) > 0 && Number(v.bid) > 0)
            .map(([k, v]) => [k, { ask: round(v.ask), bid: round(v.bid), time: v.time }])
    ),

    granos: (raw) => {
        const rows = raw?.result?.value || [];
        return rows.map(g => ({
            producto: g.producto,
            nombre: String(g.nombre || '').trim(),
            puerto: g.puerto,
            precio: round(g.importe, 0),
            variacion: round(g.dif, 0),
            fecha: g.fecha,
            hora: g.hora
        })).filter(g => g.producto);
    },

    hacienda: (raw) => ({
        fecha: raw?.hoy || null,
        dolarOficial: round(raw?.cotizacion_semana_actual),
        dolarBlue: round(raw?.cotizacion_blue_semana_actual),
        categorias: (raw?.data || []).map(c => ({
            categoria: c.categoria,
            precioArs: round(parseFloat(c.precio_semana_1)),
            precioAnteriorArs: round(parseFloat(c.precio_semana_2)),
            precioUsd: round(parseFloat(c.precio_semana_1_usd)),
            precioAnteriorUsd: round(parseFloat(c.precio_semana_2_usd)),
            precioBlue: round(parseFloat(c.precio_semana_1_blue)),
            cabezas: c.cantidad_semana_1,
            cabezasAnterior: c.cantidad_semana_2
        })).filter(c => c.categoria)
    }),

    fci_otros: (raw) => (Array.isArray(raw) ? raw : [])
        .map(f => ({
            fondo: f.fondo,
            tna: round(Number(f.tna) * 100, 2),
            tea: f.tea != null ? round(Number(f.tea) * 100, 2) : null,
            tope: f.tope || null,
            fecha: f.fecha,
            condiciones: f.condiciones || '',
            plazoMinDias: f.plazoMinDias ?? null
        }))
        .filter(f => f.fondo && f.tna > 0)
        .sort((a, b) => b.tna - a.tna)
        .slice(0, 40),

    fci_dinero: (raw) => sortByDesc(Array.isArray(raw) ? raw : [], f => Number(f.patrimonio))
        .slice(0, 30)
        .map(f => ({
            fondo: f.fondo,
            horizonte: f.horizonte,
            fecha: f.fecha,
            patrimonio: round(Number(f.patrimonio), 0),
            cuota: round(Number(f.vcp), 4),
            cuotasPartes: round(Number(f.ccp), 0)
        })),

    plazofijo: (raw) => (Array.isArray(raw) ? raw : [])
        .map(b => ({
            entidad: b.entidad,
            logo: b.logo || null,
            tnaClientes: b.tnaClientes != null ? round(Number(b.tnaClientes) * 100, 2) : null,
            tnaNoClientes: b.tnaNoClientes != null ? round(Number(b.tnaNoClientes) * 100, 2) : null,
            enlace: b.enlace || null
        }))
        .filter(b => (b.tnaClientes || 0) > 0 || (b.tnaNoClientes || 0) > 0)
        .sort((a, b) => (b.tnaClientes || b.tnaNoClientes) - (a.tnaClientes || a.tnaNoClientes)),

    tasas_ar: (raw) => (raw?.data || [])
        .map(t => {
            const bonif = (t.tna_conditions || []).find(c => Number(c.tna_value) > 0);
            const base = Number(t.tna);
            const tna = bonif ? Math.max(base, Number(bonif.tna_value)) : base;
            return {
                nombre: t.name,
                tipo: t.type,
                logo: t.logo || null,
                tna: round(tna, 2),
                tnaBase: round(base, 2),
                tope: t.maxAmount ? round(Number(t.maxAmount), 0) : null,
                condicion: bonif ? bonif.description : ''
            };
        })
        .filter(t => t.nombre && t.tna > 0)
        .sort((a, b) => b.tna - a.tna),

    riesgo_pais: (raw) => {
        const serie = (Array.isArray(raw) ? raw : [])
            .filter(p => p.fecha && Number.isFinite(+p.valor))
            .slice(-400)
            .map(p => ({ fecha: p.fecha, valor: round(p.valor, 0) }));
        const ultimo = serie[serie.length - 1] || null;
        return {
            valor: ultimo ? ultimo.valor : null,
            fecha: ultimo ? ultimo.fecha : null,
            anterior: serie.length > 1 ? serie[serie.length - 2].valor : null,
            serie
        };
    },

    inflacion: (raw) => (Array.isArray(raw) ? raw : [])
        .filter(p => Number.isFinite(+p.valor))
        .slice(-72)
        .map(p => ({ fecha: p.fecha, valor: round(p.valor, 2) })),

    uva: (raw) => {
        const serie = (Array.isArray(raw) ? raw : [])
            .filter(p => Number.isFinite(+p.valor))
            .slice(-400)
            .map(p => ({ fecha: p.fecha, valor: round(p.valor, 2) }));
        const ultimo = serie[serie.length - 1] || null;
        return {
            valor: ultimo ? ultimo.valor : null,
            fecha: ultimo ? ultimo.fecha : null,
            anterior: serie.length > 1 ? serie[serie.length - 2].valor : null,
            serie
        };
    },

    /** Reservas internacionales del BCRA, en millones de USD. */
    reservas: (raw) => {
        const detalle = raw?.results?.[0]?.detalle || [];
        const serie = detalle
            .filter(p => Number.isFinite(+p.valor))
            .map(p => ({ fecha: p.fecha, valor: round(p.valor, 0) }))
            .sort((a, b) => a.fecha.localeCompare(b.fecha));
        const ultimo = serie[serie.length - 1] || null;
        return {
            valor: ultimo ? ultimo.valor : null,
            fecha: ultimo ? ultimo.fecha : null,
            anterior: serie.length > 1 ? serie[serie.length - 2].valor : null,
            serie
        };
    },

    stocks: (raw) => (Array.isArray(raw) ? raw : [])
        .map(s => ({
            simbolo: s.symbol,
            precio: round(s.c, 2),
            compra: round(s.px_bid, 2),
            venta: round(s.px_ask, 2),
            variacion: round(s.pct_change, 2),
            volumen: round(s.v, 0)
        }))
        .filter(s => s.simbolo && s.precio > 0)
        .sort((a, b) => (b.volumen || 0) - (a.volumen || 0)),

    bonds: (raw) => (Array.isArray(raw) ? raw : [])
        .map(s => ({
            simbolo: s.symbol,
            precio: round(s.c, 2),
            compra: round(s.px_bid, 2),
            venta: round(s.px_ask, 2),
            variacion: round(s.pct_change, 2),
            volumen: round(s.v, 0)
        }))
        .filter(s => s.simbolo && s.precio > 0)
        .sort((a, b) => (b.volumen || 0) - (a.volumen || 0)),

    notes: (raw) => (Array.isArray(raw) ? raw : [])
        .map(s => ({
            simbolo: s.symbol,
            precio: round(s.c, 4),
            variacion: round(s.pct_change, 2),
            volumen: round(s.v, 0)
        }))
        .filter(s => s.simbolo),

    cedears: (raw) => sortByDesc(Array.isArray(raw) ? raw : [], s => Number(s.v))
        .slice(0, 40)
        .map(s => ({
            simbolo: s.symbol,
            precio: round(s.c, 2),
            variacion: round(s.pct_change, 2),
            volumen: round(s.v, 0)
        }))
        .filter(s => s.simbolo),

    /** Dólar implícito en CEDEARs: mediana de puntas de los papeles más operados. */
    implied: (raw, bidKey, askKey) => {
        const rows = sortByDesc(Array.isArray(raw) ? raw : [], r => Number(r.v_ars || r.ars_volume))
            .slice(0, 15);
        return {
            bid: round(median(rows.map(r => Number(r[bidKey]))), 2),
            ask: round(median(rows.map(r => Number(r[askKey]))), 2),
            operaciones: rows.length
        };
    },

    dolar_hist: (raw) => {
        const since = daysAgoISO(120);
        const casas = new Set(['blue', 'oficial', 'bolsa', 'contadoconliqui']);
        const out = {};
        for (const row of Array.isArray(raw) ? raw : []) {
            if (!casas.has(row.casa) || row.fecha < since) continue;
            (out[row.casa] = out[row.casa] || []).push({
                fecha: row.fecha,
                compra: round(row.compra),
                venta: round(row.venta)
            });
        }
        return out;
    }
};

// ------------------------------------------------------------------
// Fuentes
// ------------------------------------------------------------------

const SOURCES = {
    quotes: {
        dolares: { url: 'https://dolarapi.com/v1/dolares', fn: transform.dolares },
        usd_providers: { url: 'https://api.comparadolar.ar/usd', fn: transform.usd_providers },
        usdt: { url: 'https://criptoya.com/api/usdt/ars/0.1', fn: transform.usdt }
    },
    rates: {
        fci_otros: { url: 'https://api.argentinadatos.com/v1/finanzas/fci/otros/ultimo/', fn: transform.fci_otros },
        fci_dinero: { url: 'https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/ultimo', fn: transform.fci_dinero },
        plazofijo: { url: 'https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo', fn: transform.plazofijo },
        tasas_ar: { url: 'https://space.tasas.ar/api/bancos-digitales', fn: transform.tasas_ar }
    },
    agro: {
        granos: {
            url: 'https://s1.dekagb.com/dkmserver.services/html/acabaseservice.aspx?mt=GetPizarras&appname=acabase',
            fn: transform.granos
        },
        hacienda: {
            url: 'https://www.decampoacampo.com/gh_funciones.php?function=getListadoPreciosGordo',
            fn: transform.hacienda
        }
    },
    market: {
        stocks: { url: 'https://data912.com/live/arg_stocks', fn: transform.stocks },
        bonds: { url: 'https://data912.com/live/arg_bonds', fn: transform.bonds },
        notes: { url: 'https://data912.com/live/arg_notes', fn: transform.notes },
        cedears: { url: 'https://data912.com/live/arg_cedears', fn: transform.cedears },
        mep: { url: 'https://data912.com/live/mep', fn: (raw) => transform.implied(raw, 'bid', 'ask') },
        ccl: { url: 'https://data912.com/live/ccl', fn: (raw) => transform.implied(raw, 'CCL_bid', 'CCL_ask') }
    },
    series: {
        riesgo_pais: { url: 'https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais', fn: transform.riesgo_pais },
        inflacion: { url: 'https://api.argentinadatos.com/v1/finanzas/indices/inflacion', fn: transform.inflacion },
        uva: { url: 'https://api.argentinadatos.com/v1/finanzas/indices/uva', fn: transform.uva },
        reservas: { url: 'https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/1?limit=400', fn: transform.reservas },
        dolar_hist: { url: 'https://api.argentinadatos.com/v1/cotizaciones/dolares', fn: transform.dolar_hist }
    }
};

// ------------------------------------------------------------------
// Noticias
// ------------------------------------------------------------------

const NEWS_FEEDS = [
    { source: 'Ámbito', category: 'Economía', url: 'https://www.ambito.com/rss/pages/economia.xml' },
    { source: 'Ámbito', category: 'Mercados', url: 'https://www.ambito.com/rss/pages/finanzas.xml' },
    { source: 'Ámbito', category: 'Política', url: 'https://www.ambito.com/rss/pages/politica.xml' },
    { source: 'Ámbito', category: 'Negocios', url: 'https://www.ambito.com/rss/pages/negocios.xml' },
    { source: 'El Economista', category: 'Economía', url: 'https://eleconomista.com.ar/economia/feed/' },
    { source: 'iProfesional', category: 'Economía', url: 'https://www.iprofesional.com/rss/economia.xml' },
    { source: 'La Nación', category: 'Economía', url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/?outputType=xml' },
    { source: 'Clarín', category: 'Economía', url: 'https://www.clarin.com/rss/economia/' },
    { source: 'Investing.com', category: 'Mercados', url: 'https://es.investing.com/rss/news_25.rss' },
    { source: 'Derecha Diario', category: 'Política', url: 'https://derechadiario.com.ar/rss/cat/politica' }
];

const ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ntilde: 'ñ', aacute: 'á',
    eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É', Iacute: 'Í',
    Oacute: 'Ó', Uacute: 'Ú', uuml: 'ü', Uuml: 'Ü', ldquo: '“', rdquo: '”', lsquo: '‘',
    rsquo: '’', ndash: '–', mdash: '—', hellip: '…', deg: '°', euro: '€', pound: '£'
};

function decodeEntities(text) {
    return text
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name] ?? m);
}

function cleanText(html) {
    return decodeEntities(
        String(html || '')
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
    ).replace(/\s+/g, ' ').trim();
}

function tag(item, name) {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i');
    const m = item.match(re);
    if (!m) return '';
    return m[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/,'$1').trim();
}

function parseFeed(xml, feed) {
    const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) || [];
    return blocks.map(block => {
        const title = cleanText(tag(block, 'title'));
        const link = tag(block, 'link').match(/href="([^"]+)"/)?.[1] || cleanText(tag(block, 'link')) || tag(block, 'guid');
        const dateRaw = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || tag(block, 'dc:date');
        const summary = cleanText(tag(block, 'description') || tag(block, 'summary') || tag(block, 'content:encoded'));
        const ts = Date.parse(dateRaw);
        return {
            source: feed.source,
            category: feed.category,
            title,
            link: link.trim(),
            date: Number.isFinite(ts) ? ts : Date.now(),
            description: summary.slice(0, 240) + (summary.length > 240 ? '…' : '')
        };
    }).filter(a => a.title && /^https?:\/\//.test(a.link));
}

async function fetchNews() {
    const results = await Promise.allSettled(NEWS_FEEDS.map(async feed => {
        const xml = await getText(feed.url);
        return parseFeed(xml, feed);
    }));

    const articles = [];
    results.forEach((r, i) => {
        if (r.status === 'fulfilled') articles.push(...r.value);
        else console.warn(`  ! ${NEWS_FEEDS[i].source} (${NEWS_FEEDS[i].category}): ${r.reason.message}`);
    });

    articles.sort((a, b) => b.date - a.date);
    const seen = new Set();
    const unique = articles.filter(a => {
        const key = a.title.toLowerCase().replace(/\s+/g, ' ').trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 60);

    return unique;
}

// ------------------------------------------------------------------
// Runner
// ------------------------------------------------------------------

async function run() {
    const args = process.argv.slice(2);
    const mode = args[0] || '--all';
    const started = new Date();

    let bundle = { last_updated: null, sources: {}, data: {} };
    if (fs.existsSync(BUNDLE_PATH)) {
        try {
            bundle = JSON.parse(fs.readFileSync(BUNDLE_PATH, 'utf8'));
            bundle.data = bundle.data || {};
            bundle.sources = bundle.sources || {};
        } catch (err) {
            console.warn('Bundle anterior ilegible, se regenera desde cero');
        }
    }

    let groupsToProcess;
    if (mode === '--quotes') groupsToProcess = ['quotes'];
    else if (mode === '--rates') groupsToProcess = ['rates'];
    else if (mode === '--agro') groupsToProcess = ['agro'];
    else if (mode === '--market') groupsToProcess = ['market'];
    else if (mode === '--series') groupsToProcess = ['series'];
    else if (mode === '--news') groupsToProcess = [];
    else groupsToProcess = Object.keys(SOURCES);

    const jobs = [];
    for (const group of groupsToProcess) {
        for (const [name, def] of Object.entries(SOURCES[group])) {
            jobs.push((async () => {
                try {
                    const raw = await getJson(def.url);
                    const value = def.fn(raw);
                    const empty = value == null || (Array.isArray(value) && value.length === 0);
                    if (empty) throw new Error('respuesta vacía');
                    bundle.data[name] = value;
                    bundle.sources[name] = {
                        url: def.url,
                        fetchedAt: new Date().toISOString(),
                        ok: true
                    };
                    fs.writeFileSync(
                        path.join(DATA_DIR, `${name}.json`),
                        JSON.stringify({ last_updated: new Date().toISOString(), data: value }, null, 2)
                    );
                    const size = Array.isArray(value) ? `${value.length} filas` : 'objeto';
                    console.log(`  ok  ${name} (${size})`);
                } catch (err) {
                    console.warn(`  !!  ${name}: ${err.message} — se conserva el último dato bueno`);
                    bundle.sources[name] = {
                        ...(bundle.sources[name] || {}),
                        url: def.url,
                        lastError: err.message,
                        lastErrorAt: new Date().toISOString(),
                        ok: false
                    };
                }
            })());
        }
    }
    await Promise.all(jobs);

    if (mode === '--all' || mode === '--news' || groupsToProcess.includes('series') || groupsToProcess.includes('quotes')) {
        try {
            const articles = await fetchNews();
            if (articles.length) {
                bundle.data.news = { articles, fetchedAt: new Date().toISOString() };
                fs.writeFileSync(
                    path.join(DATA_DIR, 'news.json'),
                    JSON.stringify({ last_updated: new Date().toISOString(), articles }, null, 2)
                );
                console.log(`  ok  news (${articles.length} artículos)`);
            }
        } catch (err) {
            console.warn(`  !!  news: ${err.message}`);
        }
    }

    // Dólar implícito de CCL menos el MEP como referencia de brecha
    if (bundle.data.mep?.ask && bundle.data.ccl?.ask) {
        bundle.data.brecha_impl = {
            mep: bundle.data.mep.ask,
            ccl: bundle.data.ccl.ask,
            spread: round(((bundle.data.ccl.ask / bundle.data.mep.ask) - 1) * 100, 2)
        };
    }

    // Claves retiradas: no deben sobrevivir en el bundle
    for (const key of ['argentinadatos_fci', 'bancostodos', 'acabase_granos']) {
        delete bundle.data[key];
        delete bundle.sources[key];
    }

    bundle.last_updated = new Date().toISOString();
    bundle.build_ms = Date.now() - started.getTime();
    bundle.counts = Object.fromEntries(Object.entries(bundle.data).map(([k, v]) => [
        k,
        Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : 1)
    ]));

    fs.writeFileSync(BUNDLE_PATH, JSON.stringify(bundle, null, 2));
    const size = (fs.statSync(BUNDLE_PATH).size / 1024).toFixed(1);
    console.log(`\nBundle: data/finanzas.json (${size} KB) en ${bundle.build_ms} ms`);
}

run().catch(err => {
    console.error('Fallo fatal:', err);
    process.exit(1);
});
