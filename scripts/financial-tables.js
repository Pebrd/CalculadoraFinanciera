/**
 * Financial Tables Display Module
 */

(function() {
    function loadData(url) {
        return fetch(url).then(function(response) {
            if (!response.ok) throw new Error('Failed to load ' + url);
            return response.json();
        }).catch(function(error) {
            console.error('Error:', url, error);
            return {};
        });
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

    function renderTable(data, containerId, defaultSort, defaultDir) {
        var container = document.getElementById(containerId);
        if (!container) return;
        if (!data || Object.keys(data).length === 0) {
            container.innerHTML = '<p style="color:#666;padding:10px;">Sin datos</p>';
            return;
        }

        var sortKey = defaultSort || 'name';
        var sortDir = defaultDir || 'asc';
        var sortedKeys = sortData(data, sortKey, sortDir);

        var html = '<table class="fin-table" data-container="' + containerId + '">';
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

        // Add click handlers for sorting
        container.querySelectorAll('th').forEach(function(th) {
            th.style.cursor = 'pointer';
            th.style.userSelect = 'none';
            th.addEventListener('click', function() {
                var sortField = th.dataset.sort;
                var currentDir = th.dataset.dir;
                var newDir = currentDir === 'asc' ? 'desc' : 'asc';
                var currentData = window.currentData[containerId];
                renderTable(currentData, containerId, sortField, newDir);
            });
        });

        // Store data for re-sorting
        if (!window.currentData) window.currentData = {};
        window.currentData[containerId] = data;
    }

    function init() {
        Promise.all([
            loadData('./data/yfinance_stocks.json'),
            loadData('./data/yfinance_commodities.json')
        ]).then(function(results) {
            renderTable(results[0], 'stocks-table', 'name', 'asc');
            renderTable(results[1], 'commodities-table', 'name', 'asc');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
