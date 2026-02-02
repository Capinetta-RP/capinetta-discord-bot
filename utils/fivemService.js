const DEFAULT_TIMEOUT = 5000;
const CACHE_TTL = 15000; // 15s

let cache = {
    timestamp: 0,
    data: null
};

function normalizeBaseUrl(baseUrl) {
    if (!baseUrl) return null;
    return baseUrl.replace(/\/+$/, '');
}

async function fetchJson(url, timeout = DEFAULT_TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

async function getStatus(baseUrl) {
    const now = Date.now();
    if (cache.data && (now - cache.timestamp) < CACHE_TTL) {
        return cache.data;
    }

    const normalized = normalizeBaseUrl(baseUrl);
    if (!normalized) {
        return {
            online: false,
            error: 'FIVEM_BASE_URL no configurado'
        };
    }

    try {
        const [info, players] = await Promise.all([
            fetchJson(`${normalized}/info.json`),
            fetchJson(`${normalized}/players.json`)
        ]);

        const vars = info?.vars || {};
        const maxPlayers =
            parseInt(vars.sv_maxClients || vars.sv_maxclients || info?.sv_maxClients || info?.sv_maxclients || 0);

        const data = {
            online: true,
            endpoint: normalized,
            hostname: info?.hostname || vars.sv_hostname || 'FiveM Server',
            players: Array.isArray(players) ? players.length : 0,
            maxPlayers: Number.isFinite(maxPlayers) ? maxPlayers : 0,
            resources: info?.resources || [],
            gametype: vars.gametype || info?.gametype || null,
            mapname: vars.mapname || info?.mapname || null,
            lastUpdate: now
        };

        cache = { timestamp: now, data };
        return data;
    } catch (error) {
        const data = {
            online: false,
            endpoint: normalized,
            error: error.message,
            lastUpdate: now
        };
        cache = { timestamp: now, data };
        return data;
    }
}

async function getPlayers(baseUrl) {
    const normalized = normalizeBaseUrl(baseUrl);
    if (!normalized) {
        return { online: false, players: [], error: 'FIVEM_BASE_URL no configurado' };
    }

    try {
        const players = await fetchJson(`${normalized}/players.json`);
        return {
            online: true,
            players: Array.isArray(players) ? players : []
        };
    } catch (error) {
        return { online: false, players: [], error: error.message };
    }
}

module.exports = {
    getStatus,
    getPlayers
};
