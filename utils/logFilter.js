/**
 * Gestor de filtros y búsqueda de logs
 */

const fs = require('fs');
const path = require('path');

class LogFilter {
    /**
     * Lee y procesa logs con filtros aplicados
     */
    static readLogs(options = {}) {
        const {
            level = null,           // ERROR, WARN, INFO, DEBUG
            search = null,          // palabra clave
            startDate = null,       // ISO string
            endDate = null,         // ISO string
            guildId = null,         // Filter by guild ID
            limit = 100,
            offset = 0
        } = options;

        try {
            const logsPath = path.join(__dirname, '../logs');
            if (!fs.existsSync(logsPath)) {
                return { logs: [], total: 0, filtered: 0 };
            }


            const files = fs.readdirSync(logsPath).filter(f => f.endsWith('.log')).sort().reverse();
            let allLogs = [];

            // Leer todos los archivos de log
            for (const file of files) {
                const content = fs.readFileSync(path.join(logsPath, file), 'utf8');
                const lines = content.trim().split('\n');

                for (const line of lines) {
                    try {
                        const log = JSON.parse(line);
                        // Filter out HTTP Request logs as requested by user ("garbage info")
                        if (log.message === 'HTTP Request') {
                            continue;
                        }
                        allLogs.push(log);
                    } catch (e) {
                        // Ignorar líneas que no sean JSON válido
                    }
                }
            }

            const totalLogs = allLogs.length;

            // Aplicar filtros
            let filtered = allLogs;

            // Filtro por nivel (insensible a mayúsculas/minúsculas)
            if (level && level !== 'ALL') {
                filtered = filtered.filter(log => (log.level || '').toUpperCase() === level.toUpperCase());
            }

            // Filtro por búsqueda de texto
            if (search) {
                const searchLower = search.toLowerCase();
                filtered = filtered.filter(log =>
                    JSON.stringify(log).toLowerCase().includes(searchLower)
                );
            }

            // Filtro por fechas
            if (startDate) {
                const start = new Date(startDate).getTime();
                filtered = filtered.filter(log => new Date(log.timestamp).getTime() >= start);
            }

            if (endDate) {
                const end = new Date(endDate).getTime();
                filtered = filtered.filter(log => new Date(log.timestamp).getTime() <= end);
            }

            const filteredTotal = filtered.length;

            // Ordenar por timestamp (más recientes primero)
            filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Paginar
            const paginatedLogs = filtered.slice(offset, offset + limit);

            return {
                logs: paginatedLogs,
                total: totalLogs,
                filtered: filteredTotal,
                page: Math.floor(offset / limit) + 1,
                pageSize: limit,
                totalPages: Math.ceil(filteredTotal / limit)
            };
        } catch (error) {
            console.error('Error reading logs:', error);
            return { logs: [], total: 0, filtered: 0, error: error.message };
        }
    }

    /**
     * Obtiene estadísticas de logs
     */
    static getStatistics(options = {}) {
        const { startDate = null, endDate = null } = options;

        try {
            const logsPath = path.join(__dirname, '../logs');
            if (!fs.existsSync(logsPath)) {
                return { stats: {} };
            }

            const files = fs.readdirSync(logsPath).filter(f => f.endsWith('.log')).sort().reverse();
            let allLogs = [];

            // Leer todos los logs
            for (const file of files) {
                const content = fs.readFileSync(path.join(logsPath, file), 'utf8');
                const lines = content.trim().split('\n');

                for (const line of lines) {
                    try {
                        const log = JSON.parse(line);

                        // Aplicar filtros de fecha si existen
                        const logTime = new Date(log.timestamp).getTime();
                        const inRange = (!startDate || logTime >= new Date(startDate).getTime()) &&
                            (!endDate || logTime <= new Date(endDate).getTime());

                        if (inRange) {
                            allLogs.push(log);
                        }
                    } catch (e) {
                        // Ignorar
                    }
                }
            }

            // Calcular estadísticas
            const stats = {
                total: allLogs.length,
                byLevel: {
                    ERROR: 0,
                    WARN: 0,
                    INFO: 0,
                    DEBUG: 0
                },
                byContext: {},
                topErrors: [],
                logsPerHour: {}
            };

            for (const log of allLogs) {
                // Por nivel
                if (stats.byLevel[log.level] !== undefined) {
                    stats.byLevel[log.level]++;
                }

                // Por contexto
                const context = log.context || log.endpoint || 'general';
                stats.byContext[context] = (stats.byContext[context] || 0) + 1;

                // Logs por hora
                const hour = new Date(log.timestamp).toISOString().substring(0, 13);
                stats.logsPerHour[hour] = (stats.logsPerHour[hour] || 0) + 1;
            }

            // Top 10 errores
            const errorMap = {};
            for (const log of allLogs.filter(l => l.level === 'ERROR')) {
                const msg = log.message || 'Unknown error';
                errorMap[msg] = (errorMap[msg] || 0) + 1;
            }

            stats.topErrors = Object.entries(errorMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([message, count]) => ({ message, count }));

            return { stats };
        } catch (error) {
            console.error('Error calculating statistics:', error);
            return { stats: {}, error: error.message };
        }
    }

    /**
     * Exporta logs a CSV
     */
    static exportToCSV(options = {}) {
        try {
            const { logs } = this.readLogs(options);

            if (logs.length === 0) {
                return null;
            }

            const headers = ['Timestamp', 'Level', 'Message', 'Context', 'Details'];
            const rows = logs.map(log => [
                new Date(log.timestamp).toISOString(),
                log.level || 'N/A',
                log.message || 'N/A',
                log.context || log.endpoint || 'N/A',
                JSON.stringify(log).substring(0, 100)
            ]);

            const csv = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            return csv;
        } catch (error) {
            console.error('Error exporting to CSV:', error);
            return null;
        }
    }

    /**
     * Limpiar logs antiguos
     */
    static cleanOldLogs(daysRetention = 30) {
        try {
            const logsPath = path.join(__dirname, '../logs');
            if (!fs.existsSync(logsPath)) {
                return { cleaned: 0 };
            }

            const cutoffDate = Date.now() - (daysRetention * 24 * 60 * 60 * 1000);
            const files = fs.readdirSync(logsPath).filter(f => f.endsWith('.log'));
            let cleaned = 0;

            for (const file of files) {
                const filePath = path.join(logsPath, file);
                const stats = fs.statSync(filePath);

                if (stats.mtimeMs < cutoffDate) {
                    fs.unlinkSync(filePath);
                    cleaned++;
                }
            }

            return { cleaned };
        } catch (error) {
            console.error('Error cleaning logs:', error);
            return { cleaned: 0, error: error.message };
        }
    }
}

module.exports = LogFilter;
