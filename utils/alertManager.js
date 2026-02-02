/**
 * Gestor de alertas automáticas
 * Envía notificaciones a Discord cuando se cumplen condiciones
 */

class AlertManager {
    constructor() {
        this.alerts = [];
        this.thresholds = {
            errorRate: 5,           // % de errores HTTP
            cacheHitRate: 60,       // % mínimo
            slowQueries: 10,        // cantidad máxima
            memoryUsage: 85,        // % máximo de RAM del sistema
            discordRateLimited: 5,  // cantidad máxima por período
            avgResponseTime: 1000   // ms
        };
        this.cooldowns = new Map(); // Evitar spam de alertas
        this.cooldownDuration = 300000; // 5 minutos
    }

    /**
     * Configura umbrales personalizados
     */
    setThresholds(custom) {
        this.thresholds = { ...this.thresholds, ...custom };
    }

    /**
     * Valida métricas y retorna alertas activas
     */
    checkMetrics(metrics) {
        const activeAlerts = [];

        // Error rate alto
        if (metrics.http?.requests?.total > 0) {
            const errorRate = Math.round((metrics.http.requests.failed / metrics.http.requests.total) * 100);
            if (errorRate > this.thresholds.errorRate) {
                activeAlerts.push({
                    severity: 'HIGH',
                    type: 'HTTP_ERROR_RATE',
                    message: `🔴 Tasa de error HTTP elevada: ${errorRate}%`,
                    value: errorRate,
                    threshold: this.thresholds.errorRate
                });
            }
        }

        // Cache hit rate bajo
        const hitRate = metrics.cache?.redis?.hitRate || metrics.cache?.memory?.hitRate || 0;
        if (hitRate < this.thresholds.cacheHitRate && hitRate > 0) {
            activeAlerts.push({
                severity: 'MEDIUM',
                type: 'LOW_CACHE_HIT_RATE',
                message: `🟡 Hit rate del caché bajo: ${hitRate}%`,
                value: hitRate,
                threshold: this.thresholds.cacheHitRate
            });
        }

        // Queries lentas excesivas
        const slowQueries = metrics.database?.queries?.slow || 0;
        if (slowQueries > this.thresholds.slowQueries) {
            activeAlerts.push({
                severity: 'HIGH',
                type: 'SLOW_QUERIES',
                message: `🔴 Demasiadas queries lentas: ${slowQueries}`,
                value: slowQueries,
                threshold: this.thresholds.slowQueries
            });
        }

        // Memoria alta
        if (metrics.system?.memory?.percentage > this.thresholds.memoryUsage) {
            activeAlerts.push({
                severity: 'HIGH',
                type: 'HIGH_MEMORY',
                message: `🔴 Uso de memoria elevado: ${metrics.system.memory.percentage}%`,
                value: metrics.system.memory.percentage,
                threshold: this.thresholds.memoryUsage
            });
        }

        // Rate limit de Discord
        const rateLimited = metrics.discord?.apiCalls?.rateLimited || 0;
        if (rateLimited > this.thresholds.discordRateLimited) {
            activeAlerts.push({
                severity: 'MEDIUM',
                type: 'DISCORD_RATE_LIMIT',
                message: `🟡 Discord API rate limited ${rateLimited} veces`,
                value: rateLimited,
                threshold: this.thresholds.discordRateLimited
            });
        }

        // Response time alto
        if (metrics.http?.avgResponseTime > this.thresholds.avgResponseTime) {
            activeAlerts.push({
                severity: 'MEDIUM',
                type: 'SLOW_RESPONSE',
                message: `🟡 Tiempo de respuesta elevado: ${metrics.http.avgResponseTime}ms`,
                value: metrics.http.avgResponseTime,
                threshold: this.thresholds.avgResponseTime
            });
        }

        this.alerts = activeAlerts;
        return activeAlerts;
    }

    /**
     * Filtra alertas que no están en cooldown
     */
    getAlertsToSend() {
        const now = Date.now();
        return this.alerts.filter(alert => {
            const key = alert.type;
            const lastTime = this.cooldowns.get(key) || 0;
            
            if (now - lastTime > this.cooldownDuration) {
                this.cooldowns.set(key, now);
                return true;
            }
            return false;
        });
    }

    /**
     * Genera embed para Discord
     */
    generateEmbed(alert) {
        const colors = {
            'HIGH': 15158332,    // Rojo
            'MEDIUM': 16776960,  // Amarillo
            'LOW': 32768         // Verde
        };

        return {
            color: colors[alert.severity],
            title: alert.message,
            fields: [
                {
                    name: 'Valor actual',
                    value: `\`${alert.value}\``,
                    inline: true
                },
                {
                    name: 'Umbral',
                    value: `\`${alert.threshold}\``,
                    inline: true
                },
                {
                    name: 'Timestamp',
                    value: `<t:${Math.floor(Date.now() / 1000)}:T>`,
                    inline: false
                }
            ],
            footer: {
                text: 'Sistema de Monitoreo Capi Netta'
            }
        };
    }

    /**
     * Obtiene alertas activas
     */
    getActiveAlerts() {
        return this.alerts;
    }

    /**
     * Limpia alertas
     */
    clear() {
        this.alerts = [];
    }
}

module.exports = new AlertManager();
