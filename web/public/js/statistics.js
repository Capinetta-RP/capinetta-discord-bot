// Unificación de listeners y lógica de inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (window.logger) logger.info('Inicializando página de estadísticas...');

    // Dropdown Toggles
    setupDropdown('guildDropdownBtn', 'guildDropdownWrapper');
    setupDropdown('levelDropdownBtn', 'levelDropdownWrapper');

    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.server-dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });

    // Botón Buscar
    const btnApplyFilters = document.getElementById('btnApplyFilters');
    if (btnApplyFilters) {
        btnApplyFilters.addEventListener('click', applyFilters);
    }

    // Botón Limpiar
    const btnClearFilters = document.getElementById('btnClearFilters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', clearFilters);
    }

    // Botón Exportar CSV
    const btnExportLogs = document.getElementById('btnExportLogs');
    if (btnExportLogs) {
        btnExportLogs.addEventListener('click', exportLogs);
    }

    // Cargar logs inicialmente
    loadLogs(1);

    // Cargar gráficos si hay un servidor seleccionado por defecto (o "todos")
    const guildSelector = document.getElementById('guildSelector');
    if (guildSelector && guildSelector.value) {
        loadGuildCharts(guildSelector.value);
    } else {
        // Cargar gráficos globales si no hay servidor seleccionado
        loadGlobalCharts();
    }

    if (window.logger) logger.success('Estadísticas inicializadas');
});

// Helpers para Dropdowns Custom
function setupDropdown(btnId, wrapperId) {
    const btn = document.getElementById(btnId);
    const wrapper = document.getElementById(wrapperId);

    if (!btn || !wrapper) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = wrapper.querySelector('.dropdown-menu');

        // Cerrar otros
        document.querySelectorAll('.dropdown-menu').forEach(m => {
            if (m !== menu) m.classList.remove('show');
        });

        // Toggle actual
        if (menu) menu.classList.toggle('show');
    });
}

// Funciones globales para los items del dropdown (llamadas desde onclick en EJS)
window.selectGuild = function (value, name) {
    const input = document.getElementById('guildSelector');
    const btn = document.getElementById('guildDropdownBtn');
    const wrapper = document.getElementById('guildDropdownWrapper');

    if (input) input.value = value;
    if (btn) btn.querySelector('span').textContent = name;

    // Actualizar clase active
    updateActiveItem(wrapper, value);

    // Cerrar menú
    const menu = wrapper.querySelector('.dropdown-menu');
    if (menu) menu.classList.remove('show');

    // Lógica de cambio de servidor
    changeGuild(value);
};

window.selectLevel = function (value, name) {
    const input = document.getElementById('filterLevel');
    const btn = document.getElementById('levelDropdownBtn');
    const wrapper = document.getElementById('levelDropdownWrapper');

    if (input) input.value = value;
    if (btn) btn.querySelector('span').textContent = name;

    // Actualizar clase active
    updateActiveItem(wrapper, value);

    // Cerrar menú
    const menu = wrapper.querySelector('.dropdown-menu');
    if (menu) menu.classList.remove('show');
};

function updateActiveItem(wrapper, value) {
    if (!wrapper) return;
    wrapper.querySelectorAll('.dropdown-item').forEach(item => {
        if (item.getAttribute('data-value') === value) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * Funciones para la página de estadísticas
 */

let currentPage = 1;
let currentFilters = {};

// Cargar gráficos globales de comparación
async function loadGlobalCharts() {
    try {
        const res = await fetch('/api/guilds/comparison');

        if (!res.ok) {
            console.error('Failed to fetch global stats:', res.status);
            document.getElementById('logStatsSection').innerHTML = `<div class="alert alert-warning">No se pudieron cargar los gráficos globales (Status: ${res.status})</div>`;
            return;
        }

        const data = await res.json();
        if (!data || !data.labels || data.labels.length === 0) {
            document.getElementById('logStatsSection').innerHTML = '<div class="alert alert-info" style="text-align: center; padding: 20px;">No hay datos suficientes para mostrar estadísticas comparativas.</div>';
            return;
        }

        let html = '<div class="stats-row">';

        // Gráfico de Barras: Comparación de Miembros y Staff
        html += `
            <div class="chart-container" style="height: 350px;">
                <h3>🌐 Comparativa de Servidores</h3>
                <canvas id="globalComparisonChart"></canvas>
            </div>
        `;

        // Gráfico de Pastel: Distribución de Warns
        html += `
            <div class="chart-container" style="height: 350px;">
                <h3>⚠️ Distribución de Advertencias</h3>
                <canvas id="globalWarnsChart"></canvas>
            </div>
        `;

        // Gráfico de Línea: Actividad por Hora
        html += `
            <div class="chart-container" style="height: 350px; flex-basis: 100%;">
                <h3>📉 Actividad por Hora (Global)</h3>
                <canvas id="activityChart"></canvas>
            </div>
        `;

        html += '</div>';
        document.getElementById('logStatsSection').innerHTML = html;

        // Obtener estadísticas de actividad
        const statsRes = await fetch('/api/logs/statistics');
        const statsData = await statsRes.json();

        // Crear gráfico de comparación
        if (data.labels && data.labels.length > 0) {
            chartManager.createBarChart('globalComparisonChart',
                data.labels,
                [
                    {
                        label: 'Usuarios Activos',
                        data: data.members,
                        backgroundColor: '#3498db'
                    },
                    {
                        label: 'Tickets Abiertos',
                        data: data.tickets,
                        backgroundColor: '#fab1a0'
                    }
                ]
            );

            // Crear gráfico de warns
            chartManager.createDoughnutChart('globalWarnsChart',
                data.labels,
                data.warns
            );
        }

        // Crear gráfico de actividad
        if (statsData.stats && statsData.stats.logsPerHour) {
            const hours = Object.keys(statsData.stats.logsPerHour).sort();
            const counts = hours.map(h => statsData.stats.logsPerHour[h]);

            // Extract hour part only for label "2026-02-02T03..." -> "03:00"
            const labels = hours.map(h => {
                const date = new Date(h + ':00:00Z'); // Asumir UTC del servidor
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            });

            chartManager.createLineChart('activityChart', labels, [{
                label: 'Logs / Actividad',
                data: counts,
                borderColor: '#e74c3c',
                tension: 0.4
            }]);
        }

    } catch (error) {
        if (window.logger) logger.error('Error loading global charts', error.message);
    }
}

// Cargar gráficos por servidor
async function loadGuildCharts(guildId) {
    // Si no hay ID (Todos los servidores), cargar gráficos globales
    if (!guildId) {
        await loadGlobalCharts();
        return;
    }

    try {
        const [warnsRes, ticketsRes] = await Promise.all([
            fetch(`/api/guild/${guildId}/warns-trend`),
            fetch(`/api/guild/${guildId}/tickets-status`)
        ]);

        if (!warnsRes.ok || !ticketsRes.ok) return;

        const warnsData = await warnsRes.json();
        const ticketsData = await ticketsRes.json();

        let html = '<div class="stats-row">';

        // Gráfico de warnings
        if (warnsData.trend && warnsData.trend.length > 0) {
            html += `
                <div class="chart-container" style="height: 300px;">
                    <h3>📈 Tendencia de Warnings (30 días)</h3>
                    <canvas id="warnsChart"></canvas>
                </div>
            `;
        }

        // Gráfico de tickets
        if (ticketsData.status) {
            html += `
                <div class="chart-container" style="height: 300px;">
                    <h3>🎫 Tickets por Estado</h3>
                    <canvas id="ticketsChart"></canvas>
                </div>
            `;
        }

        html += '</div>';
        document.getElementById('logStatsSection').innerHTML = html;

        // Dibujar gráficos usando chartManager
        if (warnsData.trend && warnsData.trend.length > 0) {
            chartManager.createBarChart('warnsChart',
                warnsData.trend.map(w => w.date),
                [{
                    label: 'Warnings',
                    data: warnsData.trend.map(w => w.count),
                    backgroundColor: '#f59e0b'
                }],
                { indexAxis: 'x' }
            );
        }

        if (ticketsData.status) {
            chartManager.createDoughnutChart('ticketsChart',
                ['Abiertos', 'Cerrados', 'Pendientes'],
                [ticketsData.status.open, ticketsData.status.closed, ticketsData.status.pending]
            );
        }

        if (window.logger) logger.success(`Gráficos cargados para servidor ${guildId}`);
    } catch (error) {
        if (window.logger) logger.error('Error loading charts', error.message);
    }
}

// Aplicar filtros
async function applyFilters() {
    currentPage = 1;
    currentFilters = {
        level: document.getElementById('filterLevel').value,
        search: document.getElementById('filterSearch').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value
    };

    if (window.logger) logger.info('Applying filters', currentFilters);

    // Visual feedback is maintained by inputs automatically, but ensure validation?
    await loadLogs();
}

// Limpiar filtros
function clearFilters() {
    // Reset Level Dropdown UI
    if (window.selectLevel) {
        window.selectLevel('', 'Todos');
    } else {
        document.getElementById('filterLevel').value = 'Todos';
    }

    document.getElementById('filterSearch').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';

    currentFilters = {};
    currentPage = 1;
    loadLogs();
}

// Cargar logs con filtros
async function loadLogs(page = 1) {
    try {
        currentPage = page;

        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', 50);

        if (currentFilters.level && currentFilters.level !== 'Todos') params.append('level', currentFilters.level);
        if (currentFilters.search) params.append('search', currentFilters.search);
        if (currentFilters.startDate) params.append('startDate', currentFilters.startDate);
        if (currentFilters.endDate) params.append('endDate', currentFilters.endDate);

        // Add Guild ID if selected
        const guildSelector = document.getElementById('guildSelector');
        if (guildSelector && guildSelector.value) {
            params.append('guildId', guildSelector.value);
        }

        const data = await apiManager.fetch(`/api/logs/search?${params}`);

        const table = document.getElementById('logsTable');
        if (!table) {
            if (window.logger) logger.error('logsTable element not found');
            return;
        }

        if (data.logs.length === 0) {
            table.innerHTML = '<tr><td colspan="4">No hay logs disponibles</td></tr>';
            return;
        }

        table.innerHTML = data.logs.map(log => `
            <tr>
                <td class="log-timestamp">${new Date(log.timestamp).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</td>
                <td><span class="level-badge level-${log.level}">${log.level}</span></td>
                <td>${log.message}</td>
                <td>${log.context || '--'}</td>
            </tr>
        `).join('');

        // Actualizar paginación
        if (data.pagination) {
            updatePagination(data.pagination);
        }

        if (window.logger) logger.success(`Loaded ${data.logs.length} logs`);
    } catch (error) {
        if (window.logger) logger.error('Error loading logs', error.message);
    }
}

// Actualizar controles de paginación
function updatePagination(pagination) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;

    let html = '<div class="pagination">';

    if (pagination.currentPage > 1) {
        html += `<a onclick="loadLogs(1)">« Primera</a>`;
        html += `<a onclick="loadLogs(${pagination.currentPage - 1})">‹ Anterior</a>`;
    }

    for (let i = Math.max(1, pagination.currentPage - 2); i <= Math.min(pagination.totalPages, pagination.currentPage + 2); i++) {
        if (i === pagination.currentPage) {
            html += `<span class="active">${i}</span>`;
        } else {
            html += `<a onclick="loadLogs(${i})">${i}</a>`;
        }
    }

    if (pagination.currentPage < pagination.totalPages) {
        html += `<a onclick="loadLogs(${pagination.currentPage + 1})">Siguiente ›</a>`;
        html += `<a onclick="loadLogs(${pagination.totalPages})">Última »</a>`;
    }

    html += '</div>';
    container.innerHTML = html;
}

// Exportar logs a CSV
async function exportLogs() {
    try {
        const params = new URLSearchParams();

        if (currentFilters.level && currentFilters.level !== 'Todos') params.append('level', currentFilters.level);
        if (currentFilters.search) params.append('search', currentFilters.search);
        if (currentFilters.startDate) params.append('startDate', currentFilters.startDate);
        if (currentFilters.endDate) params.append('endDate', currentFilters.endDate);

        window.location.href = `/api/logs/export?${params}`;
        if (window.logger) logger.success('Logs exported');
    } catch (error) {
        if (window.logger) logger.error('Error exporting logs', error.message);
    }
}

// Cambio de servidor
async function changeGuild(guildId) {
    // El input hidden ya se actualiza en selectGuild, pero por seguridad:
    // Actualizar URL sin recargar
    try {
        const url = new URL(window.location);
        if (guildId) {
            url.searchParams.set('server', guildId);
        } else {
            url.searchParams.delete('server');
        }
        window.history.pushState({}, '', url);
    } catch (e) {
        // Ignorar si falla en navegadores viejos
    }

    await loadLogs(1, guildId);
    await loadGuildCharts(guildId);
}

// Cargar logs con filtros
async function loadLogs(page = 1, specificGuildId = null) {
    try {
        currentPage = page;

        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', 50);

        if (currentFilters.level && currentFilters.level !== 'Todos') params.append('level', currentFilters.level);
        if (currentFilters.search) params.append('search', currentFilters.search);
        if (currentFilters.startDate) params.append('startDate', currentFilters.startDate);
        if (currentFilters.endDate) params.append('endDate', currentFilters.endDate);

        // Add Guild ID if selected
        const guildSelector = document.getElementById('guildSelector');
        let activeGuildId = specificGuildId !== null ? specificGuildId : (guildSelector ? guildSelector.value : null);

        if (activeGuildId) {
            params.append('guildId', activeGuildId);
        }

        const data = await apiManager.fetch(`/api/logs/search?${params}`);

        const table = document.getElementById('logsTable');
        if (!table) return;

        // update Headers if needed (Show/Hide Server Column)
        const thead = document.querySelector('.logs-table thead tr');
        if (thead) {
            // Check if column exists
            let serverHeader = thead.querySelector('.server-col-header');
            if (!activeGuildId && !serverHeader) {
                // Add header if All Servers
                const th = document.createElement('th');
                th.className = 'server-col-header';
                th.textContent = 'SERVIDOR';
                thead.insertBefore(th, thead.children[0]); // Insert first
            } else if (activeGuildId && serverHeader) {
                // Remove header if Specific Server
                serverHeader.remove();
            }
        }

        if (data.logs.length === 0) {
            table.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No hay logs disponibles</td></tr>';
            return;
        }

        table.innerHTML = data.logs.map(log => {
            const dateStr = new Date(log.timestamp).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
            let serverCell = '';

            if (!activeGuildId) {
                const guildName = (log.guildId && guildMap[log.guildId]) ? guildMap[log.guildId] : (log.guildId || 'Global');
                serverCell = `<td><span class="badge badge-server">${guildName}</span></td>`;
            }

            return `
            <tr>
                ${serverCell}
                <td class="log-timestamp">${dateStr}</td>
                <td><span class="level-badge level-${log.level}">${log.level}</span></td>
                <td>${log.message}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.context || '--'}</td>
            </tr>
        `}).join('');

        // Fix Pagination Mapping (API returns flat object)
        const paginationData = {
            currentPage: data.page,
            totalPages: data.totalPages,
            totalLogs: data.filtered
        };

        // Update Log Count Display
        const countDisplay = document.querySelector('.logs-found-text');
        if (countDisplay) {
            countDisplay.innerText = `${data.filtered || 0} logs encontrados`;
        }

        if (data.totalPages > 1) {
            updatePagination(paginationData);
        } else {
            document.getElementById('paginationContainer').innerHTML = '';
        }

    } catch (error) {
        if (window.logger) logger.error('Error loading logs', error.message);
    }
}
