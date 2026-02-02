/**
 * @file redisCache.js
 * @description Sistema de caché con Redis con fallback a memoria
 */
const Redis = require('ioredis');

class CacheManager {
    constructor() {
        this.redisClient = null;
        this.memoryCache = new Map();
        this.useRedis = false;
        this.initRedis();
    }

    initRedis() {
        try {
            const redisConfig = {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                retryStrategy: (times) => {
                    if (times > 3) {
                        console.warn('⚠️  Redis no disponible, usando caché en memoria');
                        this.useRedis = false;
                        return null;
                    }
                    return Math.min(times * 100, 3000);
                },
                enableReadyCheck: true,
                maxRetriesPerRequest: 3,
                lazyConnect: true
            };

            this.redisClient = new Redis(redisConfig);

            this.redisClient.on('connect', () => {
                console.log('✅ Redis conectado');
                this.useRedis = true;
            });

            this.redisClient.on('error', (err) => {
                console.warn('⚠️  Redis error:', err.message);
                this.useRedis = false;
            });

            this.redisClient.on('close', () => {
                console.warn('⚠️  Redis desconectado, usando caché en memoria');
                this.useRedis = false;
            });

            // Intentar conectar
            this.redisClient.connect().catch(() => {
                console.warn('⚠️  No se pudo conectar a Redis, usando caché en memoria');
                this.useRedis = false;
            });

        } catch (error) {
            console.warn('⚠️  Error al inicializar Redis:', error.message);
            this.useRedis = false;
        }
    }

    async set(key, value, ttlSeconds = null) {
        try {
            if (this.useRedis && this.redisClient) {
                const serialized = JSON.stringify(value);
                if (ttlSeconds) {
                    await this.redisClient.setex(key, ttlSeconds, serialized);
                } else {
                    await this.redisClient.set(key, serialized);
                }
            } else {
                // Fallback a memoria
                const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
                this.memoryCache.set(key, { value, expiry });
                
                // Limitar tamaño del caché en memoria
                if (this.memoryCache.size > 1000) {
                    const firstKey = this.memoryCache.keys().next().value;
                    this.memoryCache.delete(firstKey);
                }
            }
        } catch (error) {
            console.error('Cache set error:', error.message);
            // Fallback silencioso a memoria
            const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
            this.memoryCache.set(key, { value, expiry });
        }
    }

    async get(key) {
        try {
            if (this.useRedis && this.redisClient) {
                const data = await this.redisClient.get(key);
                return data ? JSON.parse(data) : null;
            } else {
                // Fallback a memoria
                const cached = this.memoryCache.get(key);
                if (!cached) return null;
                
                if (cached.expiry && cached.expiry < Date.now()) {
                    this.memoryCache.delete(key);
                    return null;
                }
                
                return cached.value;
            }
        } catch (error) {
            console.error('Cache get error:', error.message);
            return null;
        }
    }

    async delete(key) {
        try {
            if (this.useRedis && this.redisClient) {
                await this.redisClient.del(key);
            } else {
                this.memoryCache.delete(key);
            }
        } catch (error) {
            console.error('Cache delete error:', error.message);
        }
    }

    async has(key) {
        try {
            if (this.useRedis && this.redisClient) {
                const exists = await this.redisClient.exists(key);
                return exists === 1;
            } else {
                const cached = this.memoryCache.get(key);
                if (!cached) return false;
                
                if (cached.expiry && cached.expiry < Date.now()) {
                    this.memoryCache.delete(key);
                    return false;
                }
                
                return true;
            }
        } catch (error) {
            console.error('Cache has error:', error.message);
            return false;
        }
    }

    async keys(pattern = '*') {
        try {
            if (this.useRedis && this.redisClient) {
                return await this.redisClient.keys(pattern);
            } else {
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                return Array.from(this.memoryCache.keys()).filter(k => regex.test(k));
            }
        } catch (error) {
            console.error('Cache keys error:', error.message);
            return [];
        }
    }

    async clear() {
        try {
            if (this.useRedis && this.redisClient) {
                await this.redisClient.flushdb();
            } else {
                this.memoryCache.clear();
            }
        } catch (error) {
            console.error('Cache clear error:', error.message);
        }
    }

    async disconnect() {
        if (this.redisClient) {
            await this.redisClient.quit();
        }
    }

    isUsingRedis() {
        return this.useRedis;
    }
}

// Singleton
const cacheManager = new CacheManager();

module.exports = cacheManager;
