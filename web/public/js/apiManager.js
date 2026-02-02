/**
 * Gestor de llamadas API y caché de datos
 */

class APIManager {
    constructor(cacheTime = 60000) { // 60 segundos por defecto
        this.cache = new Map();
        this.cacheTime = cacheTime;
    }

    /**
     * Obtener datos con caché
     */
    async fetch(endpoint, options = {}) {
        const cacheKey = endpoint;
        const now = Date.now();

        // Verificar caché
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (now - cached.timestamp < this.cacheTime) {
                logger.debug(`📦 Cache hit: ${endpoint}`);
                return cached.data;
            }
        }

        try {
            logger.info(`🌐 Fetching: ${endpoint}`);
            const response = await fetch(endpoint, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Guardar en caché
            this.cache.set(cacheKey, {
                data,
                timestamp: now
            });

            logger.success(`📥 Received data from ${endpoint}`);
            return data;
        } catch (error) {
            logger.error(`Error fetching ${endpoint}`, error.message);
            throw error;
        }
    }

    /**
     * POST request
     */
    async post(endpoint, body = {}) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            logger.error(`Error posting to ${endpoint}`, error.message);
            throw error;
        }
    }

    /**
     * Limpiar caché
     */
    clearCache(endpoint = null) {
        if (endpoint) {
            this.cache.delete(endpoint);
        } else {
            this.cache.clear();
        }
    }
}

const apiManager = new APIManager();
