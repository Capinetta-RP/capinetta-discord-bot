/**
 * @file dashboard.js
 * @description Servidor Web Express para Capi Netta (Auth Protegido)
 */
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy } = require('passport-discord-auth');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const https = require('https');
const fs = require('fs');
const RedisStore = require('connect-redis').default;
const Redis = require('ioredis');

const { prisma } = require('../utils/database');
const config = require('../config');
const cache = require('../utils/redisCache');
const metrics = require('../utils/metricsCollector');
const logger = require('../utils/structuredLogger');
const metricsHistory = require('../utils/metricsHistory');
const alertManager = require('../utils/alertManager');
const { setupApiRoutes } = require('./routes/api.route');
const { setupManagementRoutes } = require('./routes/management.route');
const { setupWarnsRoutes } = require('./routes/warns.route');
const { setupConfigRoutes } = require('./routes/config.route');
const { setupViewsRoutes } = require('./routes/views.route');
const setupAuthRoutes = require('./routes/auth.route');
const setupDashboardRoutes = require('./routes/dashboard.route');
const { checkAuth } = require('./middleware/auth');
const { resolveUserProfile } = require('./utils/userFetcher');
const { refreshStaleUserProfiles, cleanupOldLogs } = require('./utils/backgroundJobs');
const cacheManager = require('./utils/cacheManager');

const { configureCSP } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar umbrales de alertas desde config
if (config.monitoring) {
    alertManager.setThresholds({
        errorRate: config.monitoring.errorRateThreshold,
        cacheHitRate: config.monitoring.cacheHitRateThreshold,
        slowQueries: config.monitoring.slowQueriesThreshold,
        memoryUsage: config.monitoring.memoryUsageThreshold,
        discordRateLimited: config.monitoring.discordRateLimitThreshold,
        avgResponseTime: config.monitoring.avgResponseTimeThreshold
    });
}

// Middleware de métricas para requests HTTP
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        metrics.recordRequest(duration, res.statusCode);
        if (req.path !== '/api/metrics' && res.statusCode >= 400) { // Solo loguear errores o cosas raras
            logger.logRequest(req, res, duration);
        }
    });
    next();
});

// Compresión gzip para reducir tamaño de respuestas
app.use(compression());

// Cache headers para archivos estáticos
// Cache headers para archivos estáticos
app.use('/css/style.css', (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=86400'); // 1 día
    next();
});
app.use('/css/style.min.css', (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 año (inmutable)
    next();
});
app.use('/js', (req, res, next) => {
    const maxAge = req.url.includes('.min.') ? 31536000 : 86400;
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    next();
});

// Helpers para usar archivos minificados en producción
app.locals.cssFile = process.env.NODE_ENV === 'production' ? 'css/style.min.css' : 'css/style.css';
app.locals.jsFile = (name) => process.env.NODE_ENV === 'production' ? `${name}.min.js` : `${name}.js`;

// Background job intervals
const USER_PROFILE_REFRESH_INTERVAL_MS = config.cache.userProfileRefreshIntervalMs;
const LOGS_CLEANUP_INTERVAL_MS = config.cache.logsCleanupIntervalMs;


// Confianza en proxy para que secure cookies funcionen detrás de Nginx/Cloudflare
app.set('trust proxy', 1);

// Parsear body JSON and URL-encoded ANTES de las rutas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Seguridad HTTP con CSP (nonce-based)
app.use(configureCSP());

// Headers adicionales para evitar caché de archivos estáticos
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// Rate limiting suave para endpoints públicos
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde.' }
}));

// Rate limiting más estricto para endpoints de API
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // 30 requests por minuto
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Límite de API excedido, espera un momento.' }
});

// Aplicar rate limiting a todas las rutas /api/*
app.use('/api/', apiLimiter);

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('web/public', {
    maxAge: 0,
    etag: false
}));

// =============================================================================
//                             CONFIGURACIÓN PASSPORT
// =============================================================================

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new Strategy({
    // La librería espera los campos en minúsculas exactas
    clientId: config.dashboard.clientId,
    clientSecret: config.dashboard.clientSecret,
    callbackUrl: config.dashboard.callbackUrl,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    // Solo validar que el usuario está en la guild
    // Los permisos reales se validan en checkAuth middleware contra el servidor en vivo
    const targetGuild = profile.guilds.find(g => g.id === config.general.guildId);

    if (!targetGuild) {
        return done(null, false, { message: "No estás en el servidor de Capi Netta." });
    }

    process.nextTick(() => done(null, profile));
}));

// =============================================================================
//                             MIDDLEWARES
// =============================================================================

app.set('view engine', 'ejs');
app.set('views', './web/views');

// Store de sesión en Redis (evita MemoryStore en producción)
let sessionStore;
let redisSessionClient;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisPassword = process.env.REDIS_PASSWORD;

if (redisHost) {
    redisSessionClient = new Redis({
        host: redisHost,
        port: redisPort ? Number(redisPort) : 6379,
        password: redisPassword || undefined,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true
    });

    redisSessionClient.on('error', (err) => {
        console.warn('⚠️  Redis (sessions) error:', err.message);
    });

    sessionStore = new RedisStore({
        client: redisSessionClient,
        prefix: 'sess:'
    });
} else {
    // Fallback a memoria solo si Redis no está configurado
    const session = require('express-session');
    sessionStore = new session.MemoryStore();
    console.warn('⚠️  [ADVERTENCIA] Usando MemoryStore. Configura REDIS_HOST en .env para producción.');
}

app.use(session({
    name: 'capi-dashboard.sid',
    secret: config.dashboard.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 12 // 12h de sesión
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// =============================================================================
//                        API ENDPOINTS - MÉTRICAS
// =============================================================================

// Setup all API routes from external module
setupApiRoutes(app, checkAuth);
setupManagementRoutes(app, checkAuth);
setupWarnsRoutes(app, checkAuth);
setupConfigRoutes(app, checkAuth);
setupViewsRoutes(app, checkAuth, resolveUserProfile, cacheManager.getGlobalStatsCache, cacheManager.setGlobalStatsCache);

// Setup auth and dashboard routes
// Setup auth and dashboard routes
setupAuthRoutes(app);
setupDashboardRoutes(app, checkAuth);

// =============================================================================
//                        GLOBAL ERROR HANDLERS
// =============================================================================

// 404 Handler
app.use((req, res, next) => {
    res.status(404).render('error', {
        title: 'Página no encontrada',
        message: 'La ruta que intentas buscar no existe o ha sido movida.',
        icon: 'fas fa-ghost',
        code: '404',
        redirectUrl: '/dashboard',
        redirectText: 'Volver al Dashboard'
    });
});

// 500 Handler (and other errors)
app.use((err, req, res, next) => {
    if (cache.isUsingRedis() === false && err.message?.includes('Redis')) {
        // Ignorar errores de Redis si estamos en modo memoria? No, better warn user.
    }

    // Log error using generic console or specific logger if available globally (it is imported as logger)
    logger.logError(err, { context: 'global-handler', url: req.url });

    res.status(500).render('error', {
        title: 'Error del Servidor',
        message: 'Algo salió mal en nuestro lado. Hemos registrado el error.',
        icon: 'fas fa-bug',
        code: '500',
        redirectUrl: '/dashboard',
        redirectText: 'Volver al Dashboard'
    });
});


// Función para iniciar el servidor
function startDashboard(discordClient) {
    // Guardamos el cliente en locals para acceder en rutas
    app.locals.discordClient = discordClient;

    // Refresco periódico de perfiles en DB
    setInterval(() => {
        refreshStaleUserProfiles(app.locals.discordClient);
    }, USER_PROFILE_REFRESH_INTERVAL_MS);

    // Limpieza periódica de logs antiguos
    setInterval(() => {
        cleanupOldLogs();
    }, LOGS_CLEANUP_INTERVAL_MS);

    // Recolección continua de métricas (histórico)
    setInterval(() => {
        try {
            const current = metrics.getMetrics();
            metricsHistory.recordSample(current);
        } catch (error) {
            console.error('Error collecting background metrics:', error);
        }
    }, 30000); // 30 segundos

    // Arranque inicial (no bloqueante)
    refreshStaleUserProfiles(app.locals.discordClient);
    cleanupOldLogs();

    const httpsEnabled = process.env.HTTPS_ENABLED === 'true';

    if (httpsEnabled) {
        try {
            const keyPath = process.env.SSL_KEY_PATH || './certs/key.pem';
            const certPath = process.env.SSL_CERT_PATH || './certs/cert.pem';

            if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
                console.error('❌ Certificados SSL no encontrados');
                console.error('   Ejecuta: node generate-ssl-certs.js');
                process.exit(1);
            }

            const httpsOptions = {
                key: fs.readFileSync(keyPath),
                cert: fs.readFileSync(certPath)
            };

            https.createServer(httpsOptions, app).listen(PORT, () => {
                console.log(`🔒 Dashboard HTTPS en https://localhost:${PORT}`);
                console.log(`🗄️  Caché: ${cache.isUsingRedis() ? 'Redis ✅' : 'Memoria ⚠️'}`);
            });
        } catch (error) {
            console.error('❌ Error al iniciar HTTPS:', error.message);
            process.exit(1);
        }
    } else {
        app.listen(PORT, () => {
            console.log(`🌐 Dashboard online en http://localhost:${PORT}`);
            console.log(`🗄️  Caché: ${cache.isUsingRedis() ? 'Redis ✅' : 'Memoria ⚠️'}`);
        });
    }

    // Enviar alertas automáticamente cada 5 minutos
    if (config.discordWebhooks?.alerts) {
        setInterval(async () => {
            try {
                const alerts = alertManager.getAlertsToSend();
                if (alerts.length > 0) {
                    for (const alert of alerts) {
                        const embed = alertManager.generateEmbed(alert);
                        await fetch(config.discordWebhooks.alerts, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ embeds: [embed] })
                        });
                    }
                }
            } catch (error) {
                logger.logError(error, { context: 'auto-alerts' });
            }
        }, 300000); // 5 minutos
    }

    // Cleanup al cerrar
    process.on('SIGINT', async () => {
        console.log('\n🛑 Cerrando servidor...');
        await cache.disconnect();
        if (redisSessionClient) {
            await redisSessionClient.quit();
        }
        process.exit(0);
    });
}

module.exports = startDashboard;
