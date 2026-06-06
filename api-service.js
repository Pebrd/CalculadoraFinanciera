/**
 * API Service for Calculadora Financiera
 * Centralizes all data fetching logic with support for:
 * - Local static data (from GitHub Actions)
 * - Remote API fallbacks
 * - Proxy rotation
 * - Caching
 */

const ApiService = {
    // Configuración de URLs
    URLS: {
        DOLAR_API: 'https://dolarapi.com/v1/dolares',
        CRIPTOYA_BANCOS: 'https://criptoya.com/api/bancostodos',
        CRIPTOYA_USDT: 'https://criptoya.com/api/usdt/ars/0.1',
        COMPARADOLAR: 'https://api2.comparadolar.ar/usd',
        ARG_DATOS_FCI: 'https://api.argentinadatos.com/v1/finanzas/fci/otros/ultimo/',
        TASAS_AR: 'https://space.tasas.ar/api/bancos-digitales?include_uri=1',
        ARG_DATOS_PF: 'https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo',
        ACABASE_GRANOS: 'https://s1.dekagb.com/dkmserver.services/html/acabaseservice.aspx?mt=GetPizarras&appname=acabase',
        HACIENDA: 'https://www.decampoacampo.com/gh_funciones.php?function=getListadoPreciosGordo',
        YAHOO_QUOTE: 'https://query2.finance.yahoo.com/v7/finance/quote',
        DATOS_FINANCIEROS: 'https://space.tasas.ar/api/bancos-digitales',
        // Datos estáticos generados por GitHub Actions
        STATIC_DATA: './data/'
    },

    // Proxies para evitar CORS
    PROXIES: [
        (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`
    ],

    /**
     * Intenta obtener datos de una URL, rotando proxies si es necesario
     */
    async fetchWithProxy(url, useProxy = true) {
        if (!useProxy) {
            const res = await fetch(url);
            if (res.ok) return await res.json();
            throw new Error(`Failed to fetch ${url}`);
        }

        // Primero intentar directo
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn(`Direct fetch failed for ${url}, trying proxies...`);
        }

        // Luego intentar con cada proxy
        for (const proxy of this.PROXIES) {
            try {
                const res = await fetch(proxy(url), { signal: AbortSignal.timeout(8000) });
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn(`Proxy failed for ${url}`);
            }
        }
        throw new Error(`All fetch attempts failed for ${url}`);
    },

    // Datos consolidados cargados al inicio
    _coreData: null,
    _lastUpdated: null,

    /**
     * Carga el bundle consolidado de finanzas (una sola descarga)
     */
    async init() {
        if (this._coreData) return this._coreData;
        try {
            const res = await fetch(`${this.URLS.STATIC_DATA}finanzas.json`);
            if (res.ok) {
                const payload = await res.json();
                this._coreData = payload.data;
                this._lastUpdated = new Date(payload.last_updated);
                console.log('[ApiService] Bundle finanzas.json cargado correctamente');
            }
        } catch (e) {
            console.warn('[ApiService] No se pudo cargar el bundle consolidado');
        }
        return this._coreData;
    },

    /**
     * Obtiene datos intentando primero el archivo estático (GitHub Actions)
     * y si es viejo (> 30 min) o no existe, cae a la API real.
     * Optimizado para mostrar datos locales inmediatamente.
     */
    async getSmartData(apiName, fallbackUrl, useProxy = false) {
        // Asegurar que el bundle esté cargado
        if (!this._coreData) await this.init();

        // 1. Intentar cache en memoria (primero el bundle, luego el cache manual)
        let data = this._coreData ? this._coreData[apiName] : null;
        if (!data) {
            data = window.CalculadoraFinanciera?.Cache.get(apiName);
        }

        // 2. Verificar frescura (si pasaron > 30 min desde el último update estático)
        const isOld = this._lastUpdated && (new Date() - this._lastUpdated > 30 * 60 * 1000);

        // 3. Si hay datos locales, retornarlos inmediatamente
        if (data) {
            // Actualizar en background si está viejo (sin esperar)
            if (isOld) {
                this._updateInBackground(apiName, fallbackUrl, useProxy);
            }
            return data;
        }

        // 4. Si no hay datos locales, intentar fetch en vivo
        try {
            const liveData = await this.fetchWithProxy(fallbackUrl, useProxy);
            console.log(`[ApiService] ${apiName} actualizado en vivo`);
            return liveData;
        } catch (e) {
            console.warn(`[ApiService] Falló fetch para ${apiName}`);
            return null;
        }
    },

    // Actualiza en background sin bloquear
    async _updateInBackground(apiName, fallbackUrl, useProxy) {
        try {
            const liveData = await this.fetchWithProxy(fallbackUrl, useProxy);
            console.log(`[ApiService] ${apiName} actualizado en background`);
            if (this._coreData) this._coreData[apiName] = liveData;
            if (window.CalculadoraFinanciera?.Cache) {
                window.CalculadoraFinanciera.Cache.set(apiName, liveData);
            }
        } catch (e) {
            // Silencioso - no bloquea la UI
        }
    },

    // Símbolos para Yahoo Finance
    SYMBOLS: {
        stocks: [
            'GGAL.BA', 'YPFD.BA', 'PAMP.BA', 'TECO2.BA', 'BBVA.BA',
            'SUPV.BA', 'BMA.BA', 'CEPU.BA', 'MIRG.BA', 'LOMA.BA',
            'ALUA.BA', 'TXAR.BA', 'EDN.BA', 'CRES.BA', 'AGRO.BA',
            'TGSU2.BA', 'MOLI.BA', 'CECO2.BA'
        ],
        commodities: ['GC=F', 'CL=F', 'BZ=F', 'ZS=F', 'ZC=F', 'ZW=F']
    },

    STOCK_NAMES: {
        'GGAL.BA': 'Grupo Financiero Galicia',
        'YPFD.BA': 'YPF',
        'PAMP.BA': 'Pampa Energía',
        'TECO2.BA': 'Telecom Argentina',
        'BBVA.BA': 'BBVA Argentina',
        'SUPV.BA': 'Grupo Supervielle',
        'BMA.BA': 'Banco Macro',
        'CEPU.BA': 'Central Puerto',
        'MIRG.BA': 'Mirgor',
        'LOMA.BA': 'Loma Negra',
        'ALUA.BA': 'Aluminio',
        'TXAR.BA': 'Ternium Argentina',
        'EDN.BA': 'Edenor',
        'CRES.BA': 'Cresud',
        'AGRO.BA': 'Agro',
        'TGSU2.BA': 'TGS',
        'MOLI.BA': 'Molinos',
        'CECO2.BA': 'Ceco2',
        'GC=F': 'Oro',
        'CL=F': 'Petróleo WTI',
        'BZ=F': 'Petróleo Brent',
        'ZS=F': 'Soja',
        'ZC=F': 'Maíz',
        'ZW=F': 'Trigo'
    },

    async getYahooQuotes(symbols) {
        const url = `${this.URLS.YAHOO_QUOTE}?symbols=${symbols.join(',')}`;
        const data = await this.fetchWithProxy(url, true);
        if (data?.quoteResponse?.result) {
            return data.quoteResponse.result;
        }
        throw new Error('Respuesta inválida de Yahoo Finance');
    },

    async getStocks() {
        const quotes = await this.getYahooQuotes(this.SYMBOLS.stocks);
        return this._transformYahooQuotes(quotes);
    },

    async getCommodities() {
        const quotes = await this.getYahooQuotes(this.SYMBOLS.commodities);
        return this._transformYahooQuotes(quotes);
    },

    _transformYahooQuotes(quotes) {
        const result = {};
        quotes.forEach(q => {
            const symbol = q.symbol || q.underlyingSymbol;
            result[symbol] = {
                name: this.STOCK_NAMES[symbol] || q.shortName || symbol,
                price: q.regularMarketPrice,
                change: q.regularMarketChange,
                pct_change: q.regularMarketChangePercent,
                timestamp: new Date(q.regularMarketTime * 1000).toISOString()
            };
        });
        return result;
    },

    async getHacienda() {
        // Live first — browser direct, proxies como fallback
        try {
            const live = await this.fetchWithProxy(this.URLS.HACIENDA, true);
            if (live?.data?.length) return live.data;
        } catch (e) {
            console.warn('[ApiService] Hacienda live falló, usando bundle');
        }
        // Fallback bundle
        const bundle = await this.getSmartData('hacienda', this.URLS.HACIENDA, true);
        return bundle?.data || bundle || [];
    },

    // --- Métodos específicos ---

    async getDolares() {
        return this.getSmartData('dolares', this.URLS.DOLAR_API);
    },

    async getBancos() {
        const data = await this.getSmartData('bancostodos', this.URLS.CRIPTOYA_BANCOS);
        return { criptoya: data, comparadolar: null };
    },

    async getUSDT() {
        return this.getSmartData('usdt', this.URLS.CRIPTOYA_USDT);
    },

    async getTasas() {
        const [argDatos, tasasAr] = await Promise.allSettled([
            this.getSmartData('argentinadatos_fci', this.URLS.ARG_DATOS_FCI),
            this.fetchWithProxy(this.URLS.TASAS_AR, true) // Tasas.ar no lo tenemos estático aún
        ]);

        return {
            argDatos: argDatos.status === 'fulfilled' ? argDatos.value : null,
            tasasAr: tasasAr.status === 'fulfilled' ? tasasAr.value : null
        };
    },

    async getGranos() {
        const data = await this.getSmartData('acabase_granos', this.URLS.ACABASE_GRANOS, true);
        // AcaBase devuelve { result: { value: [...] } }
        return data?.result?.value || [];
    }
};

window.ApiService = ApiService;
