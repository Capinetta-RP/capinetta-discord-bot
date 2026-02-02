/**
 * @file api.route.js
 * @description API routes for Capi Netta Dashboard
 */

const { prisma } = require('../../utils/database');
const config = require('../../config');
const cache = require('../../utils/redisCache');
const metrics = require('../../utils/metricsCollector');
const logger = require('../../utils/structuredLogger');
const metricsHistory = require('../../utils/metricsHistory');
const alertManager = require('../../utils/alertManager');
const logFilter = require('../../utils/logFilter');
const guildStats = require('../../utils/guildStats');
const fivemService = require('../../utils/fivemService');

/**
 * Setup all API routes
 * @param {Express} app - Express application
 * @param {Function} checkAuth - Authentication middleware
 */
function setupApiRoutes(app, checkAuth) {
    app.get('/api/metrics', checkAuth, async (req, res) => {
        try {
            // Actualizar métricas de Redis si está disponible
            if (cache.isUsingRedis()) {
                try {
                    const keys = await cache.keys('*');
                    metrics.updateRedisKeys(keys.length);
                    metrics.setRedisStatus(true);
                } catch (error) {
                    metrics.setRedisStatus(false);
                }
            } else {
                metrics.setRedisStatus(false);
            }

            // Actualizar stats de Discord
            const discordClient = app.locals.discordClient;
            if (discordClient) {
                const guilds = discordClient.guilds.cache.size;
                const uniqueUsers = new Set();

                for (const guild of discordClient.guilds.cache.values()) {
                    for (const member of guild.members.cache.values()) {
                        if (!member.user?.bot) {
                            uniqueUsers.add(member.id);
                        }
                    }
                }

                const fallbackTotal = discordClient.guilds.cache.reduce(
                    (acc, guild) => acc + (guild.memberCount || 0),
                    0
                );
                const users = uniqueUsers.size > 0 ? uniqueUsers.size : fallbackTotal;
                metrics.updateDiscordStats(guilds, users);
            }

            const currentMetrics = metrics.getMetrics();

            // Registrar muestra en histórico
            metricsHistory.recordSample(currentMetrics);

            // Verificar alertas
            const alerts = alertManager.checkMetrics(currentMetrics);

            res.json({
                ...currentMetrics,
                alerts: alerts.filter(a => a.severity === 'HIGH') // Solo alertas altas en respuesta
            });
        } catch (error) {
            logger.logError(error, { endpoint: '/api/metrics' });
            res.status(500).json({ error: 'Error al obtener métricas' });
        }
    });

    // Endpoint de logs recientes
    app.get('/api/logs', checkAuth, async (req, res) => {
        try {
            const logsPath = require('path').join(__dirname, '../../logs');
            const fs = require('fs');

            if (!fs.existsSync(logsPath)) {
                return res.json({ logs: [] });
            }

            const files = fs.readdirSync(logsPath).filter(f => f.endsWith('.log'));
            if (files.length === 0) {
                return res.json({ logs: [] });
            }

            // Leer último archivo de log
            const latestFile = files.sort().reverse()[0];
            const content = fs.readFileSync(require('path').join(logsPath, latestFile), 'utf8');
            const lines = content.trim().split('\n').slice(-100); // Últimas 100 líneas

            const logs = lines
                .filter(line => line.trim())
                .map(line => {
                    try {
                        const parsed = JSON.parse(line);
                        // Filtrar logs de "HTTP Request" basura que saturan la vista
                        if (parsed.message === 'HTTP Request') return null;
                        return parsed;
                    } catch {
                        return null;
                    }
                })
                .filter(log => log !== null)
                .reverse(); // Más recientes primero

            res.json({ logs });
        } catch (error) {
            logger.logError(error, { endpoint: '/api/logs' });
            res.status(500).json({ error: 'Error al obtener logs' });
        }
    });

    // Endpoint de histórico de métricas
    app.get('/api/metrics/history', checkAuth, (req, res) => {
        try {
            const hours = parseInt(req.query.hours) || 24;
            let history = metricsHistory.getLastHours(hours);

            // Si no hay datos históricos, devolvemos array vacío
            if (history.length === 0) {
                // No hacemos nada, que se muestre vacío
            }

            res.json({ history });
        } catch (error) {
            logger.logError(error, { endpoint: '/api/metrics/history' });
            res.status(500).json({ error: 'Error al obtener histórico' });
        }
    });


    // Endpoint de estado FiveM
    app.get('/api/fivem/status', checkAuth, async (req, res) => {
        try {
            const status = await fivemService.getStatus(config.fivem?.baseUrl);
            res.json({ status });
        } catch (error) {
            logger.logError(error, { endpoint: '/api/fivem/status' });
            res.status(500).json({ error: 'Error al obtener estado de FiveM' });
        }
    });

    // Endpoint de jugadores FiveM
    app.get('/api/fivem/players', checkAuth, async (req, res) => {
        try {
            const players = await fivemService.getPlayers(config.fivem?.baseUrl);
            res.json(players);
        } catch (error) {
            logger.logError(error, { endpoint: '/api/fivem/players' });
            res.status(500).json({ error: 'Error al obtener jugadores de FiveM' });
        }
    });

    // Endpoint de alertas activas
    app.get('/api/alerts', checkAuth, (req, res) => {
        try {
            const alerts = alertManager.getActiveAlerts();
            res.json({ alerts });
        } catch (error) {
            logger.logError(error, { endpoint: '/api/alerts' });
            res.status(500).json({ error: 'Error al obtener alertas' });
        }
    });

    // Endpoint para enviar alertas a Discord (webhook)
    app.post('/api/alerts/send', checkAuth, async (req, res) => {
        try {
            if (!config.discordWebhooks?.alerts) {
                return res.status(400).json({ error: 'Webhook de alertas no configurado' });
            }

            const alerts = alertManager.getAlertsToSend();
            if (alerts.length === 0) {
                return res.json({ sent: 0, message: 'No hay alertas en cooldown' });
            }

            const webhookUrl = config.discordWebhooks.alerts;
            let sent = 0;

            for (const alert of alerts) {
                const embed = alertManager.generateEmbed(alert);
                try {
                    await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ embeds: [embed] })
                    });
                    sent++;
                } catch (error) {
                    logger.logError(error, { alert: alert.type });
                }
            }

            res.json({ sent, total: alerts.length });
        } catch (error) {
            logger.logError(error, { endpoint: '/api/alerts/send' });
            res.status(500).json({ error: 'Error al enviar alertas' });
        }
    });

    // Endpoint de logs filtrados con búsqueda
    app.get('/api/logs/search', checkAuth, (req, res) => {
        try {
            const { level, search, startDate, endDate, guildId, page = 1, limit = 50 } = req.query;
            const offset = (page - 1) * limit;

            const result = logFilter.readLogs({
                level: level || null,
                search: search || null,
                startDate: startDate || null,
                endDate: endDate || null,
                guildId: guildId || null,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            res.json(result);
        } catch (error) {
            logger.logError(error, { endpoint: '/api/logs/search' });
            res.status(500).json({ error: 'Error al buscar logs' });
        }
    });

    // Endpoint de estadísticas de logs
    app.get('/api/logs/statistics', checkAuth, (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            const result = logFilter.getStatistics({
                startDate: startDate || null,
                endDate: endDate || null
            });

            res.json(result);
        } catch (error) {
            logger.logError(error, { endpoint: '/api/logs/statistics' });
            res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
    });

    // Endpoint de exportación de logs a CSV
    app.get('/api/logs/export', checkAuth, (req, res) => {
        try {
            const { level, search, startDate, endDate } = req.query;
            const csv = logFilter.exportToCSV({
                level: level || null,
                search: search || null,
                startDate: startDate || null,
                endDate: endDate || null,
                limit: 10000
            });

            if (!csv) {
                return res.status(404).json({ error: 'No hay logs para exportar' });
            }

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="logs_${Date.now()}.csv"`);
            res.send(csv);
        } catch (error) {
            logger.logError(error, { endpoint: '/api/logs/export' });
            res.status(500).json({ error: 'Error al exportar logs' });
        }
    });

    // Endpoint de estadísticas por servidor
    app.get('/api/guild/:guildId/stats', checkAuth, async (req, res) => {
        try {
            const { guildId } = req.params;

            // Verificar que el usuario tiene acceso a este servidor
            if (!req.adminGuilds.some(g => g.id === guildId)) {
                return res.status(403).json({ error: 'No tienes acceso a este servidor' });
            }

            const stats = await guildStats.getGuildStats(guildId);
            if (!stats) {
                return res.status(404).json({ error: 'No se encontraron estadísticas' });
            }

            res.json({ stats });
        } catch (error) {
            logger.logError(error, { endpoint: '/api/guild/:guildId/stats' });
            res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
    });

    // Endpoint de usuarios con más warnings
    app.get('/api/guild/:guildId/top-warned', checkAuth, async (req, res) => {
        try {
            const { guildId } = req.params;
            const { limit = 10 } = req.query;

            if (!req.adminGuilds.some(g => g.id === guildId)) {
                return res.status(403).json({ error: 'No tienes acceso a este servidor' });
            }

            const topWarned = await guildStats.getTopWarned(guildId, parseInt(limit));
            res.json({ topWarned });
        } catch (error) {
            logger.logError(error, { endpoint: '/api/guild/:guildId/top-warned' });
            res.status(500).json({ error: 'Error al obtener top warned' });
        }
    });

    // Endpoint de tendencia de warnings
    app.get('/api/guild/:guildId/warns-trend', checkAuth, async (req, res) => {
        try {
            const { guildId } = req.params;
            const { days = 30 } = req.query;

            if (!req.adminGuilds.some(g => g.id === guildId)) {
                return res.status(403).json({ error: 'No tienes acceso a este servidor' });
            }

            // 1. Obtener IDs de usuarios que tienen warns en este servidor
            const guildWarns = await prisma.warn.findMany({
                where: { guildId },
                select: { userId: true }
            });
            const userIds = guildWarns.map(w => w.userId);

            // 2. Obtener logs de warns de esos usuarios en los últimos X días
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));

            // Solo buscar si hay usuarios
            let logs = [];
            if (userIds.length > 0) {
                logs = await prisma.warnLog.findMany({
                    where: {
                        userId: { in: userIds },
                        timestamp: { gte: startDate }
                    },
                    select: { timestamp: true }
                });
            }

            // 3. Agrupar por fecha
            const trendMap = new Map();
            const now = new Date();

            // Inicializar mapa con 0 para todos los días
            for (let i = parseInt(days) - 1; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = d.toLocaleDateString('es-AR', { month: 'short', day: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
                trendMap.set(key, 0);
            }

            // Llenar con datos reales
            logs.forEach(log => {
                const key = new Date(log.timestamp).toLocaleDateString('es-AR', { month: 'short', day: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
                if (trendMap.has(key)) {
                    trendMap.set(key, trendMap.get(key) + 1);
                }
            });

            const trend = Array.from(trendMap).map(([date, count]) => ({ date, count }));
            res.json({ trend });
        } catch (error) {
            logger.logError(error, { endpoint: '/api/guild/:guildId/warns-trend' });
            res.status(500).json({ error: 'Error al obtener tendencia' });
        }
    });

    // Endpoint de tickets por estado
    app.get('/api/guild/:guildId/tickets-status', checkAuth, async (req, res) => {
        try {
            const { guildId } = req.params;

            if (!req.adminGuilds.some(g => g.id === guildId)) {
                return res.status(403).json({ error: 'No tienes acceso a este servidor' });
            }

            const ticketStats = await prisma.ticket.groupBy({
                by: ['status'],
                where: { guildId },
                _count: { ticketId: true }
            });

            const status = {
                open: 0,
                closed: 0,
                pending: 0
            };

            ticketStats.forEach(t => {
                if (t.status === 'open') status.open += t._count.ticketId;
                else if (t.status === 'closed') status.closed += t._count.ticketId;
                else status.pending += t._count.ticketId; // 'claimed', etc.
            });

            res.json({ status });
        } catch (error) {
            logger.logError(error, { endpoint: '/api/guild/:guildId/tickets-status' });
            res.status(500).json({ error: 'Error al obtener tickets' });
        }
    });

    // Endpoint de comparación entre servidores
    app.get('/api/guilds/comparison', checkAuth, async (req, res) => {
        try {
            const guildIds = req.adminGuilds.map(g => g.id);
            const comparison = await guildStats.getComparison(guildIds);

            if (!comparison) {
                return res.status(404).json({ error: 'No hay datos para comparar' });
            }

            // Transformar datos para los gráficos del frontend
            const labels = [];
            const members = [];
            const tickets = [];
            const warns = [];

            const discordClient = req.app.locals.discordClient;

            comparison.comparison.forEach(item => {
                const guild = req.adminGuilds.find(g => g.id === item.guildId);
                labels.push(guild ? guild.name : item.guildId);

                // Intentar obtener usuarios online reales desde el cliente de Discord
                let onlineCount = item.activeUsers.value; // Fallback a base de datos
                if (discordClient) {
                    const discordGuild = discordClient.guilds.cache.get(item.guildId);
                    if (discordGuild) {
                        // Contar usuarios REALMENTE conectados (no offline)
                        // Requiere GatewayIntentBits.GuildPresences (ya verificado en index-general.js)
                        const online = discordGuild.members.cache.filter(m =>
                            !m.user.bot &&
                            m.presence &&
                            m.presence.status !== 'offline'
                        ).size;

                        // Si la cache está vacía (posiblemente al iniciar), usamos memberCount como fallback temporal
                        // pero preferimos el contador de presencia real.
                        onlineCount = online;
                    }
                }

                members.push(onlineCount);
                tickets.push(item.openTickets.value);
                warns.push(item.totalWarns.value);
            });

            res.json({
                labels,
                members,
                tickets,
                warns,
                avg: comparison.avg
            });
        } catch (error) {
            logger.logError(error, { endpoint: '/api/guilds/comparison' });
            res.status(500).json({ error: 'Error al obtener comparación' });
        }
    });
}

module.exports = { setupApiRoutes };
