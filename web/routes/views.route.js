/**
 * @file views.route.js
 * @description View routes for Capi Netta Dashboard
 */

const { prisma } = require('../../utils/database');
const { PermissionsBitField } = require('discord.js');

/**
 * Setup view routes
 * @param {Express} app - Express application
 * @param {Function} checkAuth - Authentication middleware
 * @param {Function} resolveUserProfile - User profile resolver function
 * @param {Function} getGlobalStatsCache - Get global stats from cache
 * @param {Function} setGlobalStatsCache - Set global stats in cache
 */
function setupViewsRoutes(app, checkAuth, resolveUserProfile, getGlobalStatsCache, setGlobalStatsCache) {
    app.get('/about', checkAuth, (req, res) => {
        try {
            const cssFile = process.env.NODE_ENV === 'production' ? 'style.min.css' : 'style.css';
            res.render('about', {
                user: req.user,
                adminGuilds: req.adminGuilds,
                cssFile
            });
        } catch (error) {
            res.status(500).send("Error cargando página: " + error.message);
        }
    });

    app.get('/help', checkAuth, (req, res) => {
        try {
            const cssFile = process.env.NODE_ENV === 'production' ? 'style.min.css' : 'style.css';
            res.render('help', {
                user: req.user,
                adminGuilds: req.adminGuilds,
                cssFile
            });
        } catch (error) {
            res.status(500).send("Error cargando página: " + error.message);
        }
    });

    app.get('/servidores', checkAuth, async (req, res) => {
        try {
            const client = app.locals.discordClient;
            const guildIds = req.adminGuilds.map(g => g.id);

            // Batch queries para todas las guilds
            const [ticketsStats, warnsStats, logsStats, settingsMap] = await Promise.all([
                prisma.ticket.groupBy({
                    by: ['guildId'],
                    where: { guildId: { in: guildIds }, status: 'open' },
                    _count: { ticketId: true }
                }),
                prisma.warn.groupBy({
                    by: ['guildId'],
                    where: { guildId: { in: guildIds } },
                    _sum: { count: true }
                }),
                prisma.activityLog.groupBy({
                    by: ['guildId'],
                    where: { guildId: { in: guildIds } },
                    _count: { id: true }
                }),
                prisma.guildSettings.findMany({
                    where: { guildId: { in: guildIds } },
                    select: { guildId: true, isSetup: true }
                }).then(settings => new Map(settings.map(s => [s.guildId, s])))
            ]);

            const ticketsMap = new Map(ticketsStats.map(t => [t.guildId, t._count.ticketId]));
            const warnsMap = new Map(warnsStats.map(w => [w.guildId, w._sum.count || 0]));
            const logsMap = new Map(logsStats.map(l => [l.guildId, l._count.id]));

            const serversData = req.adminGuilds.map(guildInfo => {
                const guild = client.guilds.cache.get(guildInfo.id);
                if (!guild) return null;

                const settings = settingsMap.get(guild.id);

                return {
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon,
                    memberCount: guild.memberCount,
                    isSetup: settings?.isSetup || false,
                    stats: {
                        ticketsOpen: ticketsMap.get(guild.id) || 0,
                        warnsTotal: warnsMap.get(guild.id) || 0,
                        logsCount: logsMap.get(guild.id) || 0
                    }
                };
            }).filter(Boolean);

            res.render('servidores', {
                user: req.user,
                adminGuilds: req.adminGuilds,
                selectedGuild: req.selectedGuild,
                serversData,
                cssFile: process.env.NODE_ENV === 'production' ? 'style.min.css' : 'style.css'
            });
        } catch (error) {
            res.status(500).send("Error cargando servidores: " + error.message);
        }
    });

    app.get('/metrics', checkAuth, (req, res) => {
        const cssFile = process.env.NODE_ENV === 'production' ? 'style.min.css' : 'style.css';
        res.render('metrics', { user: req.user, cssFile });
    });

    app.get('/statistics', checkAuth, (req, res) => {
        const cssFile = process.env.NODE_ENV === 'production' ? 'style.min.css' : 'style.css';
        res.render('statistics', { user: req.user, guilds: req.adminGuilds, cssFile, logs: [] });
    });

    app.get('/overview', checkAuth, async (req, res) => {
        try {
            const client = app.locals.discordClient;
            const guildIds = req.adminGuilds.map(g => g.id);

            // Intentar usar cache de estadísticas globales
            let cachedStats = getGlobalStatsCache(guildIds);
            let totalTicketsOpen, totalWarns, totalLogs, uniqueUsersWarned;

            if (cachedStats) {
                ({ totalTicketsOpen, totalWarns, totalLogs, uniqueUsersWarned } = cachedStats);
            } else {
                // Estadísticas globales
                const [
                    _totalTicketsOpen,
                    _totalWarns,
                    _totalLogs,
                    allWarns
                ] = await Promise.all([
                    prisma.ticket.count({
                        where: {
                            guildId: { in: guildIds },
                            status: 'open'
                        }
                    }),
                    prisma.warn.aggregate({
                        where: { guildId: { in: guildIds } },
                        _sum: { count: true },
                        _count: true
                    }),
                    prisma.activityLog.count({
                        where: { guildId: { in: guildIds } }
                    }),
                    prisma.warn.findMany({
                        where: { guildId: { in: guildIds } },
                        select: { userId: true }
                    })
                ]);

                totalTicketsOpen = _totalTicketsOpen;
                totalWarns = _totalWarns;
                totalLogs = _totalLogs;
                uniqueUsersWarned = new Set(allWarns.map(w => w.userId)).size;

                setGlobalStatsCache(guildIds, { totalTicketsOpen, totalWarns, totalLogs, uniqueUsersWarned });
            }

            // Datos por servidor
            const serversData = [];
            let totalMembers = 0;
            let totalVoice = 0;
            let totalStaffOnline = 0;
            const uniqueMembers = new Set();
            const uniqueStaffOnline = new Set();

            // Batch queries por servidor
            const serverGuildIds = req.adminGuilds.map(g => g.id);
            const [serverTickets, serverWarns, serverSettings] = await Promise.all([
                prisma.ticket.groupBy({
                    by: ['guildId'],
                    where: { guildId: { in: serverGuildIds }, status: 'open' },
                    _count: { ticketId: true }
                }),
                prisma.warn.groupBy({
                    by: ['guildId'],
                    where: { guildId: { in: serverGuildIds } },
                    _sum: { count: true }
                }),
                prisma.guildSettings.findMany({
                    where: { guildId: { in: serverGuildIds } },
                    select: { guildId: true, staffRoles: true }
                }).then(settings => new Map(settings.map(s => [s.guildId, s.staffRoles])))
            ]);

            const serverTicketsMap = new Map(serverTickets.map(t => [t.guildId, t._count.ticketId]));
            const serverWarnsMap = new Map(serverWarns.map(w => [w.guildId, w._sum.count || 0]));

            for (const guildInfo of req.adminGuilds) {
                const guild = client.guilds.cache.get(guildInfo.id);
                if (!guild) continue;

                totalMembers += guild.memberCount;
                for (const member of guild.members.cache.values()) {
                    if (member.user.bot) continue;
                    uniqueMembers.add(member.id);
                }

                try {
                    totalVoice += guild.voiceStates.cache.filter(vs => vs.channelId).size;
                } catch (e) {
                    // Ignorar errores
                }

                // Usar configuración de roles de staff del batch
                const staffRolesJson = serverSettings.get(guild.id);

                let staffOnline = 0;
                if (staffRolesJson) {
                    try {
                        const staffRoleIds = JSON.parse(staffRolesJson);
                        for (const member of guild.members.cache.values()) {
                            if (member.user.bot) continue;
                            const isOnline = member.presence?.status !== 'offline' && member.presence?.status !== undefined;
                            const hasStaffRole = member.roles.cache.some(role => staffRoleIds.includes(role.id));
                            if (isOnline && hasStaffRole) {
                                staffOnline += 1;
                                uniqueStaffOnline.add(member.id);
                            }
                        }
                    } catch (e) {
                        staffOnline = 0;
                    }
                } else {
                    // Fallback: usar presence + permisos
                    for (const member of guild.members.cache.values()) {
                        if (member.user.bot) continue;
                        const isOnline = member.presence?.status !== 'offline' && member.presence?.status !== undefined;
                        const hasPerms = member.roles.cache.some(role =>
                            role.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
                            role.permissions.has(PermissionsBitField.Flags.Administrator)
                        );
                        if (isOnline && hasPerms) {
                            staffOnline += 1;
                            uniqueStaffOnline.add(member.id);
                        }
                    }
                }

                totalStaffOnline += staffOnline;

                serversData.push({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon,
                    memberCount: guild.memberCount,
                    ticketsOpen: serverTicketsMap.get(guild.id) || 0,
                    warnsTotal: serverWarnsMap.get(guild.id) || 0,
                    voiceCount: guild.voiceStates.cache.filter(vs => vs.channelId).size,
                    staffOnline
                });
            }

            // Últimas actividades de todos los servidores
            const recentLogsRaw = await prisma.activityLog.findMany({
                where: { guildId: { in: guildIds } },
                select: { id: true, guildId: true, userId: true, action: true, timestamp: true },
                orderBy: { timestamp: 'desc' },
                take: 15
            });

            const recentLogs = await Promise.all(recentLogsRaw.map(async (log) => {
                const guild = client.guilds.cache.get(log.guildId);
                const profile = await resolveUserProfile({ client, guild, userId: log.userId });

                return {
                    ...log,
                    guildName: guild?.name || 'Servidor desconocido',
                    ...profile
                };
            }));

            res.render('overview', {
                user: req.user,
                adminGuilds: req.adminGuilds,
                selectedGuild: { name: 'Análisis General', icon: null },
                globalStats: {
                    totalServers: req.adminGuilds.length,
                    totalMembers: uniqueMembers.size,
                    totalTicketsOpen,
                    totalWarns: totalWarns._sum.count || 0,
                    uniqueUsersWarned,
                    totalLogs,
                    totalVoice,
                    totalStaffOnline: uniqueStaffOnline.size,
                    avgPing: client.ws.ping
                },
                serversData,
                recentLogs
            });
        } catch (error) {
            console.error('Error en overview:', error);
            res.status(500).send("Error cargando análisis general: " + error.message);
        }
    });

    app.get('/transcript/:ticketId', checkAuth, async (req, res) => {
        const { ticketId } = req.params;
        const guildId = req.selectedGuild.id;

        try {
            // Verificar que el ticket pertenece al servidor
            const ticket = await prisma.ticket.findFirst({
                where: {
                    ticketId: parseInt(ticketId),
                    guildId: guildId
                }
            });

            if (!ticket) {
                return res.status(404).send('Ticket no encontrado o no tienes acceso a este recurso.');
            }

            if (!ticket.transcriptUrl) {
                return res.status(404).send('El transcript para este ticket no está disponible.');
            }

            // Configurar headers para permitir Web Components y scripts externos
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.removeHeader('Content-Security-Policy');
            res.setHeader('X-Content-Type-Options', 'nosniff');

            // Servir el archivo HTML
            const path = require('path');
            const filePath = path.join(__dirname, '..', '..', 'data', 'transcripts', ticket.transcriptUrl);
            res.sendFile(filePath, (err) => {
                if (err) {
                    console.error('Error serving transcript:', err);
                    res.status(404).send('Archivo no encontrado.');
                }
            });
        } catch (error) {
            console.error('Error fetching transcript:', error);
            res.status(500).send('Error al obtener el transcript: ' + error.message);
        }
    });
}

module.exports = { setupViewsRoutes };
