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

    function renderTable(data, containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;
        if (!data || Object.keys(data).length === 0) {
            container.innerHTML = '<p style="color:#666;padding:10px;">Sin datos</p>';
            return;
        }

        var html = '<table class="fin-table"><thead><tr><th>Nombre</th><th>Precio</th><th>Cambio</th><th>%</th></tr></thead><tbody>';
        
        Object.keys(data).forEach(function(symbol) {
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
    }

    function renderIndices(data, containerId) {
        var container = document.getElementById(containerId);
        if (!container) return;
        if (!data || Object.keys(data).length === 0) {
            container.innerHTML = '<p style="color:#666;padding:10px;">Sin datos</p>';
            return;
        }

        var html = '<div class="indices-grid">';
        Object.keys(data).forEach(function(symbol) {
            var info = data[symbol];
            var changeClass = info.change >= 0 ? 'positive' : 'negative';
            html += '<div class="index-item">';
            html += '<div class="index-name">' + info.name + '</div>';
            html += '<div class="index-price">' + info.price.toLocaleString() + '</div>';
            html += '<div class="index-change ' + changeClass + '">' + (info.change >= 0 ? '+' : '') + info.pct_change.toFixed(2) + '%</div>';
            html += '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    }

    function init() {
        Promise.all([
            loadData('./data/yfinance_stocks.json'),
            loadData('./data/yfinance_commodities.json'),
            loadData('./data/yfinance_indices.json')
        ]).then(function(results) {
            renderTable(results[0], 'stocks-table');
            renderTable(results[1], 'commodities-table');
            renderIndices(results[2], 'indices-display');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
