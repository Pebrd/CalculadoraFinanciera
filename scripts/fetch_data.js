const fs = require('fs');
const path = require('path');

const APIS = {
    'dolares': 'https://dolarapi.com/v1/dolares',
    'usdt': 'https://criptoya.com/api/usdt/ars/0.1',
    'bancostodos': 'https://criptoya.com/api/bancostodos',
    'comparadolar': 'https://api2.comparadolar.ar/usd',
    'argentinadatos_fci': 'https://api.argentinadatos.com/v1/finanzas/fci/otros/ultimo/',
    'acabase_granos': 'https://s1.dekagb.com/dkmserver.services/html/acabaseservice.aspx?mt=GetPizarras&appname=acabase',
    'plazofijo': 'https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo',
    'hacienda': 'https://www.decampoacampo.com/gh_funciones.php?function=getListadoPreciosGordo'
};

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

const DATA_DIR = path.join(__dirname, '../data');

// Asegurar que el directorio de datos existe
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

async function fetchData(name, url) {
    console.log(`Fetching ${name} from ${url}...`);
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // Agregar timestamp para saber cuándo se actualizó
        const payload = {
            last_updated: new Date().toISOString(),
            data: data
        };

        fs.writeFileSync(
            path.join(DATA_DIR, `${name}.json`), 
            JSON.stringify(payload, null, 2)
        );
        console.log(`Successfully saved ${name}.json`);
    } catch (error) {
        console.error(`Error fetching ${name}:`, error.message);
    }
}

async function fetchNews() {
    console.log('Fetching news feeds...');
    let allArticles = [];

    for (const [category, feeds] of Object.entries(NEWS_FEEDS)) {
        for (const feed of feeds) {
            console.log(`Fetching ${feed.name} (${category})...`);
            try {
                const response = await fetch(feed.url, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                const xmlText = await response.text();
                
                // Parser simple de RSS (Regex)
                const items = xmlText.match(/<item>([\s\S]*?)<\/item>/g) || [];
                
                const articles = items.map(item => {
                    const getTag = (tag) => {
                        const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
                        // Limpiar CDATA si existe
                        return match ? match[1].replace('<![CDATA[', '').replace(']]>', '').trim() : '';
                    };

                    const title = getTag('title');
                    const link = getTag('link');
                    const pubDate = getTag('pubDate');
                    const description = getTag('description').replace(/<[^>]*>?/gm, '').substring(0, 200);
                    
                    return {
                        source: feed.name,
                        category: category,
                        title,
                        link,
                        date: new Date(pubDate).getTime(),
                        description: description + (description.length >= 200 ? '...' : '')
                    };
                }).filter(a => a.title && a.link);

                allArticles = [...allArticles, ...articles];
                await new Promise(r => setTimeout(r, 200)); // Rate limiting light
            } catch (error) {
                console.error(`Error fetching ${feed.name}:`, error.message);
            }
        }
    }

    // Ordenar por fecha y deduplicar
    allArticles.sort((a, b) => b.date - a.date);
    const seen = new Set();
    const uniqueArticles = allArticles.filter(a => {
        const k = a.title.toLowerCase().trim();
        return seen.has(k) ? false : seen.add(k);
    }).slice(0, 100); // Guardamos los últimos 100

    fs.writeFileSync(
        path.join(DATA_DIR, 'news.json'),
        JSON.stringify({
            last_updated: new Date().toISOString(),
            articles: uniqueArticles
        }, null, 2)
    );
    console.log(`Saved ${uniqueArticles.length} news articles.`);
}

async function main() {
    const coreFinanzas = {
        last_updated: new Date().toISOString(),
        data: {}
    };

    for (const [name, url] of Object.entries(APIS)) {
        console.log(`Fetching ${name} from ${url}...`);
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            const payload = {
                last_updated: new Date().toISOString(),
                data: data
            };

            fs.writeFileSync(
                path.join(DATA_DIR, `${name}.json`), 
                JSON.stringify(payload, null, 2)
            );
            
            // Guardar en el bundle consolidado
            coreFinanzas.data[name] = data;
            console.log(`Successfully saved ${name}.json`);
        } catch (error) {
            console.error(`Error fetching ${name}:`, error.message);
        }
        // Pequeño delay para no saturar APIs
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Guardar el bundle consolidado para carga ultra-rápida
    fs.writeFileSync(
        path.join(DATA_DIR, 'finanzas.json'),
        JSON.stringify(coreFinanzas, null, 2)
    );
    console.log('Successfully saved consolidated finanzas.json');

    await fetchNews();
}

main();
