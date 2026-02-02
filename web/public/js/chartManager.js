/**
 * Utilidades compartidas para gráficos
 */

class ChartManager {
    constructor() {
        this.charts = {};
        this.defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#a8d8ff',
                        font: { size: 12, weight: '600' },
                        padding: 15
                    }
                },
                filler: { propagate: true }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(0, 212, 255, 0.1)' },
                    ticks: { color: '#a8d8ff', font: { size: 11 } },
                    beginAtZero: true,
                    suggestedMax: 5 // Evita que gráficos vacíos se vean gigantes (0-1)
                },
                x: {
                    grid: { color: 'rgba(0, 212, 255, 0.1)' },
                    ticks: { color: '#a8d8ff', font: { size: 11 } }
                }
            }
        };
    }

    /**
     * Destruye un gráfico existente de forma segura
     */
    destroy(chartId) {
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
            delete this.charts[chartId];
        }
    }

    /**
     * Crea un gráfico de línea
     */
    createLineChart(canvasId, labels, datasets, options = {}) {
        this.destroy(canvasId);

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`❌ Canvas ${canvasId} no encontrado`);
            return null;
        }

        const config = {
            type: 'line',
            data: {
                labels,
                datasets: datasets.map(ds => ({
                    fill: true,
                    tension: 0.3,
                    ...ds
                }))
            },
            options: { ...this.defaultOptions, ...options }
        };

        this.charts[canvasId] = new Chart(canvas, config);
        return this.charts[canvasId];
    }

    /**
     * Crea un gráfico de barras
     */
    createBarChart(canvasId, labels, datasets, options = {}) {
        this.destroy(canvasId);

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`❌ Canvas ${canvasId} no encontrado`);
            return null;
        }

        const config = {
            type: 'bar',
            data: {
                labels,
                datasets
            },
            options: { ...this.defaultOptions, ...options }
        };

        this.charts[canvasId] = new Chart(canvas, config);
        return this.charts[canvasId];
    }

    /**
     * Crea un gráfico de rosquilla/doughnut
     */
    createDoughnutChart(canvasId, labels, data, options = {}) {
        this.destroy(canvasId);

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`❌ Canvas ${canvasId} no encontrado`);
            return null;
        }

        const config = {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: ['#ef4444', '#10b981', '#f59e0b']
                }]
            },
            options: { ...this.defaultOptions, ...options }
        };

        this.charts[canvasId] = new Chart(canvas, config);
        return this.charts[canvasId];
    }

    /**
     * Destruye todos los gráficos
     */
    destroyAll() {
        Object.keys(this.charts).forEach(key => this.destroy(key));
    }
}

// Instancia global
const chartManager = new ChartManager();
