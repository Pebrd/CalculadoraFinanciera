/**
 * Pampa Finance — capa de datos
 * ---------------------------------------------------------------
 * El frontend nunca depende de una API externa en el camino crítico:
 *   1. Lee el bundle estático data/finanzas.json (generado por GitHub Actions).
 *   2. Si el bundle no está, cae a las APIs en vivo (con timeout).
 *   3. Si tampoco, usa el último bundle cacheado por el Service Worker.
 *
 * Expone window.ApiService.
 */
(function () {
    'use strict';

    var BUNDLE_URL = 'data/finanzas.json';
    var CACHE_BUCKET_MS = 5 * 60 * 1000;

    var LIVE = {
        dolares: 'https://dolarapi.com/v1/dolares',
        usd_providers: 'https://api.comparadolar.ar/usd',
        usdt: 'https://criptoya.com/api/usdt/ars/0.1'
    };

    var state = {
        status: 'idle',      // idle | loading | ready | error
        updatedAt: null,     // ISO del bundle
        source: null,        // 'bundle' | 'live' | 'cache'
        error: null,
        fetchedAt: null,
        data: {},
        sources: {}
    };

    var inflight = null;

    function withTimeout(url, ms) {
        return fetch(url, {
            cache: 'no-store',
            signal: AbortSignal.timeout(ms || 12000),
            headers: { Accept: 'application/json' }
        });
    }

    function liveTransformDolares(raw) {
        return (raw || []).map(function (d) {
            return {
                casa: d.casa,
                nombre: d.nombre,
                compra: d.compra,
                venta: d.venta,
                fecha: d.fechaActualizacion
            };
        });
    }

    function liveTransformProviders(raw) {
        return (raw || [])
            .filter(function (p) { return Number(p.ask) > 0; })
            .map(function (p) {
                return {
                    slug: p.slug,
                    nombre: p.prettyName || p.name,
                    logo: p.logoUrl || null,
                    compra: Number(p.bid) || null,
                    venta: Number(p.ask),
                    variacion: p.pct_variation,
                    tipo: p.usdType || null,
                    esBanco: !!p.isBank,
                    stale: !!p.stale
                };
            })
            .sort(function (a, b) { return a.venta - b.venta; });
    }

    async function tryLive() {
        var out = {};
        var results = await Promise.allSettled(Object.keys(LIVE).map(function (key) {
            return withTimeout(LIVE[key], 9000).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status + ' en ' + key);
                return res.json();
            }).then(function (raw) {
                if (key === 'dolares') out.dolares = liveTransformDolares(raw);
                else if (key === 'usd_providers') out.usd_providers = liveTransformProviders(raw);
                else if (key === 'usdt') out.usdt = raw;
            });
        }));
        var ok = results.filter(function (r) { return r.status === 'fulfilled'; }).length;
        return ok ? out : null;
    }

    async function loadBundle(force) {
        var bucket = Math.floor(Date.now() / CACHE_BUCKET_MS);
        var url = BUNDLE_URL + (force ? '?t=' + Date.now() : '?b=' + bucket);
        var res = await withTimeout(url, 12000);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var json = await res.json();
        if (!json || !json.data) throw new Error('bundle inválido');
        return json;
    }

    async function load(force) {
        if (inflight && !force) return inflight;
        state.status = 'loading';
        state.error = null;

        inflight = (async function () {
            try {
                var bundle = await loadBundle(force);
                state.data = bundle.data || {};
                state.sources = bundle.sources || {};
                state.updatedAt = bundle.last_updated || null;
                state.source = 'bundle';
                state.status = 'ready';
            } catch (err) {
                state.error = err;
                var live = await tryLive().catch(function () { return null; });
                if (live) {
                    state.data = live;
                    state.updatedAt = new Date().toISOString();
                    state.source = 'live';
                    state.status = 'ready';
                } else {
                    state.status = 'error';
                }
            }
            state.fetchedAt = new Date().toISOString();
            inflight = null;
            return state;
        })();

        return inflight;
    }

    /** Espera a que haya datos (idempotente). */
    async function ready() {
        if (state.status === 'ready') return state;
        if (inflight) return inflight;
        return load(false);
    }

    function get(key, fallback) {
        var value = state.data ? state.data[key] : undefined;
        return value === undefined || value === null ? fallback : value;
    }

    /**
     * Variación real contra la rueda anterior usando la serie histórica.
     * Devuelve { venta, previa, pct } para la casa pedida.
     */
    function dollarVariation(casa) {
        var hist = get('dolar_hist', {})[casa] || [];
        var serie = hist.filter(function (p) { return Number.isFinite(p.venta); });
        if (serie.length < 2) return null;
        var last = serie[serie.length - 1];
        var prev = serie[serie.length - 2];
        if (!prev.venta) return null;
        return {
            venta: last.venta,
            previa: prev.venta,
            pct: ((last.venta / prev.venta) - 1) * 100,
            fecha: last.fecha
        };
    }

    /** Brecha porcentual entre dos casas del dólar. */
    function gap(casaA, casaB) {
        var byCasa = {};
        get('dolares', []).forEach(function (d) { byCasa[d.casa] = d; });
        var a = byCasa[casaA];
        var b = byCasa[casaB];
        if (!a || !b || !b.venta) return null;
        return {
            a: a.venta,
            b: b.venta,
            pct: ((a.venta / b.venta) - 1) * 100
        };
    }

    /** Tasa efectiva anual a partir de una TNA nominal (capitalización 30 días). */
    function teaFromTna(tna) {
        if (!Number.isFinite(tna) || tna <= 0) return null;
        var daily = (tna / 100) * 30 / 365;
        return (Math.pow(1 + daily, 365 / 30) - 1) * 100;
    }

    /** Estado de cada fuente, para la franja de sincronización. */
    function health() {
        var sources = state.sources || {};
        var keys = Object.keys(sources);
        var failed = keys.filter(function (k) { return sources[k] && sources[k].ok === false; });
        return {
            status: state.status,
            updatedAt: state.updatedAt,
            source: state.source,
            error: state.error ? String(state.error.message || state.error) : null,
            total: keys.length,
            failed: failed,
            ok: state.status === 'ready'
        };
    }

    window.ApiService = {
        init: ready,
        ready: ready,
        refresh: function () { return load(true); },
        get: get,
        all: function () { return state.data || {}; },
        health: health,
        dollarVariation: dollarVariation,
        gap: gap,
        teaFromTna: teaFromTna,
        state: state,

        getDolares: function () { return get('dolares', []); },
        getUSDProviders: function () { return get('usd_providers', []); },
        getUSDT: function () { return get('usdt', {}); },
        getGranos: function () { return get('granos', []); },
        getHacienda: function () { return get('hacienda', { categorias: [] }); },
        getFCI: function () { return get('fci_otros', []); },
        getFCIDinero: function () { return get('fci_dinero', []); },
        getPlazoFijo: function () { return get('plazofijo', []); },
        getTasasAR: function () { return get('tasas_ar', []); },
        getRiesgoPais: function () { return get('riesgo_pais', { serie: [] }); },
        getInflacion: function () { return get('inflacion', []); },
        getUVA: function () { return get('uva', { serie: [] }); },
        getStocks: function () { return get('stocks', []); },
        getBonds: function () { return get('bonds', []); },
        getNotes: function () { return get('notes', []); },
        getCedears: function () { return get('cedears', []); },
        getNews: function () { return get('news', { articles: [] }).articles || []; },
        getDolarHist: function () { return get('dolar_hist', {}); },
        getImplied: function () {
            return {
                mep: get('mep', null),
                ccl: get('ccl', null),
                brecha: get('brecha_impl', null)
            };
        }
    };
})();
