const fs = require('fs');
const path = require('path');

const GROUPS = {
    quotes: {
        'dolares': 'https://dolarapi.com/v1/dolares',
        'usdt': 'https://criptoya.com/api/usdt/ars/0.1',
        'bancostodos': 'https://criptoya.com/api/bancostodos',
        'comparadolar': 'https://api2.comparadolar.ar/usd'
    },
    agro_fast: {
        'acabase_granos': 'https://s1.dekagb.com/dkmserver.services/html/acabaseservice.aspx?mt=GetPizarras&appname=acabase'
    },
    agro_slow: {
        'hacienda': 'https://www.decampoacampo.com/gh_funciones.php?function=getListadoPreciosGordo'
    },
    rates: {
        'argentinadatos_fci': 'https://api.argentinadatos.com/v1/finanzas/fci/otros/ultimo/',
        'plazofijo': 'https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo'
    }
};

const DATA_DIR = path.join(__dirname, '../data');
const BUNDLE_PATH = path.join(DATA_DIR, 'finanzas.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

async function fetchWithRetry(url, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(10000)
            });
            if (response.ok) return await response.json();
        } catch (e) {
            if (i === retries) throw e;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

async function run() {
    const args = process.argv.slice(2);
    const mode = args[0] || '--all'; // --quotes, --agro, --rates, --news, --all

    // Cargar bundle actual para actualización incremental
    let bundle = { last_updated: new Date().toISOString(), data: {} };
    if (fs.existsSync(BUNDLE_PATH)) {
        try {
            bundle = JSON.parse(fs.readFileSync(BUNDLE_PATH, 'utf8'));
        } catch (e) { console.error("Error leyendo bundle actual"); }
    }

    // Determinar qué grupos procesar
    let groupsToProcess = [];
    if (mode === '--quotes') groupsToProcess = ['quotes'];
    else if (mode === '--agro') groupsToProcess = ['agro_fast', 'agro_slow'];
    else if (mode === '--pizarra') groupsToProcess = ['agro_fast'];
    else if (mode === '--rates') groupsToProcess = ['rates'];
    else groupsToProcess = Object.keys(GROUPS);

    console.log(`Modo: ${mode}. Procesando grupos: ${groupsToProcess.join(', ')}`);

    for (const groupName of groupsToProcess) {
        for (const [name, url] of Object.entries(GROUPS[groupName])) {
            console.log(`Fetching ${name}...`);
            try {
                const data = await fetchWithRetry(url);
                bundle.data[name] = data;
                
                // Guardar archivo individual por compatibilidad
                fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify({
                    last_updated: new Date().toISOString(),
                    data: data
                }, null, 2));
            } catch (e) {
                console.error(`Error en ${name}: ${e.message}`);
            }
        }
    }

    // Guardar bundle actualizado
    bundle.last_updated = new Date().toISOString();
    fs.writeFileSync(BUNDLE_PATH, JSON.stringify(bundle, null, 2));

    // Si es modo --all o --news, procesar noticias
    if (mode === '--all' || mode === '--news') {
        await fetchNews();
    }
}

// Re-uso de la función fetchNews que ya teníamos (la incluyo aquí simplificada por brevedad)
async function fetchNews() {
    console.log('Fetching news...');
    // ... (Mantengo la misma lógica de news que ya implementamos)
    // Pero por brevedad en este write_file, asumo que la función está definida o la pego completa si es necesario
}

// Nota: He pegado la lógica de news completa para que el archivo sea funcional
const NEWS_FEEDS = {
    'Economía': [
        { name: 'Ámbito', url: 'https://www.ambito.com/rss/pages/economia.xml' },
        { name: 'El Economista', url: 'https://eleconomista.com.ar/economia/feed/' },
        { name: 'iProfesional', url: 'https://www.iprofesional.com/rss/economia.xml' },
        { name: 'La Nación', url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/?outputType=xml' },
        { name: 'Infobae', url: 'https://www.infobae.com/feeds/rss/' }
    ],
    'Mercados': [
        { name: 'Ámbito', url: 'https://www.ambito.com/rss/pages/finanzas.xml' },
        { name: 'Cronista', url: 'https://www.cronista.com/files/rss/mercados.xml' },
        { name: 'Investing.com', url: 'https://es.investing.com/rss/news_25.rss' }
    ],
    'Política': [
        { name: 'Ámbito', url: 'https://www.ambito.com/rss/pages/politica.xml' },
        { name: 'Derecha Diario', url: 'https://derechadiario.com.ar/rss/cat/politica' }
    ]
};

async function fetchNews() {
    let allArticles = [];
    for (const [category, feeds] of Object.entries(NEWS_FEEDS)) {
        for (const feed of feeds) {
            try {
                const response = await fetch(feed.url);
                const xmlText = await response.text();
                const items = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];
                const articles = items.map(item => {
                    const getTag = (tag) => {
                        const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
                        return match ? match[1].replace('<![CDATA[', '').replace(']]>', '').trim() : '';
                    };
                    const description = getTag('description').replace(/<[^>]*>?/gm, '').substring(0, 200);
                    return {
                        source: feed.name,
                        category: category,
                        title: getTag('title'),
                        link: getTag('link'),
                        date: new Date(getTag('pubDate')).getTime(),
                        description: description + (description.length >= 200 ? '...' : '')
                    };
                }).filter(a => a.title && a.link);
                allArticles = [...allArticles, ...articles];
            } catch (e) {}
        }
    }
    allArticles.sort((a, b) => b.date - a.date);
    const seen = new Set();
    const unique = allArticles.filter(a => seen.has(a.title.toLowerCase()) ? false : seen.add(a.title.toLowerCase())).slice(0, 100);
    fs.writeFileSync(path.join(DATA_DIR, 'news.json'), JSON.stringify({ last_updated: new Date().toISOString(), articles: unique }, null, 2));
}

run();
