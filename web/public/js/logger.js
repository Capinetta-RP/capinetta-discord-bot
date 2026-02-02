/**
 * Logger para el frontend
 */

class FrontendLogger {
    constructor() {
        this.levels = {
            DEBUG: { color: '#7c3aed', emoji: '🔍' },
            INFO: { color: '#0891b2', emoji: 'ℹ️' },
            SUCCESS: { color: '#10b981', emoji: '✅' },
            WARN: { color: '#d97706', emoji: '⚠️' },
            ERROR: { color: '#dc2626', emoji: '❌' }
        };
    }

    /**
     * Log formateado en consola
     */
    log(level, message, data = null) {
        const config = this.levels[level] || this.levels.INFO;
        const style = `color: ${config.color}; font-weight: bold;`;

        console.log(`%c${config.emoji} ${message}`, style, data || '');
    }

    debug(message, data) { this.log('DEBUG', message, data); }
    info(message, data) { this.log('INFO', message, data); }
    success(message, data) { this.log('SUCCESS', message, data); }
    warn(message, data) { this.log('WARN', message, data); }
    error(message, data) { this.log('ERROR', message, data); }
}

window.logger = new FrontendLogger();
