/**
 * Financial Tables Display Module
 * Loads data from yfinance JSON files and displays custom tables
 */

const FinancialTables = {
    
    async loadStocksData() {
        try {
            const response = await fetch('./data/yfinance_stocks.json');
            if (!response.ok) throw new Error('Failed to load stocks data');
            return await response.json();
        } catch (error) {
            console.error('Error loading stocks data:', error);
            return {};
        }
    },
    
    async loadCommoditiesData() {
        try {
            const response = await fetch('./data/yfinance_commodities.json');
            if (!response.ok) throw new Error('Failed to load commodities data');
            return await response.json();
        } catch (error) {
            console.error('Error loading commodities data:', error);
            return {};
        }
    },
    
    async loadIndicesData() {
        try {
            const response = await fetch('./data/yfinance_indices.json');
            if (!response.ok) throw new Error('Failed to load indices data');
            return await response.json();
        } catch (error) {
            console.error('Error loading indices data:', error);
            return {};
        }
    },
    
    renderStocksTable(data, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let html = '<table class="fin-table"><thead><tr><th>Acción</th><th>Precio</th><th>Cambio</th><th>%</th></tr></thead><tbody>';
        
        Object.entries(data).forEach(([symbol, info]) => {
            const changeClass = info.change >= 0 ? 'positive' : 'negative';
            const arrow = info.change >= 0 ? '▲' : '▼';
            html += `<tr>
                <td>${info.name}</td>
                <td>$${info.price.toLocaleString()}</td>
                <td class="${changeClass}">${info.change >= 0 ? '+' : ''}${info.change.toLocaleString()}</td>
                <td class="${changeClass}">${arrow} ${Math.abs(info.pct_change).toFixed(2)}%</td>
            </tr>`;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    },
    
    renderCommoditiesTable(data, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let html = '<table class="fin-table"><thead><tr><th>Commodity</th><th>Precio</th><th>Cambio</th><th>%</th></tr></thead><tbody>';
        
        Object.entries(data).forEach(([symbol, info]) => {
            const changeClass = info.change >= 0 ? 'positive' : 'negative';
            const arrow = info.change >= 0 ? '▲' : '▼';
            html += `<tr>
                <td>${info.name}</td>
                <td>$${info.price.toLocaleString()}</td>
                <td class="${changeClass}">${info.change >= 0 ? '+' : ''}${info.change.toLocaleString()}</td>
                <td class="${changeClass}">${arrow} ${Math.abs(info.pct_change).toFixed(2)}%</td>
            </tr>`;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    },
    
    renderIndicesDisplay(data, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let html = '<div class="indices-grid">';
        Object.entries(data).forEach(([symbol, info]) => {
            const changeClass = info.change >= 0 ? 'positive' : 'negative';
            html += `<div class="index-item">
                <div class="index-name">${info.name}</div>
                <div class="index-price">${info.price.toLocaleString()}</div>
                <div class="index-change ${changeClass}">${info.change >= 0 ? '+' : ''}${info.pct_change.toFixed(2)}%</div>
            </div>`;
        });
        html += '</div>';
        container.innerHTML = html;
    },
    
    async init() {
        const [stocks, commodities, indices] = await Promise.all([
            this.loadStocksData(),
            this.loadCommoditiesData(),
            this.loadIndicesData()
        ]);
        
        this.renderStocksTable(stocks, 'stocks-table');
        this.renderCommoditiesTable(commodities, 'commodities-table');
        this.renderIndicesDisplay(indices, 'indices-display');
    }
};

document.addEventListener('DOMContentLoaded', () => FinancialTables.init());

export default FinancialTables;
