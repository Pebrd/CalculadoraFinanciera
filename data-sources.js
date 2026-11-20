/**
 * Pampa Finance — fuentes de datos
 * ---------------------------------------------------------------
 * Cada fuente se pide directo desde el navegador, se normaliza acá y
 * se cachea en el dispositivo. No hay archivos de datos en el repo.
 *
 * Contrato de una fuente:
 *   url | fetch   origen (JSON) o función propia
 *   ttl           milisegundos de vida útil
 *   transform     normaliza la respuesta cruda
 *   dateOf        fecha real del dato (si la fuente la publica)
 *   proxy         'jina' para orígenes sin CORS
 */
(function () {
    'use strict';

    var MIN = 60 * 1000;

    function round(n, d) {
        return Number.isFinite(+n) ? +(+n).toFixed(d == null ? 2 : d) : null;
    }

    function sortDesc(arr, pick) {
        return arr.slice().sort(function (a, b) { return (pick(b) || 0) - (pick(a) || 0); });
    }

    function median(values) {
        var nums = values.filter(Number.isFinite).sort(function (a, b) { return a - b; });
        if (!nums.length) return null;
        var mid = Math.floor(nums.length / 2);
        return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
    }

    function daysAgoISO(days) {
        var d = new Date();
        d.setUTCDate(d.getUTCDate() - days);
        return d.toISOString().slice(0, 10);
    }

    function todayISO() {
        return new Date().toISOString().slice(0, 10);
    }

    /* ------------------------------------------------------------------
       Transformaciones
       ------------------------------------------------------------------ */

    var T = {
        dolares: function (raw) {
            return (raw || []).map(function (d) {
                return {
                    casa: d.casa,
                    nombre: d.nombre,
                    compra: round(d.compra),
                    venta: round(d.venta),
                    fecha: d.fechaActualizacion
                };
            }).filter(function (d) { return d.casa; });
        },

        usd_providers: function (raw) {
            return (raw || []).filter(function (p) { return Number(p.ask) > 0; }).map(function (p) {
                return {
                    slug: p.slug,
                    nombre: p.prettyName || p.name,
                    logo: p.logoUrl || null,
                    compra: round(p.bid),
                    venta: round(p.ask),
                    variacion: round(p.pct_variation, 3),
                    tipo: p.usdType || null,
                    esBanco: !!p.isBank,
                    stale: !!p.stale
                };
            }).sort(function (a, b) { return a.venta - b.venta; });
        },

        usdt: function (raw) {
            var out = {};
            Object.keys(raw || {}).forEach(function (k) {
                var v = raw[k];
                if (Number(v.ask) > 0 && Number(v.bid) > 0) {
                    out[k] = { ask: round(v.ask), bid: round(v.bid) };
                }
            });
            return out;
        },

        granos: function (raw) {
            var rows = (raw && raw.result && raw.result.value) || [];
            return rows.map(function (g) {
                return {
                    producto: g.producto,
                    nombre: String(g.nombre || '').trim(),
                    puerto: g.puerto,
                    precio: round(g.importe, 0),
                    variacion: round(g.dif, 0),
                    fecha: g.fecha,
                    hora: g.hora
                };
            }).filter(function (g) { return g.producto; }).sort(function (a, b) { return b.precio - a.precio; });
        },

        hacienda: function (raw) {
            return {
                fecha: raw.hoy || null,
                dolarOficial: round(raw.cotizacion_semana_actual),
                dolarBlue: round(raw.cotizacion_blue_semana_actual),
                categorias: (raw.data || []).map(function (c) {
                    return {
                        categoria: c.categoria,
                        precioArs: round(parseFloat(c.precio_semana_1), 0),
                        precioAnteriorArs: round(parseFloat(c.precio_semana_2), 0),
                        precioUsd: round(parseFloat(c.precio_semana_1_usd), 2),
                        precioBlue: round(parseFloat(c.precio_semana_1_blue), 2),
                        cabezas: c.cantidad_semana_1
                    };
                }).filter(function (c) { return c.categoria; })
            };
        },

        fci_otros: function (raw) {
            return (raw || []).map(function (f) {
                return {
                    fondo: f.fondo,
                    tna: round(Number(f.tna) * 100, 2),
                    tea: f.tea != null ? round(Number(f.tea) * 100, 2) : null,
                    tope: f.tope || null,
                    fecha: f.fecha,
                    condiciones: f.condiciones || ''
                };
            }).filter(function (f) { return f.fondo && f.tna > 0; })
                .sort(function (a, b) { return b.tna - a.tna; })
                .slice(0, 40);
        },

        fci_dinero: function (raw) {
            return sortDesc(raw || [], function (f) { return Number(f.patrimonio); }).slice(0, 25).map(function (f) {
                return {
                    fondo: f.fondo,
                    horizonte: f.horizonte,
                    fecha: f.fecha,
                    patrimonio: round(Number(f.patrimonio), 0),
                    cuota: round(Number(f.vcp), 4)
                };
            });
        },

        plazofijo: function (raw) {
            return (raw || []).map(function (b) {
                return {
                    entidad: b.entidad,
                    // El BCRA publica los logos por http; en https quedan bloqueados.
                    logo: b.logo ? String(b.logo).replace(/^http:/, 'https:') : null,
                    tnaClientes: b.tnaClientes != null ? round(Number(b.tnaClientes) * 100, 2) : null,
                    tnaNoClientes: b.tnaNoClientes != null ? round(Number(b.tnaNoClientes) * 100, 2) : null,
                    enlace: b.enlace || null
                };
            }).filter(function (b) { return (b.tnaClientes || 0) > 0 || (b.tnaNoClientes || 0) > 0; })
                .sort(function (a, b) { return (b.tnaClientes || b.tnaNoClientes) - (a.tnaClientes || a.tnaNoClientes); });
        },

        tasas_ar: function (raw) {
            return (raw.data || []).map(function (t) {
                var base = Number(t.tna);
                var bonif = (t.tna_conditions || [])
                    .filter(function (c) { return Number(c.tna_value) > 0; })
                    .sort(function (a, b) { return Number(b.tna_value) - Number(a.tna_value); })[0];
                var bonifTna = bonif ? Number(bonif.tna_value) : null;
                return {
                    nombre: t.name,
                    tipo: t.type,
                    logo: t.logo || null,
                    tna: round(base, 2),
                    tnaBonif: bonifTna && bonifTna > base ? round(bonifTna, 2) : null,
                    tope: bonif && bonif.max_amount ? round(Number(bonif.max_amount), 0) : (t.maxAmount ? round(Number(t.maxAmount), 0) : null),
                    condicion: bonif ? (bonif.description || '') : ''
                };
            }).filter(function (t) { return t.nombre && t.tna > 0; })
                .sort(function (a, b) { return b.tna - a.tna; });
        },

        /** Tasas de referencia del BCRA: depósitos a 30 días y BADLAR. */
        bcra_tasas: function (raw) {
            var out = {};
            (raw || []).forEach(function (item) {
                var serie = (item.detalle || []).filter(function (p) { return Number.isFinite(+p.valor); });
                if (!serie.length) return;
                out[item.idVariable] = {
                    valor: round(serie[0].valor, 2),
                    fecha: serie[0].fecha,
                    anterior: serie[1] ? round(serie[1].valor, 2) : null
                };
            });
            return {
                depositos30: out[12] || null,
                badlar: out[7] || null
            };
        },

        riesgo_pais_ultimo: function (raw) {
            return { valor: round(raw.valor, 0), fecha: raw.fecha };
        },

        riesgo_pais: function (raw) {
            var serie = (raw || []).filter(function (p) { return p.fecha && Number.isFinite(+p.valor); })
                .slice(-500)
                .map(function (p) { return { fecha: p.fecha, valor: round(p.valor, 0) }; });
            var ultimo = serie[serie.length - 1] || null;
            return {
                valor: ultimo ? ultimo.valor : null,
                fecha: ultimo ? ultimo.fecha : null,
                anterior: serie.length > 1 ? serie[serie.length - 2].valor : null,
                serie: serie
            };
        },

        inflacion: function (raw) {
            return (raw || []).filter(function (p) { return Number.isFinite(+p.valor); })
                .slice(-72)
                .map(function (p) { return { fecha: p.fecha, valor: round(p.valor, 2) }; });
        },

        /** UVA del BCRA: la serie publica valores futuros, se toma el último <= hoy. */
        uva: function (raw) {
            var detalle = (raw && raw.results && raw.results[0] && raw.results[0].detalle) || [];
            var hoy = todayISO();
            var serie = detalle
                .filter(function (p) { return Number.isFinite(+p.valor) && p.fecha <= hoy; })
                .map(function (p) { return { fecha: p.fecha, valor: round(p.valor, 2) }; })
                .sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
            var ultimo = serie[serie.length - 1] || null;
            return {
                valor: ultimo ? ultimo.valor : null,
                fecha: ultimo ? ultimo.fecha : null,
                anterior: serie.length > 1 ? serie[serie.length - 2].valor : null,
                serie: serie
            };
        },

        reservas: function (raw) {
            var detalle = (raw && raw.results && raw.results[0] && raw.results[0].detalle) || [];
            var serie = detalle.filter(function (p) { return Number.isFinite(+p.valor); })
                .map(function (p) { return { fecha: p.fecha, valor: round(p.valor, 0) }; })
                .sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
            var ultimo = serie[serie.length - 1] || null;
            return {
                valor: ultimo ? ultimo.valor : null,
                fecha: ultimo ? ultimo.fecha : null,
                anterior: serie.length > 1 ? serie[serie.length - 2].valor : null,
                serie: serie
            };
        },

        implied: function (raw, bidKey, askKey) {
            var rows = sortDesc(raw || [], function (r) { return Number(r.v_ars || r.ars_volume); }).slice(0, 15);
            return {
                bid: round(median(rows.map(function (r) { return Number(r[bidKey]); })), 2),
                ask: round(median(rows.map(function (r) { return Number(r[askKey]); })), 2),
                operaciones: rows.length
            };
        },

        dolar_hist: function (raw) {
            var since = daysAgoISO(120);
            var casas = { blue: 1, oficial: 1, bolsa: 1, contadoconliqui: 1 };
            var out = {};
            (raw || []).forEach(function (row) {
                if (!casas[row.casa] || row.fecha < since) return;
                (out[row.casa] = out[row.casa] || []).push({ fecha: row.fecha, venta: round(row.venta) });
            });
            return out;
        }
    };

    /* ------------------------------------------------------------------
       Noticias: RSS pedido por r.jina.ai en texto plano (CORS ok),
       parseado en el navegador. Sin intermediarios con cuota compartida.
       ------------------------------------------------------------------ */

    var FEEDS_PRIORITY = [
        { source: 'Ámbito', category: 'Economía', url: 'https://www.ambito.com/rss/pages/economia.xml' },
        { source: 'Ámbito', category: 'Mercados', url: 'https://www.ambito.com/rss/pages/finanzas.xml' },
        { source: 'iProfesional', category: 'Mercados', url: 'https://www.iprofesional.com/rss/finanzas.xml' },
        { source: 'El Economista', category: 'Economía', url: 'https://eleconomista.com.ar/economia/feed/' },
        { source: 'La Nación', category: 'Economía', url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/?outputType=xml' }
    ];

    var FEEDS_EXTRA = [
        { source: 'Clarín', category: 'Economía', url: 'https://www.clarin.com/rss/economia/' },
        { source: 'Infobae', category: 'Economía', url: 'https://www.infobae.com/arc/outboundfeeds/rss/category/economia/?outputType=xml' },
        { source: 'Cronista', category: 'Economía', url: 'https://www.cronista.com/arc/outboundfeeds/rss/' },
        { source: 'BAE Negocios', category: 'Negocios', url: 'https://www.baenegocios.com/feed/' },
        { source: 'Ámbito', category: 'Negocios', url: 'https://www.ambito.com/rss/pages/negocios.xml' }
    ];

    var ENTITIES = {
        amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ntilde: 'ñ', aacute: 'á',
        eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É', Iacute: 'Í',
        Oacute: 'Ó', Uacute: 'Ú', uuml: 'ü', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
        ndash: '–', mdash: '—', hellip: '…', deg: '°', euro: '€'
    };

    function decodeEntities(text) {
        return String(text || '')
            .replace(/&#x([0-9a-f]+);/gi, function (_, hex) { return String.fromCodePoint(parseInt(hex, 16)); })
            .replace(/&#(\d+);/g, function (_, dec) { return String.fromCodePoint(parseInt(dec, 10)); })
            .replace(/&([a-z]+);/gi, function (m, name) { return ENTITIES[name] || m; });
    }

    function cleanText(html) {
        return decodeEntities(
            String(html || '')
                .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<[^>]+>/g, ' ')
        ).replace(/\s+/g, ' ').trim();
    }

    function toISO(pubDate) {
        if (!pubDate) return null;
        var s = String(pubDate).trim();
        // "2026-11-19 16:28:00" necesita la T; "Thu, 19 Nov 2026 16:28:00 GMT" ya es válido.
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) s = s.replace(' ', 'T');
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)) s += 'Z';
        var ts = Date.parse(s);
        return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
    }

    function xmlTag(block, name) {
        var re = new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i');
        var m = block.match(re);
        if (!m) return '';
        return m[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1').trim();
    }

    /** Parsea RSS 2.0 y Atom sin dependencias. */
    function parseRssXml(xml, feed) {
        var blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/(?:item|entry)>/gi) || [];
        return blocks.map(function (block) {
            var title = cleanText(xmlTag(block, 'title'));
            var href = (block.match(/<link[^>]*href="([^"]+)"/i) || [])[1];
            var link = href || cleanText(xmlTag(block, 'link')) || cleanText(xmlTag(block, 'guid'));
            var dateRaw = xmlTag(block, 'pubDate') || xmlTag(block, 'published') || xmlTag(block, 'updated') || xmlTag(block, 'dc:date');
            var desc = cleanText(xmlTag(block, 'description') || xmlTag(block, 'summary') || xmlTag(block, 'content'));
            return {
                source: feed.source,
                category: feed.category,
                title: title,
                link: link,
                date: toISO(dateRaw),
                description: desc.slice(0, 240)
            };
        }).filter(function (a) { return a.title && /^https?:\/\//.test(a.link || ''); });
    }

    /** Baja el XML del feed por r.jina.ai, que sí manda CORS. */
    async function fetchFeedXml(url) {
        var res = await fetch('https://r.jina.ai/' + url, {
            headers: { 'x-return-format': 'text' },
            signal: AbortSignal.timeout(25000)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var text = await res.text();
        if (text.indexOf('<') === -1) throw new Error('respuesta no XML');
        return text;
    }

    /**
     * Fuente de noticias a partir de un grupo de feeds.
     * Se piden de a dos en paralelo para no castigar el proxy.
     */
    function makeNewsSource(feeds) {
        return {
            ttl: 15 * 60 * 1000,
            fetch: async function () {
                var articles = [];
                var failures = 0;

                for (var i = 0; i < feeds.length; i += 2) {
                    var batch = feeds.slice(i, i + 2);
                    var results = await Promise.all(batch.map(function (feed) {
                        return fetchFeedXml(feed.url).then(function (xml) {
                            return parseRssXml(xml, feed);
                        }).catch(function () { return null; });
                    }));

                    results.forEach(function (items, idx) {
                        if (items && items.length) articles = articles.concat(items);
                        else failures++;
                    });
                }

                if (!articles.length) throw new Error('sin artículos');

                articles.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

                var seen = {};
                var perSource = {};
                var out = [];
                for (var j = 0; j < articles.length && out.length < 70; j++) {
                    var item = articles[j];
                    var key = (item.title || '').toLowerCase().replace(/\s+/g, ' ').trim();
                    if (!key || seen[key]) continue;
                    var src = item.source || '—';
                    if ((perSource[src] || 0) >= 10) continue;
                    seen[key] = 1;
                    perSource[src] = (perSource[src] || 0) + 1;
                    out.push(item);
                }

                return { articles: out, failedFeeds: failures, totalFeeds: feeds.length };
            },
            transform: function (raw) { return raw.articles; },
            dateOf: function (raw, data) {
                var dates = (data || []).map(function (a) { return a.date; }).filter(Boolean).sort();
                return dates.length ? dates[dates.length - 1] : null;
            }
        };
    }

    /* ------------------------------------------------------------------
       Registro
       ------------------------------------------------------------------ */

    var SOURCES = {
        /* --- cotizaciones --- */
        dolares: {
            group: 'quotes', ttl: 60 * 1000,
            url: 'https://dolarapi.com/v1/dolares',
            transform: T.dolares,
            dateOf: function (d) {
                var last = d.map(function (x) { return x.fecha; }).filter(Boolean).sort().pop();
                return last || null;
            }
        },
        usd_providers: {
            group: 'quotes', ttl: 60 * 1000,
            url: 'https://api.comparadolar.ar/usd',
            transform: T.usd_providers
        },
        usdt: {
            group: 'quotes', ttl: 60 * 1000,
            url: 'https://criptoya.com/api/usdt/ars/0.1',
            transform: T.usdt
        },
        /** Variación diaria de las casas que publica CriptoYa. */
        dolar_variation: {
            group: 'quotes', ttl: 5 * 60 * 1000,
            url: 'https://criptoya.com/api/dolar',
            transform: function (raw) {
                var out = {};
                ['oficial', 'blue', 'tarjeta', 'mayorista'].forEach(function (k) {
                    var item = raw && raw[k];
                    if (!item) return;
                    var price = Number(item.price);
                    var variation = Number(item.variation);
                    if (price > 0 || Number.isFinite(variation)) {
                        out[k] = {
                            precio: price > 0 ? round(price, 2) : null,
                            variacion: Number.isFinite(variation) ? round(variation, 2) : null
                        };
                    }
                });
                return out;
            }
        },
        /** Dólar implícito por bonos: AL30/AL30D (MEP) y GD30/GD30D (CCL). */
        dolar_bonos: {
            group: 'market', ttl: 2 * 60 * 1000,
            fetch: function (json) {
                return json('https://data912.com/live/arg_bonds').then(function (rows) {
                    var by = {};
                    (rows || []).forEach(function (r) { if (r && r.symbol) by[r.symbol] = r.c; });
                    function ratio(ars, usd) {
                        if (!by[ars] || !by[usd]) return null;
                        return { ars: round(by[ars], 2), usd: round(by[usd], 2), valor: round(by[ars] / by[usd], 2) };
                    }
                    var mep = ratio('AL30', 'AL30D');
                    var ccl = ratio('GD30', 'GD30D');
                    if (!mep && !ccl) throw new Error('sin pares AL30/GD30');
                    return { mep: mep, ccl: ccl };
                });
            },
            transform: function (raw) { return raw; }
        },
        mep: {
            group: 'market', ttl: 2 * 60 * 1000,
            url: 'https://data912.com/live/mep',
            transform: function (raw) { return T.implied(raw, 'bid', 'ask'); }
        },
        ccl: {
            group: 'market', ttl: 2 * 60 * 1000,
            url: 'https://data912.com/live/ccl',
            transform: function (raw) { return T.implied(raw, 'CCL_bid', 'CCL_ask'); }
        },

        /* --- tasas --- */
        plazofijo: {
            group: 'rates', ttl: 30 * 60 * 1000,
            url: 'https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo',
            transform: T.plazofijo
        },
        tasas_ar: {
            group: 'rates', ttl: 30 * 60 * 1000,
            url: 'https://space.tasas.ar/api/bancos-digitales',
            transform: T.tasas_ar,
            dateOf: function (raw) { return raw.last_updated || null; }
        },
        fci_otros: {
            group: 'rates', ttl: 30 * 60 * 1000,
            url: 'https://api.argentinadatos.com/v1/finanzas/fci/otros/ultimo/',
            transform: T.fci_otros,
            dateOf: function (d) {
                var last = d.map(function (x) { return x.fecha; }).filter(Boolean).sort().pop();
                return last ? last + 'T12:00:00Z' : null;
            }
        },
        fci_dinero: {
            group: 'rates', ttl: 30 * 60 * 1000,
            url: 'https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/ultimo',
            transform: T.fci_dinero,
            dateOf: function (d) {
                var last = d.map(function (x) { return x.fecha; }).filter(Boolean).sort().pop();
                return last ? last + 'T12:00:00Z' : null;
            }
        },
        bcra_tasas: {
            group: 'rates', ttl: 30 * 60 * 1000,
            fetch: function (json) {
                return Promise.all([12, 7].map(function (id) {
                    return json('https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/' + id + '?limit=5');
                })).then(function (parts) {
                    return parts.map(function (p) {
                        var item = (p.results && p.results[0]) || { idVariable: null, detalle: [] };
                        return { idVariable: item.idVariable, detalle: item.detalle || [] };
                    });
                });
            },
            transform: T.bcra_tasas,
            dateOf: function (raw, data) {
                var d = (data && (data.depositos30 || data.badlar)) || null;
                return d && d.fecha ? d.fecha + 'T20:00:00Z' : null;
            }
        },

        /* --- agro --- */
        granos: {
            group: 'agro', ttl: 10 * 60 * 1000,
            url: 'https://s1.dekagb.com/dkmserver.services/html/acabaseservice.aspx?mt=GetPizarras&appname=acabase',
            transform: T.granos,
            dateOf: function (d) {
                var row = d[0];
                if (!row || !row.fecha) return null;
                var parts = row.fecha.split('/');
                return parts.length === 3 ? parts[2] + '-' + parts[1] + '-' + parts[0] + 'T' + (row.hora || '00:00') + ':00-03:00' : null;
            }
        },
        hacienda: {
            group: 'agro', ttl: 15 * 60 * 1000,
            url: 'https://www.decampoacampo.com/gh_funciones.php?function=getListadoPreciosGordo',
            proxy: 'jina',
            transform: T.hacienda
        },

        /* --- panel BYMA: el screener usa el widget de TradingView, no hay fuente propia --- */

        /* --- series --- */
        riesgo_pais_ultimo: {
            group: 'series', ttl: 60 * 60 * 1000,
            url: 'https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo',
            transform: T.riesgo_pais_ultimo,
            dateOf: function (d) { return d.fecha ? d.fecha + 'T21:00:00Z' : null; }
        },
        riesgo_pais: {
            group: 'series', ttl: 3 * 60 * 60 * 1000,
            url: 'https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais',
            transform: T.riesgo_pais,
            dateOf: function (d) { return d.fecha ? d.fecha + 'T21:00:00Z' : null; }
        },
        inflacion: {
            group: 'series', ttl: 3 * 60 * 60 * 1000,
            url: 'https://api.argentinadatos.com/v1/finanzas/indices/inflacion',
            transform: T.inflacion,
            dateOf: function (d) {
                var last = d[d.length - 1];
                return last ? last.fecha : null;
            }
        },
        uva: {
            group: 'series', ttl: 60 * 60 * 1000,
            url: 'https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/31?limit=800',
            transform: T.uva,
            dateOf: function (d) { return d.fecha ? d.fecha + 'T03:00:00Z' : null; }
        },
        reservas: {
            group: 'series', ttl: 3 * 60 * 60 * 1000,
            url: 'https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/1?limit=400',
            transform: T.reservas,
            dateOf: function (d) { return d.fecha ? d.fecha + 'T18:00:00Z' : null; }
        },
        dolar_hist: {
            group: 'series', ttl: 6 * 60 * 60 * 1000,
            url: 'https://api.argentinadatos.com/v1/cotizaciones/dolares',
            transform: T.dolar_hist,
            dateOf: function (d) {
                var keys = Object.keys(d);
                var last = null;
                keys.forEach(function (k) {
                    var rows = d[k];
                    if (rows && rows.length) {
                        var f = rows[rows.length - 1].fecha;
                        if (!last || f > last) last = f;
                    }
                });
                return last ? last + 'T18:00:00Z' : null;
            }
        },

        /* --- noticias: dos tandas, la primera pinta antes --- */
        news: makeNewsSource(FEEDS_PRIORITY),
        news_extra: makeNewsSource(FEEDS_EXTRA)
    };

    window.DATA_SOURCES = SOURCES;
    window.DATA_MAX_AGE_MS = 12 * 60 * MIN;

    /**
     * Fondo que necesita cada logo para verse sobre negro, medido sobre el
     * archivo real: 'light' para logos oscuros, 'dark' para los casi blancos.
     */
    window.LOGO_BG = {
        '00015.png': 'light', '00017.png': 'light', '00020.png': 'light', '00029.png': 'light',
        '00034.png': 'light', '00072.png': 'light', '00147.png': 'light', '00254.png': 'light',
        '00268.png': 'light', '00285.png': 'light', '00299.png': 'light', '00305.png': 'light',
        '00319.png': 'light', '00341.png': 'light', '65203.png': 'light',
        'astropay.png': 'dark', 'balanz.png': 'light', 'banco-bica.svg': 'light',
        'banco-ciudad.png': 'dark', 'banco-icbc.png': 'dark', 'banco-supervielle.png': 'dark',
        'banco-voii.jpg': 'light', 'bancor.svg': 'light', 'fiwind.png': 'light',
        'grabr.svg': 'light', 'nexo.png': 'light', 'plus.png': 'light', 'ripio.png': 'light',
        'tiendadolar.png': 'dark', 'uala.png': 'light', 'wallbit.png': 'light',
        '01JMD4H3HY0EZ9AQHPRRPKH5RP.webp': 'dark', '01JMD4NVDETSQ1CK0TQR0NFRSM.webp': 'dark',
        '01JMD4PSA4PNEJ03HW69QBGP08.webp': 'dark', '01JMD4R6MGQ9RYQZ013CHEBHBH.webp': 'light',
        '01JMD4TC8KBC5YPMKDHYA2XAJ8.webp': 'light', '01JMD4XAC17DSAHHH8M4N07KSV.webp': 'dark',
        '01JQ4KK36VKVM4FY6NKWEAG5FY.webp': 'light', '01JSHV50ETXHDC6SPH4TCT0WP2.webp': 'dark',
        '01JTGP5PW4JQ3P24F8SJD329JC.webp': 'dark', '01K0YRCBKC2GNKER34EW7D20ZZ.webp': 'light',
        '01K7WH2WCWB72K2C6077GVVT94.webp': 'dark', '01K8BZCVBCH66RDPBVWDVAAR92.webp': 'light',
        '01KR4APY1TW7GGX0QEY2MJDGGT.webp': 'light'
    };
})();
