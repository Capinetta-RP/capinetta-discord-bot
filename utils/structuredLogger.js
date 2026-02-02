/**
 * @file structuredLogger.js
 * @description Sistema de logs estructurados con niveles y contexto
 */

const fs = require('fs');
const path = require('path');

class StructuredLogger {
    constructor() {
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };

        this.currentLevel = process.env.LOG_LEVEL 
            ? this.levels[process.env.LOG_LEVEL.toUpperCase()] 
            : this.levels.INFO;

        this.colors = {
            ERROR: '\x1b[31m', // Rojo
            WARN: '\x1b[33m',  // Amarillo
            INFO: '\x1b[36m',  // Cyan
            DEBUG: '\x1b[90m', // Gris
            RESET: '\x1b[0m'
        };

        // Crear directorio de logs si no existe
        this.logsDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }

        this.logFile = path.join(this.logsDir, `app-${this.getDateString()}.log`);
    }

    getDateString() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    getTimestamp() {
        return new Date().toISOString();
    }

    formatMessage(level, message, context = {}) {
        const logEntry = {
            timestamp: this.getTimestamp(),
            level,
            message,
            ...context
        };

        // Console output con colores
        const color = this.colors[level] || '';
        const reset = this.colors.RESET;
        const contextStr = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
        console.log(`${color}[${logEntry.timestamp}] ${level}:${reset} ${message}${contextStr}`);

        // Archivo output (JSON)
        fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
    }

    error(message, context = {}) {
        if (this.currentLevel >= this.levels.ERROR) {
            this.formatMessage('ERROR', message, context);
        }
    }

    warn(message, context = {}) {
        if (this.currentLevel >= this.levels.WARN) {
            this.formatMessage('WARN', message, context);
        }
    }

    info(message, context = {}) {
        if (this.currentLevel >= this.levels.INFO) {
            this.formatMessage('INFO', message, context);
        }
    }

    debug(message, context = {}) {
        if (this.currentLevel >= this.levels.DEBUG) {
            this.formatMessage('DEBUG', message, context);
        }
    }

    // Helpers para casos específicos
    logRequest(req, res, duration) {
        this.info('HTTP Request', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress
        });
    }

    logError(error, context = {}) {
        this.error(error.message, {
            stack: error.stack,
            ...context
        });
    }

    logDiscordAPI(endpoint, success, ratelimited = false) {
        const level = success ? 'INFO' : 'WARN';
        this[level.toLowerCase()]('Discord API Call', {
            endpoint,
            success,
            ratelimited
        });
    }

    logDatabaseQuery(query, duration, rows = 0) {
        const isSlow = duration > 1000; // >1s = slow
        const level = isSlow ? 'WARN' : 'DEBUG';
        this[level.toLowerCase()]('Database Query', {
            query: query.substring(0, 100), // Primeros 100 chars
            duration: `${duration}ms`,
            rows,
            slow: isSlow
        });
    }

    logCacheOperation(operation, key, hit = null) {
        this.debug('Cache Operation', {
            operation, // get, set, delete
            key,
            hit: hit !== null ? hit : undefined
        });
    }

    // Cleanup de logs antiguos (>30 días)
    cleanupOldLogs() {
        const files = fs.readdirSync(this.logsDir);
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

        files.forEach(file => {
            const filePath = path.join(this.logsDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtimeMs < thirtyDaysAgo) {
                fs.unlinkSync(filePath);
                this.info('Old log deleted', { file });
            }
        });
    }
}

// Singleton
const logger = new StructuredLogger();

module.exports = logger;
