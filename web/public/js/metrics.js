/**
 * Funciones para la página de métricas
 */

// Formatear uptime
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

// Formatear bytes a MB
function formatBytes(bytes) {
    return Math.round(bytes / 1024 / 1024);
}

// Cargar métricas actuales
async function loadMetrics() {
    try {
        const data = await apiManager.fetch('/api/metrics');

        // Helper para actualizar elemento de forma segura
        const safeUpdate = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        // Helper para actualizar estilo de forma segura
        const safeStyle = (id, prop, value) => {
            const el = document.getElementById(id);
            if (el) el.style[prop] = value;
        };

        // Actualizar Sistema
        safeUpdate('uptime', formatUptime(data.system?.uptime || 0));
        safeUpdate('memory', `${data.system?.memory?.used || 0}MB / ${data.system?.memory?.total || 0}MB`);
        safeStyle('memoryProgress', 'width', `${data.system?.memory?.percentage || 0}%`);

        // Actualizar Caché
        const cacheStatus = document.getElementById('cacheStatus');
        const cacheType = document.getElementById('cacheType');

        if (cacheStatus) {
            if (data.cache?.redis?.connected) {
                cacheStatus.className = 'status-indicator status-online';
                if (cacheType) cacheType.textContent = 'Redis';
            } else {
                cacheStatus.className = 'status-indicator status-offline';
                if (cacheType) cacheType.textContent = 'Memory';
            }
        }

        safeUpdate('cacheHitRate', `${data.cache?.redis?.hitRate || data.cache?.memory?.hitRate || 0}%`);
        safeUpdate('cacheKeys', data.cache?.redis?.keys || 0);

        // Actualizar Discord
        safeUpdate('guilds', data.discord?.guilds || 0);
        safeUpdate('users', data.discord?.users || 0);
        safeUpdate('discordCalls', data.discord?.apiCalls?.total || 0);

        // Actualizar HTTP
        safeUpdate('httpRequests', data.http?.requests?.total || 0);
        safeUpdate('avgResponseTime', `${data.http?.avgResponseTime || 0}ms`);
        const successRate = data.http?.requests?.total > 0
            ? Math.round((data.http.requests.successful / data.http.requests.total) * 100)
            : 0;
        safeUpdate('successRate', `${successRate}%`);

        // Actualizar Base de Datos
        safeUpdate('dbQueries', data.database?.queries?.total || 0);
        safeUpdate('slowQueries', data.database?.queries?.slow || 0);

        // Mostrar alertas
        showAlerts(data.alerts || []);

        logger.success('Métricas actualizadas');
    } catch (error) {
        logger.error('Error loading metrics', error.message);
    }
}

// Mostrar alertas activas
function showAlerts(alerts) {
    const section = document.getElementById('alertsSection');
    if (alerts.length === 0) {
        section.innerHTML = '';
        return;
    }

    section.innerHTML = '<div class="alerts-container"><h2>🚨 Alertas Activas</h2>' +
        alerts.map(alert => `
            <div class="alert-item alert-${alert.severity.toLowerCase()}">
                <div>
                    <strong>${alert.message}</strong><br>
                    <small>Valor: ${alert.value} | Umbral: ${alert.threshold}</small>
                </div>
                <button onclick="sendAlert('${alert.type}')" class="btn btn-small">Notificar</button>
            </div>
        `).join('') + '</div>';
}

// Enviar alerta a Discord
async function sendAlert(type) {
    try {
        await apiManager.post('/api/alerts/send', { type });
        alert('Alerta enviada a Discord!');
    } catch (error) {
        logger.error('Error sending alert', error.message);
    }
}

// Cargar estado FiveM
async function loadFiveMStatus() {
    try {
        const response = await apiManager.fetch('/api/fivem/status');
        const status = response?.status || response;
        const indicator = document.getElementById('fivemStatus');
        const state = document.getElementById('fivemState');

        if (status && status.online) {
            indicator.className = 'status-indicator status-online';
            state.textContent = 'Online';
            const playersCount = Number.isFinite(status.players)
                ? status.players
                : (Array.isArray(status.players) ? status.players.length : 0);
            const maxPlayers = Number.isFinite(status.maxPlayers)
                ? status.maxPlayers
                : (Number.isFinite(status.max_clients) ? status.max_clients : 0);
            const maxLabel = maxPlayers > 0 ? maxPlayers : '--';
            document.getElementById('fivemPlayers').textContent = `${playersCount}/${maxLabel}`;
            document.getElementById('fivemHostname').textContent = status.hostname || 'FiveM Server';
        } else {
            indicator.className = 'status-indicator status-offline';
            state.textContent = 'Offline';
            document.getElementById('fivemPlayers').textContent = '--';
            document.getElementById('fivemHostname').textContent = status?.error || 'Sin respuesta';
        }
    } catch (error) {
        logger.error('Error loading FiveM status', error.message);
    }
}

// Actualizar gráficos históricos
async function updateCharts(hours) {
    window.currentMetricsRange = hours;

    // Visual feedback for buttons
    const buttons = document.querySelectorAll('.range-btn[data-range]');
    buttons.forEach(btn => {
        if (parseInt(btn.getAttribute('data-range')) === parseInt(hours)) {
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-secondary');
        } else {
            btn.classList.add('btn-secondary');
            btn.classList.remove('btn-primary');
        }
    });

    try {
        logger.info(`📊 Loading charts for last ${hours} hour(s)...`);
        const data = await apiManager.fetch(`/api/metrics/history?hours=${hours}`);
        const history = data.history || [];

        logger.success(`Received ${history.length} samples`);

        if (history.length === 0) {
            logger.warn('No historical data available yet');
            return;
        }

        // Gráfico de Sistema
        const systemCtx = document.getElementById('systemChart');
        if (!systemCtx) {
            logger.error('Canvas systemChart no encontrado');
            return;
        }

        chartManager.createLineChart('systemChart',
            history.map(h => h.time),
            [
                {
                    label: 'Memoria (MB)',
                    data: history.map(h => h.memory || 0),
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.2)',
                    borderWidth: 3,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'CPU (%)',
                    data: history.map(h => h.cpu || 0),
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251, 191, 36, 0.15)',
                    borderWidth: 3,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ],
            {
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Memoria (MB)', color: '#00d4ff' },
                        grid: { color: 'rgba(0, 212, 255, 0.1)' },
                        ticks: { color: '#00d4ff' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'CPU (%)', color: '#fbbf24' },
                        grid: { display: false },
                        ticks: { color: '#fbbf24' }
                    }
                }
            }
        );

        // Gráfico HTTP
        const httpCtx = document.getElementById('httpChart');
        if (!httpCtx) {
            logger.error('Canvas httpChart no encontrado');
            return;
        }

        chartManager.createLineChart('httpChart',
            history.map(h => h.time),
            [
                {
                    label: 'Response Time (ms)',
                    data: history.map(h => h.avgResponseTime || 0),
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251, 191, 36, 0.15)',
                    borderWidth: 3,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Error Rate (%)',
                    data: history.map(h => h.errorRate || 0),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderWidth: 3,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ],
            {
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Response Time (ms)', color: '#fbbf24' },
                        grid: { color: 'rgba(0, 212, 255, 0.1)' },
                        ticks: { color: '#fbbf24' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Error Rate (%)', color: '#ef4444' },
                        grid: { display: false },
                        ticks: { color: '#ef4444' }
                    }
                }
            }
        );

        logger.success('Gráficos actualizados correctamente');

    } catch (error) {
        logger.error('Error loading charts', error.message);
    }
}

// Refrescar logs recientes
async function refreshLogs() {
    try {
        const data = await apiManager.fetch('/api/logs');
        const container = document.getElementById('logsContainer');

        if (data.logs.length === 0) {
            container.innerHTML = '<p>No hay logs disponibles.</p>';
            return;
        }

        container.innerHTML = data.logs.map(log => `
            <div class="log-entry ${log.level}">
                <div class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</div>
                <div><strong>${log.level}:</strong> ${log.message}</div>
            </div>
        `).join('');

    } catch (error) {
        logger.error('Error loading logs', error.message);
    }
}

// Inicialización cuando el documento está listo
document.addEventListener('DOMContentLoaded', () => {
    logger.info('Inicializando página de métricas...');

    // Cargar métricas cada 5 segundos
    loadMetrics();
    setInterval(loadMetrics, 5000);

    // Cargar estado FiveM cada 15 segundos
    loadFiveMStatus();
    setInterval(loadFiveMStatus, 15000);

    // Cargar logs inicialmente
    refreshLogs();

    // Inicializar gráficos después de que Chart.js esté listo
    setTimeout(() => {
        updateCharts(1);
        logger.success('Gráficos inicializados');
    }, 300);

    // Actualizar gráficos cada 30 segundos
    setInterval(() => updateCharts(window.currentMetricsRange || 1), 30000);
});
