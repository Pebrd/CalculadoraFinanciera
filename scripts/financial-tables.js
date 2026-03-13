/**
 * Financial Tables Display Module
 * Optimizado para cache y actualización
 */

(function() {
    var cacheBust = 't=' + Date.now();
    var lastUpdateTime = null;

    function loadData(url) {
        var separator = url.indexOf('?') >= 0 ? '&' : '?';
        return fetch(url + separator + cacheBust).then(function(response) {
            if (!response.ok) throw new Error('Failed to load ' + url);
            return response.json();
        }).catch(function(error) {
            console.error('Error:', url, error);
            return {};
        });
    }

    function formatTimestamp(isoString) {
        var date = new Date(isoString);
        var now = new Date();
        var diff = Math.floor((now - date) / 1000);
        
        if (diff < 60) return 'Hace ' + diff + 's';
        if (diff < 3600) return 'Hace ' + Math.floor(diff / 60) + 'min';
        return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    }

    function getLatestTimestamp(dataObj) {
        var timestamps = [];
        Object.keys(dataObj).forEach(function(key) {
            if (dataObj[key].timestamp) {
                timestamps.push(new Date(dataObj[key].timestamp));
            }
        });
        if (timestamps.length === 0) return null;
        return new Date(Math.max.apply(null, timestamps));
    }

    function sortData(data, key, direction) {
        var keys = Object.keys(data);
        keys.sort(function(a, b) {
            var valA = data[a][key];
            var valB = data[b][key];
            if (direction === 'asc') {
                return valA > valB ? 1 : -1;
            } else {
                return valA < valB ? 1 : -1;
            }
        });
        return keys;
    }

    function getSortArrow(field, currentSort, currentDir) {
        if (field === currentSort) {
            return currentDir === 'asc' ? ' ▲' : ' ▼';
        }
        return '';
    }

    function renderTable(data, containerId, defaultSort, defaultDir, timestamp) {
        var container = document.getElementById(containerId);
        if (!container) return;
        if (!data || Object.keys(data).length === 0) {
            container.innerHTML = '<p style="color:#666;padding:10px;">Sin datos</p>';
            return;
        }

        var sortKey = defaultSort || 'name';
        var sortDir = defaultDir || 'asc';
        var sortedKeys = sortData(data, sortKey, sortDir);
        
        var timeStr = timestamp ? formatTimestamp(timestamp) : '';

        var html = '<div class="table-header">';
        if (timeStr) {
            html += '<span class="last-update">↻ ' + timeStr + '</span>';
        }
        html += '</div>';
        html += '<table class="fin-table" data-container="' + containerId + '">';
        html += '<thead><tr>';
        html += '<th data-sort="name" data-dir="asc">Nombre' + getSortArrow('name', sortKey, sortDir) + '</th>';
        html += '<th data-sort="price" data-dir="desc">Precio' + getSortArrow('price', sortKey, sortDir) + '</th>';
        html += '<th data-sort="change" data-dir="desc">Cambio' + getSortArrow('change', sortKey, sortDir) + '</th>';
        html += '<th data-sort="pct_change" data-dir="desc">%' + getSortArrow('pct_change', sortKey, sortDir) + '</th>';
        html += '</tr></thead><tbody>';
        
        sortedKeys.forEach(function(symbol) {
            var info = data[symbol];
            var changeClass = info.change >= 0 ? 'positive' : 'negative';
            var arrow = info.change >= 0 ? '▲' : '▼';
            html += '<tr>';
            html += '<td>' + info.name + '</td>';
            html += '<td>$' + info.price.toLocaleString() + '</td>';
            html += '<td class="' + changeClass + '">' + (info.change >= 0 ? '+' : '') + info.change.toLocaleString() + '</td>';
            html += '<td class="' + changeClass + '">' + arrow + ' ' + Math.abs(info.pct_change).toFixed(2) + '%</td>';
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;

        container.querySelectorAll('th').forEach(function(th) {
            th.style.cursor = 'pointer';
            th.style.userSelect = 'none';
            th.addEventListener('click', function() {
                var sortField = th.dataset.sort;
                var currentDir = th.dataset.dir;
                var newDir = currentDir === 'asc' ? 'desc' : 'asc';
                var currentData = window.currentData[containerId];
                renderTable(currentData, containerId, sortField, newDir, window.lastTimestamps[containerId]);
            });
        });

        if (!window.currentData) window.currentData = {};
        if (!window.lastTimestamps) window.lastTimestamps = {};
        window.currentData[containerId] = data;
        window.lastTimestamps[containerId] = timestamp;
    }

    function init() {
        cacheBust = 't=' + Date.now();
        
        Promise.all([
            loadData('./data/yfinance_stocks.json'),
            loadData('./data/yfinance_commodities.json')
        ]).then(function(results) {
            var stocksData = results[0];
            var commoditiesData = results[1];
            
            var stocksTimestamp = getLatestTimestamp(stocksData);
            var commoditiesTimestamp = getLatestTimestamp(commoditiesData);
            
            renderTable(stocksData, 'stocks-table', 'name', 'asc', stocksTimestamp ? stocksTimestamp.toISOString() : null);
            renderTable(commoditiesData, 'commodities-table', 'name', 'asc', commoditiesTimestamp ? commoditiesTimestamp.toISOString() : null);
        });
    }

    // Auto-refresh cada 5 minutos
    setInterval(function() {
        console.log('Refrescando datos...');
        init();
    }, 5 * 60 * 1000);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
