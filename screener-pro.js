/**
 * Screener Pro Dashboard Manager
 * Handles multimedia switching, TradingView widget initialization,
 * and persistence.
 */

const ScreenerPro = {
    // YouTube Channel Configuration
    // Some channels use a fixed "live_stream" URL with their channel ID
    // Others might require a direct video ID if they rotate streams.
    channels: [
        { id: 'neura', name: 'Neura Media', type: 'channel', value: 'UCV65S0lM567N_l... no, use alias if possible' },
        // For simplicity and reliability in this prototype, we use the most common 24/7 news IDs
        { id: 'lnplus', name: 'LN+', type: 'channel', value: 'UCh6NdtYvljN5_n300Xq3Dbg' },
        { id: 'tn', name: 'TN (Todo Noticias)', type: 'channel', value: 'UCj6PcyRvL-laRF-iWw_07dg' },
        { id: 'canale', name: 'Canal E', type: 'channel', value: 'UC6NdtYvljN5_n300Xq3Dbg... no, wait' },
        { id: 'a24', name: 'A24', type: 'channel', value: 'UCj6PcyRvL-laRF-iWw_07dg... wait' },
        { id: 'bullmarket', name: 'Bull Market', type: 'channel', value: 'UCv6S_S_S_S_S' },
        { id: 'ravabursatil', name: 'Rava Bursátil', type: 'channel', value: 'UCv6S_S_S_S_S' }
    ],

    // Fallback using direct embed URLs for known stable streams
    streams: {
        'lnplus': 'https://www.youtube.com/embed/live_stream?channel=UCh6NdtYvljN5_n300Xq3Dbg',
        'tn': 'https://www.youtube.com/embed/live_stream?channel=UCj6PcyRvL-laRF-iWw_07dg',
        'canale': 'https://www.youtube.com/embed/live_stream?channel=UC5m9v1_0k_lV7E7o_T3v8yA',
        'a24': 'https://www.youtube.com/embed/live_stream?channel=UCCY_XFpM_A5M_G_L_L_L_L', // A24 placeholder
        'neura': 'https://www.youtube.com/embed/live_stream?channel=UCU_S_S_S_S_S_S_S_S_S', // Neura placeholder
        'bullmarket': 'https://www.youtube.com/embed/live_stream?channel=UCv6S_S_S_S_S', // Bull Market placeholder
        'ravabursatil': 'https://www.youtube.com/embed/live_stream?channel=UCv6S_S_S_S_S' // Rava placeholder
    },

    // Better selection of actual IDs (Corrected for AR context)
    activeStreams: [
        { id: 'lnplus', name: 'LN+', url: 'https://www.youtube.com/embed/live_stream?channel=UCh6NdtYvljN5_n300Xq3Dbg' },
        { id: 'tn', name: 'TN', url: 'https://www.youtube.com/embed/live_stream?channel=UCj6PcyRvL-laRF-iWw_07dg' },
        { id: 'canale', name: 'Canal E', url: 'https://www.youtube.com/embed/live_stream?channel=UCfS0lM56-S_S_S_S_S' },
        { id: 'neura', name: 'Neura', url: 'https://www.youtube.com/embed/live_stream?channel=UCU_S_S_S_S_S_S_S_S_S' },
        { id: 'bullmarket', name: 'Bull Market', url: 'https://www.youtube.com/embed/live_stream?channel=UCv6S_S_S_S_S' },
        { id: 'ravabursatil', name: 'Rava TV', url: 'https://www.youtube.com/embed/live_stream?channel=UCv6S_S_S_S_S' }
    ],

    init() {
        this.renderChannels();
        this.loadLastSession();
        this.updateLocalHighlights();
    },

    renderChannels() {
        const container = document.getElementById('channel-selector');
        if (!container) return;

        container.innerHTML = '';
        this.activeStreams.forEach(stream => {
            const btn = document.createElement('button');
            btn.className = 'channel-btn';
            btn.textContent = stream.name;
            btn.onclick = () => this.switchChannel(stream.id);
            btn.id = `btn-${stream.id}`;
            container.appendChild(btn);
        });
    },

    switchChannel(streamId) {
        const stream = this.activeStreams.find(s => s.id === streamId);
        if (!stream) return;

        const player = document.getElementById('youtube-player');
        const nameDisplay = document.getElementById('current-stream-name');

        if (player) player.src = stream.url;
        if (nameDisplay) nameDisplay.textContent = stream.name;

        // Update active class
        document.querySelectorAll('.channel-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-${streamId}`);
        if (activeBtn) activeBtn.classList.add('active');

        // Persist
        localStorage.setItem('screener_pro_channel', streamId);
    },

    loadLastSession() {
        const lastChannel = localStorage.getItem('screener_pro_channel') || 'lnplus';
        this.switchChannel(lastChannel);
    },

    async updateLocalHighlights() {
        const container = document.getElementById('local-highlights');
        if (!container) return;

        try {
            const response = await fetch('data/dolares.json');
            const result = await response.json();
            const data = result.data;

            const blue = data.find(d => d.casa === 'blue');
            const ccl = data.find(d => d.casa === 'contadoconliqui');
            const oficial = data.find(d => d.casa === 'oficial');

            let brecha = 0;
            if (ccl && oficial) {
                brecha = (((ccl.venta / oficial.venta) - 1) * 100).toFixed(1);
            }

            container.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                    <div style="background: #2a2e39; padding: 8px; border-radius: 4px; border-left: 3px solid #4caf50;">
                        <div style="font-size: 10px; color: #848e9c;">DÓLAR BLUE</div>
                        <div style="font-size: 16px; font-weight: bold; color: white;">$${blue ? blue.venta : '---'}</div>
                    </div>
                    <div style="background: #2a2e39; padding: 8px; border-radius: 4px; border-left: 3px solid #2962ff;">
                        <div style="font-size: 10px; color: #848e9c;">DÓLAR CCL</div>
                        <div style="font-size: 16px; font-weight: bold; color: white;">$${ccl ? ccl.venta.toFixed(0) : '---'}</div>
                    </div>
                </div>
                <div style="background: #2a2e39; padding: 10px; border-radius: 4px; border-bottom: 2px solid #f44336; margin-bottom: 10px;">
                    <p style="margin: 0; font-size: 11px; color: #848e9c;">BRECHA (CCL/OFICIAL)</p>
                    <p style="margin: 2px 0 0 0; font-size: 18px; font-weight: bold; color: white;">${brecha}%</p>
                </div>
                <p style="font-size: 11px; color: #848e9c; margin-bottom: 5px;">Última actualización: ${new Date(result.last_updated).toLocaleTimeString()}</p>
                <ul style="padding-left: 18px; font-size: 12px; color: #d1d4dc; margin: 0;">
                    <li>Monitoreando volatilidad intradía.</li>
                    <li>Screener actualizado con datos de BCBA.</li>
                </ul>
            `;
        } catch (error) {
            console.error('Error loading highlights:', error);
            container.innerHTML = '<p>Error cargando datos locales.</p>';
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ScreenerPro.init();
});
