require('dotenv').config();

const requiredVars = [
    'GENERAL_TOKEN',
    'GENERAL_GUILD_ID',
    'DATABASE_URL',
    'WHITELIST_TOKEN',
    'GENERAL_CLIENT_ID',
    'GENERAL_CLIENT_SECRET',
    'DASHBOARD_CALLBACK_URL',
    'SESSION_SECRET'
    // Agrega aquí todas las críticas
];

// 2. Buscamos cuáles faltan
const missingVars = requiredVars.filter(key => !process.env[key]);

// 3. Si falta alguna, detenemos el bot INMEDIATAMENTE con un error claro
if (missingVars.length > 0) {
    console.error(`\n❌ ERROR FATAL: Faltan variables en el archivo .env:`);
    console.error(missingVars.join(', '));
    console.error('El bot no puede iniciar sin ellas.\n');
    process.exit(1); // Cierra el proceso
}

module.exports = {
    general: {
        token: process.env.GENERAL_TOKEN,
        guildId: process.env.GENERAL_GUILD_ID,
        verifyChannel: process.env.GENERAL_VERIFY_CHANNEL || null,
        welcomeChannel: process.env.GENERAL_WELCOME_CHANNEL,
        logsChannel: process.env.GENERAL_LOGS_CHANNEL,
        roleNoVerify: process.env.GENERAL_ROLE_NO_VERIFY,
        roleUser: process.env.GENERAL_ROLE_USER,
        roleMuted: process.env.GENERAL_ROLE_MUTED,
        supportScamChannel: process.env.GENERAL_SUPPORT_SCAM_CHANNEL,
        minAccountDays: 7,
        minVerifyMinutes: 1,
        spamLimit: 5,
        spamInterval: 5000,
        warnTimeoutMinutes: 10
    },
    database: {
        url: process.env.DATABASE_URL
    },
    whitelist: {
        token: process.env.WHITELIST_TOKEN,
        clientId: process.env.WHITELIST_CLIENT_ID,
        guildId: process.env.WHITELIST_GUILD_ID,
        staffRoleId: process.env.WHITELIST_STAFF_ROLE_ID,
        channelId: process.env.WHITELIST_CHANNEL_ID,
        normativa: "https://bit.ly/4qti5GP"
    },
    dashboard: {
        clientId: process.env.GENERAL_CLIENT_ID,
        clientSecret: process.env.GENERAL_CLIENT_SECRET,
        callbackUrl: process.env.DASHBOARD_CALLBACK_URL,
        sessionSecret: process.env.SESSION_SECRET
    },
    discordWebhooks: {
        alerts: process.env.ALERTS_WEBHOOK_URL || null
    },
    monitoring: {
        errorRateThreshold: parseInt(process.env.ALERT_ERROR_RATE) || 5,
        cacheHitRateThreshold: parseInt(process.env.ALERT_CACHE_HIT_RATE) || 60,
        slowQueriesThreshold: parseInt(process.env.ALERT_SLOW_QUERIES) || 10,
        memoryUsageThreshold: parseInt(process.env.ALERT_MEMORY_USAGE) || 85,
        discordRateLimitThreshold: parseInt(process.env.ALERT_DISCORD_RATE_LIMIT) || 5,
        avgResponseTimeThreshold: parseInt(process.env.ALERT_RESPONSE_TIME) || 1000
    },
    fivem: {
        baseUrl: process.env.FIVEM_BASE_URL || null
    },
    cache: {
        userProfileTTLMs: parseInt(process.env.CACHE_USER_PROFILE_TTL) || 10 * 60 * 1000, // 10 minutos
        userProfileRefreshIntervalMs: parseInt(process.env.CACHE_USER_PROFILE_REFRESH) || 15 * 60 * 1000, // 15 minutos
        userProfileRefreshBatch: parseInt(process.env.CACHE_USER_PROFILE_BATCH) || 50,
        userProfileMaxSize: parseInt(process.env.CACHE_USER_PROFILE_MAX_SIZE) || 1000,
        statsTTLMs: parseInt(process.env.CACHE_STATS_TTL) || 5 * 60 * 1000, // 5 minutos
        discordMetricsTTLMs: parseInt(process.env.CACHE_DISCORD_METRICS_TTL) || 45 * 1000, // 45 segundos
        logsCleanupIntervalMs: parseInt(process.env.LOGS_CLEANUP_INTERVAL) || 24 * 60 * 60 * 1000 // 1 día
    },
    tickets: {
        inactivityWarningMs: parseInt(process.env.TICKET_INACTIVITY_WARNING) || 30 * 60 * 1000, // 30 minutos
        inactivityRetryMs: parseInt(process.env.TICKET_INACTIVITY_RETRY) || 60 * 60 * 1000, // 60 minutos
        closeConfirmTimeoutMs: parseInt(process.env.TICKET_CLOSE_TIMEOUT) || 5000 // 5 segundos
    },
    api: {
        memberFetchCooldownMs: parseInt(process.env.API_MEMBER_FETCH_COOLDOWN) || 30 * 1000, // 30 segundos
        defaultUserAvatar: 'https://cdn.discordapp.com/embed/avatars/0.png'
    },
    logs: {
        retentionDays: parseInt(process.env.LOGS_RETENTION_DAYS) || 30 // días
    }
};