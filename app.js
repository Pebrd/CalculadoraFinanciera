/**
 * Pampa Finance — runtime de UI
 * Navegación, formateo es-AR, tablas ordenables, gráficos SVG y reveal.
 */
(function () {
    'use strict';

    var PAGES = [
        { href: 'index.html', label: 'Hoy', code: '01' },
        { href: 'tasas.html', label: 'Tasas', code: '02' },
        { href: 'plazo-fijo.html', label: 'Plazo fijo', code: '03' },
        { href: 'calculadoras.html', label: 'Calculadoras', code: '04' },
        { href: 'Graficos historicos.html', label: 'Gráficos', code: '05' },
        { href: 'Hacienda.html', label: 'Agro', code: '06' },
        { href: 'ScreenerArgy.html', label: 'Screener', code: '07' },
        { href: 'noticias.html', label: 'Noticias', code: '08' }
    ];

    /* ---------------- Formato ---------------- */

    var nf = {};
    function numberFormat(dec) {
        var key = 'd' + dec;
        if (!nf[key]) {
            nf[key] = new Intl.NumberFormat('es-AR', {
                minimumFractionDigits: dec,
                maximumFractionDigits: dec
            });
        }
        return nf[key];
    }

    function isNum(v) {
        return typeof v === 'number' && Number.isFinite(v);
    }

    var Fmt = {
        num: function (value, dec) {
            if (!isNum(value)) return '—';
            return numberFormat(dec == null ? 0 : dec).format(value);
        },
        money: function (value, dec) {
            if (!isNum(value)) return '—';
            return '$' + numberFormat(dec == null ? 0 : dec).format(value);
        },
        /** Compacto para patrimonios: $8,8 B (billones) / $940 M */
        compact: function (value) {
            if (!isNum(value)) return '—';
            var abs = Math.abs(value);
            if (abs >= 1e12) return '$' + numberFormat(1).format(value / 1e12) + ' B';
            if (abs >= 1e9) return '$' + numberFormat(1).format(value / 1e9) + ' MM';
            if (abs >= 1e6) return '$' + numberFormat(1).format(value / 1e6) + ' M';
            if (abs >= 1e3) return '$' + numberFormat(0).format(value / 1e3) + ' k';
            return '$' + numberFormat(0).format(value);
        },
        pct: function (value, dec) {
            if (!isNum(value)) return '—';
            return numberFormat(dec == null ? 2 : dec).format(value) + '%';
        },
        /** Volumen / cantidades: 1,2 M · 340 k */
        qty: function (value) {
            if (!isNum(value)) return '—';
            var abs = Math.abs(value);
            if (abs >= 1e9) return numberFormat(1).format(value / 1e9) + ' MM';
            if (abs >= 1e6) return numberFormat(1).format(value / 1e6) + ' M';
            if (abs >= 1e3) return numberFormat(0).format(value / 1e3) + ' k';
            return numberFormat(0).format(value);
        },
        /** Devuelve { text, cls, arrow } listo para pintar una variación. */
        delta: function (value, dec) {
            if (!isNum(value)) return { text: '—', cls: 'flat', arrow: '' };
            var arrow = value > 0 ? '▲' : (value < 0 ? '▼' : '·');
            var cls = value > 0 ? 'up' : (value < 0 ? 'down' : 'flat');
            return {
                text: arrow + ' ' + numberFormat(dec == null ? 2 : dec).format(Math.abs(value)) + '%',
                cls: cls,
                arrow: arrow
            };
        },
        /** Variación en pesos con signo. */
        signed: function (value, dec) {
            if (!isNum(value)) return '—';
            var sign = value > 0 ? '+' : (value < 0 ? '−' : '');
            return sign + '$' + numberFormat(dec == null ? 0 : dec).format(Math.abs(value));
        },
        date: function (iso, opts) {
            if (!iso) return '—';
            var d = iso instanceof Date ? iso : new Date(iso);
            if (isNaN(d)) return '—';
            return d.toLocaleDateString('es-AR', opts || { day: '2-digit', month: 'short', year: 'numeric' });
        },
        dateShort: function (iso) {
            if (!iso) return '—';
            var d = iso instanceof Date ? iso : new Date(iso);
            if (isNaN(d)) return '—';
            return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
        },
        time: function (iso) {
            if (!iso) return '—';
            var d = iso instanceof Date ? iso : new Date(iso);
            if (isNaN(d)) return '—';
            return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        },
        ago: function (iso) {
            if (!iso) return '—';
            var d = iso instanceof Date ? iso : new Date(iso);
            if (isNaN(d)) return '—';
            var mins = Math.floor((Date.now() - d.getTime()) / 60000);
            if (mins < 1) return 'recién';
            if (mins < 60) return 'hace ' + mins + ' min';
            var hours = Math.floor(mins / 60);
            if (hours < 24) return 'hace ' + hours + ' h';
            var days = Math.floor(hours / 24);
            if (days === 1) return 'ayer';
            if (days < 30) return 'hace ' + days + ' días';
            return Fmt.date(d);
        },
        esc: function (str) {
            return String(str == null ? '' : str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },
        title: function (str) {
            return String(str || '')
                .toLowerCase()
                .replace(/\b([a-záéíóúñ])/g, function (m) { return m.toUpperCase(); });
        }
    };

    /* ---------------- Navegación ---------------- */

    function currentPage() {
        var file = location.pathname.split('/').pop() || 'index.html';
        if (!file || file === '') file = 'index.html';
        return file;
    }

    function buildNav() {
        var active = currentPage();
        var nav = document.createElement('header');
        nav.className = 'nav';

        var links = PAGES.map(function (p) {
            return '<a class="nav__link" href="' + p.href + '"' +
                (p.href === active ? ' aria-current="page"' : '') + '>' + p.label + '</a>';
        }).join('');

        nav.innerHTML =
            '<a class="brand" href="index.html">' +
                '<span class="brand__mark">PF</span>' +
                '<span>Pampa Finance</span>' +
                '<span class="brand__sub">Mercado AR</span>' +
            '</a>' +
            '<nav class="nav__links" aria-label="Secciones">' + links + '</nav>' +
            '<button class="nav__toggle" type="button" aria-label="Abrir menú" aria-expanded="false">' +
                '<span></span><span></span><span></span>' +
            '</button>';

        var menu = document.createElement('div');
        menu.className = 'menu';
        menu.id = 'menu';
        menu.innerHTML = PAGES.map(function (p, i) {
            return '<a href="' + p.href + '" style="--i:' + i + '"' +
                (p.href === active ? ' aria-current="page"' : '') + '>' +
                '<span>' + p.code + '</span>' + p.label + '</a>';
        }).join('');

        document.body.insertBefore(nav, document.body.firstChild);
        document.body.appendChild(menu);

        var toggle = nav.querySelector('.nav__toggle');
        function setMenu(open) {
            menu.classList.toggle('is-open', open);
            toggle.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            document.body.style.overflow = open ? 'hidden' : '';
        }
        toggle.addEventListener('click', function () {
            setMenu(!menu.classList.contains('is-open'));
        });
        menu.addEventListener('click', function (e) {
            if (e.target.closest('a')) setMenu(false);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') setMenu(false);
        });
    }

    /* ---------------- Tablas ---------------- */

    /**
     * renderTable(container, columns, rows, opts)
     * columns: [{ key, label, align, get(row), render(row), sort(row) }]
     * opts: { sortKey, sortDir, bestRow(row) -> bool, empty }
     */
    function renderTable(container, columns, rows, opts) {
        opts = opts || {};
        if (!container) return;

        if (!rows || !rows.length) {
            container.innerHTML = '<div class="empty">' + (opts.empty || 'Sin datos disponibles') + '</div>';
            return;
        }

        var state = {
            key: opts.sortKey || columns[0].key,
            dir: opts.sortDir || 'desc'
        };

        function valueOf(col, row) {
            if (col.sort) return col.sort(row);
            if (col.get) return col.get(row);
            return row[col.key];
        }

        function sortRows() {
            var col = columns.filter(function (c) { return c.key === state.key; })[0] || columns[0];
            var dir = state.dir === 'asc' ? 1 : -1;
            return rows.slice().sort(function (a, b) {
                var va = valueOf(col, a);
                var vb = valueOf(col, b);
                if (va == null && vb == null) return 0;
                if (va == null) return 1;
                if (vb == null) return -1;
                if (typeof va === 'string' || typeof vb === 'string') {
                    return String(va).localeCompare(String(vb), 'es') * dir;
                }
                return (va - vb) * dir;
            });
        }

        function paint() {
            var sorted = sortRows();
            var head = columns.map(function (col) {
                var cls = ' class="' + (col.align === 'right' ? 'num' : '') +
                    (col.mobileHide ? ' col-hide-sm' : '') +
                    (state.key === col.key ? ' is-sorted' + (state.dir === 'desc' ? ' is-desc' : '') : '') + '"';
                return '<th' + cls + ' data-key="' + col.key + '"' +
                    (col.align === 'right' ? ' style="text-align:right"' : '') +
                    ' aria-sort="' + (state.key === col.key ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '">' +
                    Fmt.esc(col.label) + '</th>';
            }).join('');

            var body = sorted.map(function (row) {
                var best = opts.bestRow && opts.bestRow(row);
                var cells = columns.map(function (col) {
                    var content = col.render ? col.render(row) : Fmt.esc(valueOf(col, row));
                    var cls = [(col.align === 'right' ? 'num' : ''), (col.mobileHide ? 'col-hide-sm' : ''), col.cls || '']
                        .filter(Boolean).join(' ');
                    return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + content + '</td>';
                }).join('');
                return '<tr' + (best ? ' class="is-best"' : '') + '>' + cells + '</tr>';
            }).join('');

            container.innerHTML =
                '<div class="table-wrap"' + (opts.maxHeight ? ' style="max-height:' + opts.maxHeight + 'px;overflow-y:auto"' : '') + '>' +
                '<table class="tbl"><thead><tr>' + head +
                '</tr></thead><tbody>' + body + '</tbody></table></div>';

            container.querySelectorAll('th').forEach(function (th) {
                th.addEventListener('click', function () {
                    var key = th.getAttribute('data-key');
                    if (state.key === key) {
                        state.dir = state.dir === 'asc' ? 'desc' : 'asc';
                    } else {
                        state.key = key;
                        var col = columns.filter(function (c) { return c.key === key; })[0];
                        state.dir = col && col.align === 'right' ? 'desc' : 'asc';
                    }
                    paint();
                });
            });
        }

        paint();
    }

    /* ---------------- Gráficos SVG ---------------- */

    function parsePoint(p) {
        var t = typeof p[0] === 'string' ? Date.parse(p[0]) : p[0];
        return { t: t, v: p[1] };
    }

    /**
     * PF.chart(svg, { series:[{label,color,data:[[fecha,valor]]}], unit, decimals, area })
     */
    function chart(svg, options) {
        if (!svg || !options || !options.series) return;
        var series = options.series.filter(function (s) { return s.data && s.data.length; });
        if (!series.length) return;

        var parsed = series.map(function (s) {
            return {
                label: s.label,
                color: s.color || 'var(--fg)',
                points: s.data.map(parsePoint).filter(function (p) { return isNum(p.v) && isNum(p.t); })
            };
        }).filter(function (s) { return s.points.length > 0; });
        if (!parsed.length) return;

        var all = [].concat.apply([], parsed.map(function (s) { return s.points; }));
        var tMin = Math.min.apply(null, all.map(function (p) { return p.t; }));
        var tMax = Math.max.apply(null, all.map(function (p) { return p.t; }));
        var vMin = Math.min.apply(null, all.map(function (p) { return p.v; }));
        var vMax = Math.max.apply(null, all.map(function (p) { return p.v; }));
        if (tMin === tMax) tMax = tMin + 1;
        if (vMin === vMax) { vMin -= 1; vMax += 1; }
        var padV = (vMax - vMin) * 0.14;
        vMin -= padV;
        vMax += padV;

        var width = Math.max(svg.clientWidth || 640, 260);
        var height = options.height || 240;
        var pad = { top: 16, right: 56, bottom: 24, left: 6 };
        var plotW = width - pad.left - pad.right;
        var plotH = height - pad.top - pad.bottom;

        function x(t) { return pad.left + ((t - tMin) / (tMax - tMin)) * plotW; }
        function y(v) { return pad.top + plotH - ((v - vMin) / (vMax - vMin)) * plotH; }

        var dec = options.decimals == null ? 0 : options.decimals;
        var unit = options.unit || '';

        var parts = [];
        // grilla horizontal + etiquetas de valor
        for (var i = 0; i <= 3; i++) {
            var vv = vMin + ((vMax - vMin) / 3) * i;
            var yy = y(vv);
            parts.push('<line x1="' + pad.left + '" y1="' + yy.toFixed(1) + '" x2="' + (width - pad.right) + '" y2="' + yy.toFixed(1) + '" stroke="rgba(255,255,255,.07)" stroke-width="1" />');
            parts.push('<text x="' + (width - pad.right + 9) + '" y="' + (yy + 3).toFixed(1) + '" fill="#9a9a9a" font-family="IBM Plex Mono, monospace" font-size="10">' +
                unit + Fmt.num(vv, Math.abs(vv) >= 1000 ? 0 : dec) + '</text>');
        }

        parsed.forEach(function (s, idx) {
            if (options.type === 'bar') {
                var step = plotW / Math.max(s.points.length, 1);
                var barW = Math.max(step - 1.5, 1);
                s.points.forEach(function (p) {
                    var zero = y(Math.max(Math.min(0, vMax), vMin));
                    var top = y(Math.max(p.v, 0));
                    var bottom = y(Math.min(p.v, 0));
                    var color = p.v >= 0 ? (options.barColor || 'rgba(143,192,224,.55)') : 'rgba(255,107,107,.55)';
                    parts.push('<rect x="' + (x(p.t) - barW / 2).toFixed(1) + '" y="' + top.toFixed(1) +
                        '" width="' + barW.toFixed(1) + '" height="' + Math.max(bottom - top, 0.8).toFixed(1) +
                        '" fill="' + color + '" />');
                });
                return;
            }
            var d = s.points.map(function (p, i) {
                return (i ? 'L' : 'M') + x(p.t).toFixed(1) + ' ' + y(p.v).toFixed(1);
            }).join(' ');
            if (idx === 0 && options.area !== false) {
                var areaD = d + ' L' + x(s.points[s.points.length - 1].t).toFixed(1) + ' ' + (pad.top + plotH) +
                    ' L' + x(s.points[0].t).toFixed(1) + ' ' + (pad.top + plotH) + ' Z';
                parts.push('<path d="' + areaD + '" fill="url(#chartArea)" opacity="0.9" />');
            }
            parts.push('<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" />');
            var last = s.points[s.points.length - 1];
            parts.push('<circle cx="' + x(last.t).toFixed(1) + '" cy="' + y(last.v).toFixed(1) + '" r="2.4" fill="' + s.color + '" />');
        });

        // etiquetas de fecha (primera y última)
        var fmtDate = function (t) {
            return new Date(t).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
        };
        parts.push('<text x="' + pad.left + '" y="' + (height - 6) + '" fill="#8f8f8f" font-family="IBM Plex Mono, monospace" font-size="10">' + fmtDate(tMin) + '</text>');
        parts.push('<text x="' + (width - pad.right) + '" y="' + (height - 6) + '" text-anchor="end" fill="#8f8f8f" font-family="IBM Plex Mono, monospace" font-size="10">' + fmtDate(tMax) + '</text>');

        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        svg.setAttribute('height', height);
        svg.innerHTML =
            '<defs><linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#7fb3d5" stop-opacity="0.16" />' +
            '<stop offset="100%" stop-color="#7fb3d5" stop-opacity="0" />' +
            '</linearGradient></defs>' +
            parts.join('');

        if (svg._onResize) window.removeEventListener('resize', svg._onResize);
        svg._onResize = function () {
            clearTimeout(svg._t);
            svg._t = setTimeout(function () { chart(svg, options); }, 180);
        };
        window.addEventListener('resize', svg._onResize);
    }

    /* ---------------- Reveal ---------------- */

    function reveal(root) {
        var nodes = (root || document).querySelectorAll('.reveal:not(.is-in)');
        if (!('IntersectionObserver' in window)) {
            nodes.forEach(function (n) { n.classList.add('is-in'); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
        nodes.forEach(function (n) { io.observe(n); });
    }

    /* ---------------- UI helpers ---------------- */

    var toastEl = null;
    function toast(message) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'toast';
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = message;
        requestAnimationFrame(function () { toastEl.classList.add('is-on'); });
        clearTimeout(toastEl._t);
        toastEl._t = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
    }

    /** Pinta la franja de sincronización en los elementos [data-sync]. */
    function syncBadges() {
        var h = window.ApiService ? window.ApiService.health() : null;
        if (!h) return;
        var label;
        if (h.status === 'ready') {
            label = 'Datos ' + Fmt.ago(h.updatedAt) + (h.source === 'live' ? ' · en vivo' : '');
        } else if (h.status === 'error') {
            label = 'Sin conexión con los datos';
        } else {
            label = 'Cargando datos…';
        }
        document.querySelectorAll('[data-sync]').forEach(function (el) {
            el.textContent = label;
        });
        document.querySelectorAll('[data-sync-dot]').forEach(function (el) {
            el.className = 'dot' + (h.status === 'ready' ? '' : ' is-down');
        });
    }

    /** Carga datos y ejecuta el callback con manejo de error visible. */
    function withData(fn) {
        var api = window.ApiService;
        if (!api) return;
        api.ready().then(function () {
            var h = api.health();
            if (h.status === 'error') {
                document.querySelectorAll('[data-error]').forEach(function (el) {
                    el.innerHTML = '<div class="empty">No pudimos cargar los datos. Revisá la conexión y recargá.</div>';
                });
            } else {
                fn(api);
            }
            syncBadges();
            reveal();
        });
    }

    /* ---------------- Arranque ---------------- */

    function boot() {
        buildNav();
        reveal();
        if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
            window.addEventListener('load', function () {
                navigator.serviceWorker.register('sw.js').catch(function () {});
            });
        }
    }

    window.PF = {
        Fmt: Fmt,
        pages: PAGES,
        renderTable: renderTable,
        chart: chart,
        reveal: reveal,
        toast: toast,
        syncBadges: syncBadges,
        withData: withData
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
