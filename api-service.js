/**
 * Pampa Finance — capa de datos en el navegador
 * ---------------------------------------------------------------
 * No hay datos en el repositorio: cada fuente se pide al abrir la
 * página, se normaliza en data-sources.js y se guarda en el cache del
 * dispositivo (Cache API, con fallback a localStorage).
 *
 * Flujo por fuente:
 *   1. Si hay copia local fresca (TTL de la fuente) se usa al instante.
 *   2. Si está vencida, se pinta la copia y se refresca en segundo plano.
 *   3. Si no hay copia, se pide a la API con timeout de 15 s.
 *
 * Expone window.ApiService.
 */
(function () {
    'use strict';

    var CACHE_NAME = 'pf-data-v2';
    var LS_PREFIX = 'pf:v2:';
    var TIMEOUT_MS = 15000;

    var state = {
        status: 'idle',        // idle | loading | ready | error
        data: {},
        meta: {},              // name -> { at, sourceDate, from, ms, ok, error }
        requested: {},
        error: null
    };

    var listeners = [];
    var inflight = {};
    var memory = {};
    var cachePromise = null;

    function sources() {
        return window.DATA_SOURCES || {};
    }

    function ttlOf(name) {
        var s = sources()[name];
        return (s && s.ttl) || 5 * 60 * 1000;
    }

    /* ---------------- Cache ---------------- */

    function openCache() {
        if (!cachePromise) {
            cachePromise = (typeof caches !== 'undefined' && caches.open)
                ? caches.open(CACHE_NAME).catch(function () { return null; })
                : Promise.resolve(null);
        }
        return cachePromise;
    }

    async function cacheGet(name) {
        if (memory[name]) return memory[name];
        try {
            var cache = await openCache();
            if (cache) {
                var res = await cache.match(name);
                if (res) {
                    var entry = await res.json();
                    memory[name] = entry;
                    return entry;
                }
            }
        } catch (e) { /* cache no disponible */ }
        try {
            var raw = localStorage.getItem(LS_PREFIX + name);
            if (raw) {
                var parsed = JSON.parse(raw);
                memory[name] = parsed;
                return parsed;
            }
        } catch (e) { /* cuota o modo privado */ }
        return null;
    }

    async function cachePut(name, entry) {
        memory[name] = entry;
        try {
            var cache = await openCache();
            if (cache) {
                await cache.put(name, new Response(JSON.stringify(entry), {
                    headers: { 'Content-Type': 'application/json' }
                }));
                return;
            }
        } catch (e) { /* sigue con localStorage */ }
        try {
            localStorage.setItem(LS_PREFIX + name, JSON.stringify(entry));
        } catch (e) { /* sin persistencia */ }
    }

    async function cacheDelete(name) {
        delete memory[name];
        try {
            var cache = await openCache();
            if (cache) await cache.delete(name);
        } catch (e) {}
        try { localStorage.removeItem(LS_PREFIX + name); } catch (e) {}
    }

    /* ---------------- Red ---------------- */

    async function fetchText(url) {
        var res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
    }

    async function fetchJson(url) {
        var res = await fetch(url, {
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: 'no-store',
            headers: { Accept: 'application/json' }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    }

    /** Orígenes sin CORS: se leen vía r.jina.ai y se extrae el JSON. */
    async function fetchViaProxy(url) {
        var text = await fetchText('https://r.jina.ai/' + url);
        var start = text.indexOf('{');
        var end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('respuesta no JSON');
        return JSON.parse(text.slice(start, end + 1));
    }

    function parseDate(value) {
        if (!value) return null;
        var ts = Date.parse(value);
        return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
    }

    async function fetchSource(name) {
        var source = sources()[name];
        if (!source) throw new Error('fuente desconocida: ' + name);

        var started = Date.now();
        var raw;
        if (typeof source.fetch === 'function') {
            raw = await source.fetch(fetchJson);
        } else if (source.proxy === 'jina') {
            raw = await fetchViaProxy(source.url);
        } else {
            raw = await fetchJson(source.url);
        }

        var data = source.transform ? source.transform(raw) : raw;
        var empty = data == null ||
            (Array.isArray(data) && !data.length) ||
            (typeof data === 'object' && !Array.isArray(data) && !Object.keys(data).length);
        if (empty) throw new Error('respuesta vacía');

        var sourceDate = null;
        if (typeof source.dateOf === 'function') {
            try { sourceDate = parseDate(source.dateOf(raw, data)); } catch (e) { sourceDate = null; }
        }

        return { at: Date.now(), sourceDate: sourceDate, data: data, ms: Date.now() - started };
    }

    /* ---------------- Orquestación ---------------- */

    function notify() {
        listeners.slice().forEach(function (fn) {
            try { fn(state); } catch (e) { /* un render no debe romper el resto */ }
        });
    }

    function isFresh(entry, name) {
        return entry && (Date.now() - entry.at) < ttlOf(name);
    }

    async function loadOne(name, force) {
        if (inflight[name]) return inflight[name];

        inflight[name] = (async function () {
            var cached = force ? null : await cacheGet(name);
            if (force) await cacheDelete(name);

            if (cached) {
                state.data[name] = cached.data;
                state.meta[name] = { at: cached.at, sourceDate: cached.sourceDate, from: 'cache', ok: true };
                if (isFresh(cached, name)) {
                    delete inflight[name];
                    return cached;
                }
            }

            try {
                var entry = await fetchSource(name);
                await cachePut(name, entry);
                state.data[name] = entry.data;
                state.meta[name] = {
                    at: entry.at,
                    sourceDate: entry.sourceDate,
                    from: 'network',
                    ms: entry.ms,
                    ok: true
                };
            } catch (err) {
                state.meta[name] = {
                    at: cached ? cached.at : null,
                    sourceDate: cached ? cached.sourceDate : null,
                    from: cached ? 'cache' : 'none',
                    ok: !!cached,
                    error: String(err && err.message ? err.message : err)
                };
            }
            delete inflight[name];
            notify();
            return state.data[name];
        })();

        return inflight[name];
    }

    /**
     * Carga las fuentes pedidas. Resuelve cuando todas terminaron
     * (de red o de cache) y notifica en cada actualización.
     */
    async function load(names, opts) {
        names = (names && names.length) ? names : Object.keys(state.requested);
        if (!names.length) names = Object.keys(sources());
        opts = opts || {};
        state.status = 'loading';
        names.forEach(function (n) { state.requested[n] = true; });

        await Promise.all(names.map(function (name) { return loadOne(name, !!opts.force); }));

        var missing = names.filter(function (n) {
            var m = state.meta[n];
            return !m || m.ok === false;
        });
        state.status = missing.length === names.length ? 'error' : 'ready';
        state.error = missing.length ? new Error('fuentes sin datos: ' + missing.join(', ')) : null;
        notify();
        return state;
    }

    function subscribe(fn) {
        listeners.push(fn);
        return function () {
            listeners = listeners.filter(function (l) { return l !== fn; });
        };
    }

    /** Edad del dato más viejo entre las fuentes de alta frecuencia. */
    function health() {
        var names = Object.keys(state.meta);
        var fast = names.filter(function (n) { return ttlOf(n) <= 30 * 60 * 1000; });
        var pool = fast.length ? fast : names;
        var stamps = [];
        var failed = [];
        names.forEach(function (n) {
            if (state.meta[n] && state.meta[n].ok === false) failed.push(n);
        });
        pool.forEach(function (n) {
            var m = state.meta[n];
            if (!m) return;
            var stamp = m.sourceDate || m.at;
            if (typeof stamp === 'number') stamps.push(stamp);
            else if (stamp) stamps.push(Date.parse(stamp));
        });
        stamps = stamps.filter(function (t) { return Number.isFinite(t); });
        var oldest = stamps.length ? new Date(Math.min.apply(null, stamps)).toISOString() : null;
        return {
            status: state.status,
            updatedAt: oldest,
            total: names.length,
            failed: failed,
            error: state.error ? String(state.error.message || state.error) : null,
            ok: state.status === 'ready'
        };
    }

    /* ---------------- Accesos ---------------- */

    function get(key, fallback) {
        var value = state.data[key];
        return value === undefined || value === null ? fallback : value;
    }

    function dollarVariation(casa) {
        var hist = get('dolar_hist', {})[casa] || [];
        var serie = hist.filter(function (p) { return Number.isFinite(p.venta); });
        if (serie.length < 2) return null;
        var last = serie[serie.length - 1];
        var prev = serie[serie.length - 2];
        if (!prev.venta) return null;
        return { venta: last.venta, previa: prev.venta, pct: ((last.venta / prev.venta) - 1) * 100, fecha: last.fecha };
    }

    function teaFromTna(tna) {
        if (!Number.isFinite(tna) || tna <= 0) return null;
        return (Math.pow(1 + (tna / 100) * 30 / 365, 365 / 30) - 1) * 100;
    }

    window.ApiService = {
        load: load,
        refresh: function (names) { return load(names || Object.keys(state.requested), { force: true }); },
        subscribe: subscribe,
        get: get,
        all: function () { return state.data; },
        meta: function () { return state.meta; },
        health: health,
        state: state,
        dollarVariation: dollarVariation,
        teaFromTna: teaFromTna,

        getDolares: function () { return get('dolares', []); },
        getUSDProviders: function () { return get('usd_providers', []); },
        getUSDT: function () { return get('usdt', {}); },
        getDolarVariation: function () { return get('dolar_variation', {}); },
        getDolarBonos: function () { return get('dolar_bonos', {}); },
        getGranos: function () { return get('granos', []); },
        getHacienda: function () { return get('hacienda', { categorias: [] }); },
        getFCI: function () { return get('fci_otros', []); },
        getFCIDinero: function () { return get('fci_dinero', []); },
        getPlazoFijo: function () { return get('plazofijo', []); },
        getTasasAR: function () { return get('tasas_ar', []); },
        getBCRATasas: function () { return get('bcra_tasas', {}); },
        getRiesgoPais: function () { return get('riesgo_pais', { serie: [] }); },
        getRiesgoUltimo: function () { return get('riesgo_pais_ultimo', {}); },
        getInflacion: function () { return get('inflacion', []); },
        getUVA: function () { return get('uva', { serie: [] }); },
        getReservas: function () { return get('reservas', { serie: [] }); },
        getStocks: function () { return get('stocks', []); },
        getBonds: function () { return get('bonds', []); },
        getNotes: function () { return get('notes', []); },
        getCedears: function () { return get('cedears', []); },
        getNews: function () { return get('news', []); },
        getNewsExtra: function () { return get('news_extra', []); },
        getDolarHist: function () { return get('dolar_hist', {}); },
        getImplied: function () {
            var mep = get('mep', null);
            var ccl = get('ccl', null);
            var spread = (mep && ccl && mep.ask && ccl.ask) ? ((ccl.ask / mep.ask) - 1) * 100 : null;
            return {
                mep: mep,
                ccl: ccl,
                brecha: spread == null ? null : { mep: mep.ask, ccl: ccl.ask, spread: +spread.toFixed(2) }
            };
        }
    };
})();
