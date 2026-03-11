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
        ARG_DATOS_GRANOS: 'https://api.argentinadatos.com/v1/finanzas/indices/pizarra',
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

    /**
     * Obtiene datos intentando primero el archivo estático (GitHub Actions)
     * y luego cayendo a la API real.
     */
    async getSmartData(apiName, fallbackUrl, useProxy = false) {
        const staticUrl = `${this.URLS.STATIC_DATA}${apiName}.json`;
        
        // 1. Intentar cache en memoria
        const cached = window.CalculadoraFinanciera?.Cache.get(apiName);
        if (cached) return cached;

        let data = null;

        // 2. Intentar datos estáticos (GitHub Actions)
        try {
            const res = await fetch(staticUrl);
            if (res.ok) {
                const payload = await res.json();
                // Importante: extraemos .data porque nuestro script de fetch_data lo guarda así
                data = payload.data; 
                console.log(`[ApiService] ${apiName} cargado desde datos estáticos`);
            }
        } catch (e) {
            console.warn(`[ApiService] No se pudo cargar dato estático para ${apiName}`);
        }

        // 3. Fallback a API en vivo
        if (!data) {
            try {
                data = await this.fetchWithProxy(fallbackUrl, useProxy);
                console.log(`[ApiService] ${apiName} cargado en vivo`);
            } catch (e) {
                console.error(`[ApiService] Error total cargando ${apiName}:`, e);
                throw e;
            }
        }

        // 4. Guardar en cache
        if (data && window.CalculadoraFinanciera?.Cache) {
            window.CalculadoraFinanciera.Cache.set(apiName, data);
        }

        return data;
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
    }
};

window.ApiService = ApiService;
