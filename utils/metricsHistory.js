/**
 * Gestor de histórico de métricas (últimas 24 horas)
 * Almacena muestras en memoria con límite temporal
 */

class MetricsHistory {
    constructor(maxHours = 24, sampleInterval = 60000) { // 60 segundos por defecto
        this.maxHours = maxHours;
        this.sampleInterval = sampleInterval;
        this.history = [];
        this.lastSampleTime = Date.now();
    }

    /**
     * Registra una muestra de métricas
     */
    recordSample(metrics) {
        const now = Date.now();

        // Solo registrar si pasó el intervalo
        if (now - this.lastSampleTime < this.sampleInterval) {
            return;
        }

        const sample = {
            timestamp: now,
            time: new Date(now).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            memory: metrics.system?.memory?.used || 0,
            cpu: metrics.system?.cpu || 0,
            cacheHitRate: metrics.cache?.redis?.hitRate || metrics.cache?.memory?.hitRate || 0,
            avgResponseTime: metrics.http?.avgResponseTime || 0,
            errorRate: metrics.http?.requests?.total > 0 
                ? Math.round(((metrics.http.requests.failed || 0) / metrics.http.requests.total) * 100)
                : 0,
            dbSlowQueries: metrics.database?.queries?.slow || 0,
            discordRateLimited: metrics.discord?.apiCalls?.rateLimited || 0
        };

        this.history.push(sample);
        this.lastSampleTime = now;

        // Limpiar muestras antiguas (más de maxHours)
        const cutoffTime = now - (this.maxHours * 3600 * 1000);
        this.history = this.history.filter(s => s.timestamp > cutoffTime);
    }

    /**
     * Obtiene el histórico completo
     */
    getHistory() {
        return this.history;
    }

    /**
     * Obtiene histórico de últimas N horas
     */
    getLastHours(hours = 1) {
        const cutoffTime = Date.now() - (hours * 3600 * 1000);
        return this.history.filter(s => s.timestamp > cutoffTime);
    }

    /**
     * Calcula promedio de una métrica en un período
     */
    getAverage(metric, hours = 1) {
        const samples = this.getLastHours(hours);
        if (samples.length === 0) return 0;

        const sum = samples.reduce((acc, s) => acc + (s[metric] || 0), 0);
        return Math.round(sum / samples.length);
    }

    /**
     * Obtiene máximo y mínimo de una métrica
     */
    getMinMax(metric, hours = 1) {
        const samples = this.getLastHours(hours);
        if (samples.length === 0) return { min: 0, max: 0 };

        const values = samples.map(s => s[metric] || 0);
        return {
            min: Math.min(...values),
            max: Math.max(...values)
        };
    }

    /**
     * Limpia el histórico
     */
    clear() {
        this.history = [];
        this.lastSampleTime = Date.now();
    }
}

module.exports = new MetricsHistory(24, 10000); // 24 horas, muestra cada 10s
