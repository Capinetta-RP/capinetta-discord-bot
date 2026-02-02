/**
 * @file cacheManager.js
 * @description Cache management for various data types
 */

const config = require('../../config');

// Cache TTLs from config
const STATS_CACHE_TTL_MS = config.cache?.statsTTLMs || 60000;
const DISCORD_METRICS_CACHE_TTL_MS = config.cache?.discordMetricsTTLMs || 30000;
const MEMBER_FETCH_COOLDOWN_MS = 30000;

// Global stats cache
let globalStatsCache = null;
let globalStatsCacheExpiry = 0;

// Discord metrics cache
const discordMetricsCache = new Map();

// Member fetch rate limiting
const memberFetchCooldowns = new Map();

/**
 * Get global stats from cache
 */
function getGlobalStatsCache(guildIds) {
    const key = guildIds.sort().join(',');
    if (!globalStatsCache || globalStatsCacheExpiry <= Date.now() || globalStatsCache.key !== key) {
        return null;
    }
    return globalStatsCache.data;
}

/**
 * Set global stats cache
 */
function setGlobalStatsCache(guildIds, data) {
    const key = guildIds.sort().join(',');
    globalStatsCache = { key, data };
    globalStatsCacheExpiry = Date.now() + STATS_CACHE_TTL_MS;
}

/**
 * Get Discord metrics from cache
 */
function getDiscordMetricsCache(guildId) {
    const cached = discordMetricsCache.get(guildId);
    if (!cached || cached.expiresAt <= Date.now()) {
        return null;
    }
    return cached.data;
}

/**
 * Set Discord metrics cache
 */
function setDiscordMetricsCache(guildId, data) {
    discordMetricsCache.set(guildId, {
        data,
        expiresAt: Date.now() + DISCORD_METRICS_CACHE_TTL_MS
    });
}

/**
 * Check if we can fetch members for a guild (rate limiting)
 */
function canFetchMembers(guildId) {
    const lastFetch = memberFetchCooldowns.get(guildId);
    if (!lastFetch) return true;
    return Date.now() - lastFetch > MEMBER_FETCH_COOLDOWN_MS;
}

/**
 * Mark that we fetched members for a guild
 */
function markMemberFetch(guildId) {
    memberFetchCooldowns.set(guildId, Date.now());
}

/**
 * Clear all caches
 */
function clearAllCaches() {
    globalStatsCache = null;
    globalStatsCacheExpiry = 0;
    discordMetricsCache.clear();
    memberFetchCooldowns.clear();
}

module.exports = {
    getGlobalStatsCache,
    setGlobalStatsCache,
    getDiscordMetricsCache,
    setDiscordMetricsCache,
    canFetchMembers,
    markMemberFetch,
    clearAllCaches
};
