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

    // --- Métodos específicos ---

    async getDolares() {
        return this.getSmartData('dolares', this.URLS.DOLAR_API);
    },

    async getBancos() {
        // Combinamos CriptoYa y ComparaDolar
        const [criptoya, comparadolar] = await Promise.allSettled([
            this.fetchWithProxy(this.URLS.CRIPTOYA_BANCOS),
            this.fetchWithProxy(this.URLS.COMPARADOLAR)
        ]);

        return {
            criptoya: criptoya.status === 'fulfilled' ? criptoya.value : null,
            comparadolar: comparadolar.status === 'fulfilled' ? comparadolar.value : null
        };
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

    async getHacienda() {
        const data = await this.getSmartData('hacienda', this.URLS.HACIENDA, true);
        // decampoacampo devuelve { status: "success", data: [...] }
        return data?.data || data;
    },

    async getGranos() {
        const data = await this.getSmartData('acabase_granos', this.URLS.ACABASE_GRANOS, true);
        // AcaBase devuelve { result: { value: [...] } }
        return data?.result?.value || [];
    }
};

window.ApiService = ApiService;
