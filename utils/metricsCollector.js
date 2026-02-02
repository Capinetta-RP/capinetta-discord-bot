/**
 * @file metricsCollector.js
 * @description Sistema de recolección de métricas en tiempo real
 */

class MetricsCollector {
    constructor() {
        this.metrics = {
            system: {
                uptime: 0,
                memory: { used: 0, total: 0, percentage: 0 },
                cpu: 0
            },
            cache: {
                redis: {
                    connected: false,
                    hits: 0,
                    misses: 0,
                    hitRate: 0,
                    keys: 0
                },
                memory: {
                    size: 0,
                    maxSize: 1000
                }
            },
            database: {
                queries: {
                    total: 0,
                    slow: 0,
                    failed: 0
                },
                connections: 0
            },
            discord: {
                apiCalls: {
                    total: 0,
                    ratelimited: 0,
                    failed: 0
                },
                guilds: 0,
                users: 0
            },
            http: {
                requests: {
                    total: 0,
                    successful: 0,
                    failed: 0
                },
                avgResponseTime: 0
            }
        };

        this.requestTimes = [];
        this.maxRequestTimes = 100;
        this.startTime = Date.now();
    }

    // Sistema
    updateSystemMetrics() {
        const used = process.memoryUsage();
        const rss = used.rss; // Resident Set Size - memoria total del proceso en bytes
        const os = require('os');
        const totalMemory = os.totalmem(); // Memoria total del sistema

        this.metrics.system.uptime = Math.floor((Date.now() - this.startTime) / 1000);
        this.metrics.system.memory = {
            used: Math.round(rss / 1024 / 1024), // RSS en MB
            total: Math.round(totalMemory / 1024 / 1024), // Memoria total del sistema en MB
            percentage: Math.round((rss / totalMemory) * 100) // % de RAM del sistema usada
        };
        this.metrics.system.cpu = process.cpuUsage().user / 1000000; // microsegundos a segundos
    }

    // Cache Redis
    recordCacheHit() {
        this.metrics.cache.redis.hits++;
        this.updateCacheHitRate();
    }

    recordCacheMiss() {
        this.metrics.cache.redis.misses++;
        this.updateCacheHitRate();
    }

    updateCacheHitRate() {
        const total = this.metrics.cache.redis.hits + this.metrics.cache.redis.misses;
        this.metrics.cache.redis.hitRate = total > 0
            ? Math.round((this.metrics.cache.redis.hits / total) * 100)
            : 0;
    }

    setRedisStatus(connected) {
        this.metrics.cache.redis.connected = connected;
    }

    updateRedisKeys(count) {
        this.metrics.cache.redis.keys = count;
    }

    updateMemoryCacheSize(size) {
        this.metrics.cache.memory.size = size;
    }

    // Base de datos
    recordQuery(duration, isSlow = false, failed = false) {
        this.metrics.database.queries.total++;
        if (isSlow) this.metrics.database.queries.slow++;
        if (failed) this.metrics.database.queries.failed++;
    }

    updateDbConnections(count) {
        this.metrics.database.connections = count;
    }

    // Discord API
    recordDiscordCall(success = true, ratelimited = false) {
        this.metrics.discord.apiCalls.total++;
        if (ratelimited) this.metrics.discord.apiCalls.ratelimited++;
        if (!success) this.metrics.discord.apiCalls.failed++;
    }

    updateDiscordStats(guilds, users) {
        this.metrics.discord.guilds = guilds;
        this.metrics.discord.users = users;
    }

    // HTTP
    recordRequest(responseTime, statusCode) {
        this.metrics.http.requests.total++;

        if (statusCode >= 200 && statusCode < 400) {
            this.metrics.http.requests.successful++;
        } else {
            this.metrics.http.requests.failed++;
        }

        // Mantener últimos N tiempos de respuesta
        this.requestTimes.push(responseTime);
        if (this.requestTimes.length > this.maxRequestTimes) {
            this.requestTimes.shift();
        }

        // Calcular promedio
        const sum = this.requestTimes.reduce((a, b) => a + b, 0);
        this.metrics.http.avgResponseTime = Math.round(sum / this.requestTimes.length);
    }

    // Obtener todas las métricas
    getMetrics() {
        this.updateSystemMetrics();
        return {
            ...this.metrics,
            timestamp: Date.now()
        };
    }

    // Reset de contadores (para estadísticas diarias)
    resetCounters() {
        this.metrics.http.requests = { total: 0, successful: 0, failed: 0 };
        this.metrics.database.queries = { total: 0, slow: 0, failed: 0 };
        this.metrics.discord.apiCalls = { total: 0, ratelimited: 0, failed: 0 };
        this.requestTimes = [];
    }
}

// Singleton
const metricsCollector = new MetricsCollector();

module.exports = metricsCollector;
