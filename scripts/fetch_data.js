const fs = require('fs');
const path = require('path');

const APIS = {
    'dolares': 'https://dolarapi.com/v1/dolares',
    'usdt': 'https://criptoya.com/api/usdt/ars/0.1',
    'bancostodos': 'https://criptoya.com/api/bancostodos',
    'comparadolar': 'https://api2.comparadolar.ar/usd',
    'argentinadatos_fci': 'https://api.argentinadatos.com/v1/finanzas/fci/otros/ultimo/',
    'argentinadatos_granos': 'https://api.argentinadatos.com/v1/finanzas/indices/pizarra',
    'plazofijo': 'https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo',
    'hacienda': 'https://www.decampoacampo.com/gh_funciones.php?function=getListadoPreciosGordo'
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

async function main() {
    for (const [name, url] of Object.entries(APIS)) {
        await fetchData(name, url);
        // Pequeño delay para no saturar APIs
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

main();
