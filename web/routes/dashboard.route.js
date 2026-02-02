/**
 * @file dashboard.route.js
 * @description Main dashboard view routes
 */

const { prisma } = require('../../utils/database');
const { resolveUserProfile } = require('../utils/userFetcher');
const { getGuildMetrics } = require('../controllers/guildController');

function setupDashboardRoutes(app, checkAuth) {
    // Home dashboard with statistics
    app.get('/dashboard', checkAuth, async (req, res) => {
        try {
            const guildId = req.selectedGuild.id;

            const [usersWarned, ticketsOpen, warnsAggregate, activityLogs] = await Promise.all([
                prisma.warn.count({ where: { guildId } }),
                prisma.ticket.count({ where: { guildId, status: 'open' } }),
                prisma.warn.aggregate({ where: { guildId }, _sum: { count: true } }),
                prisma.activityLog.findMany({
                    where: { guildId },
                    select: { id: true, userId: true, action: true, timestamp: true },
                    orderBy: { timestamp: 'desc' },
                    take: 10
                })
            ]);

            const warnsTotal = warnsAggregate._sum.count || 0;

            let discordStats = {
                online: 0,
                voice: 0,
                staff: 0,
                ping: 0
            };

            if (app.locals.discordClient) {
                const client = app.locals.discordClient;
                const guild = client.guilds.cache.get(guildId);

                if (guild) {
                    discordStats.online = guild.memberCount;
                    discordStats.ping = client.ws.ping;

                    const guildSettings = await prisma.guildSettings.findUnique({
                        where: { guildId },
                        select: { staffRoles: true }
                    });

                    const metrics = await getGuildMetrics(guild, guildSettings);
                    discordStats.voice = metrics.voice;
                    discordStats.staff = metrics.staff;
                }
            }

            let logsWithUsers = activityLogs;
            if (app.locals.discordClient) {
                const client = app.locals.discordClient;
                const guild = client.guilds.cache.get(guildId);

                logsWithUsers = await Promise.all(activityLogs.map(async (log) => {
                    const profile = await resolveUserProfile({ client, guild, userId: log.userId });
                    return { ...log, ...profile };
                }));
            }

            res.render('index', {
                user: req.user,
                selectedGuild: req.selectedGuild,
                adminGuilds: req.adminGuilds,
                stats: {
                    usersWarned,
                    ticketsOpen,
                    warnsTotal,
                    ...discordStats
                },
                logs: logsWithUsers,
                cssFile: process.env.NODE_ENV === 'production' ? 'style.min.css' : 'style.css'
            });
        } catch (error) {
            res.send("Error cargando dashboard: " + error.message);
        }
    });

    // Tickets page with filtering
    app.get('/tickets', checkAuth, async (req, res) => {
        const { status, type, claimed } = req.query;
        const guildId = req.selectedGuild.id;
        const guild = app.locals.discordClient.guilds.cache.get(guildId);

        const where = { guildId };
        if (status && ['open', 'claimed', 'closed', 'archived'].includes(status)) where.status = status;
        if (type) where.type = type;
        if (claimed === 'true') where.claimedBy = { not: null };
        if (claimed === 'false') where.claimedBy = null;

        const tickets = await prisma.ticket.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        const enrichedTickets = await Promise.all(tickets.map(async (ticket) => {
            try {
                const creator = await guild.members.fetch(ticket.userId);
                const enriched = {
                    ...ticket,
                    creatorName: creator.user.username,
                    creatorAvatar: creator.user.displayAvatarURL({ size: 32 })
                };

                if (ticket.claimedBy) {
                    const claimer = await guild.members.fetch(ticket.claimedBy);
                    enriched.claimerName = claimer.user.username;
                    enriched.claimerAvatar = claimer.user.displayAvatarURL({ size: 32 });
                } else {
                    enriched.claimerName = '-';
                    enriched.claimerAvatar = null;
                }

                return enriched;
            } catch (e) {
                return {
                    ...ticket,
                    creatorName: 'Usuario Desconocido',
                    creatorAvatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
                    claimerName: ticket.claimedBy ? 'Usuario Desconocido' : '-',
                    claimerAvatar: null
                };
            }
        }));

        const types = await prisma.ticket.groupBy({
            by: ['type'],
            where: { guildId },
            _count: { type: true }
        });

        res.render('tickets', {
            tickets: enrichedTickets,
            user: req.user,
            selectedGuild: req.selectedGuild,
            adminGuilds: req.adminGuilds,
            filters: { status, type, claimed },
            types,
            cssFile: process.env.NODE_ENV === 'production' ? 'style.min.css' : 'style.css'
        });
    });

    // Activity logs with pagination
    app.get('/logs', checkAuth, async (req, res) => {
        const guildId = req.selectedGuild.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const [logs, totalCount] = await Promise.all([
            prisma.activityLog.findMany({
                where: { guildId },
                select: { id: true, userId: true, action: true, timestamp: true },
                orderBy: { timestamp: 'desc' },
                skip,
                take: limit
            }),
            prisma.activityLog.count({ where: { guildId } })
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        const client = app.locals.discordClient;
        const guild = client?.guilds.cache.get(guildId);
        const logsWithUsers = await Promise.all(logs.map(async (log) => {
            const profile = await resolveUserProfile({ client, guild, userId: log.userId });
            return { ...log, ...profile };
        }));

        res.render('logs', {
            logs: logsWithUsers,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            user: req.user,
            selectedGuild: req.selectedGuild,
            adminGuilds: req.adminGuilds,
            cssFile: process.env.NODE_ENV === 'production' ? 'style.min.css' : 'style.css'
        });
    });

    // Warns system
    app.get('/warns', checkAuth, async (req, res) => {
        try {
            const guildId = req.selectedGuild.id;
            const guild = app.locals.discordClient.guilds.cache.get(guildId);

            const warns = await prisma.warn.findMany({
                where: { guildId }
            });

            const totalUsers = warns.length;
            const totalWarns = warns.reduce((sum, w) => sum + w.count, 0);
            const avgWarns = totalUsers > 0 ? totalWarns / totalUsers : 0;

            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentLogs = await prisma.warnLog.findMany({
                where: {
                    timestamp: { gte: oneDayAgo }
                },
                orderBy: { timestamp: 'desc' }
            });
            const recentWarns = recentLogs.length;

            const enrichedWarns = await Promise.all(warns.map(async (warn) => {
                try {
                    const member = await guild.members.fetch(warn.userId);
                    const lastLog = await prisma.warnLog.findFirst({
                        where: { userId: warn.userId },
                        orderBy: { timestamp: 'desc' }
                    });

                    return {
                        userId: warn.userId,
                        username: member.user.username,
                        avatar: member.user.displayAvatarURL({ size: 64 }),
                        count: warn.count,
                        lastWarnDate: lastLog ? new Date(lastLog.timestamp).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : null
                    };
                } catch (e) {
                    return {
                        userId: warn.userId,
                        username: 'Usuario Desconocido',
                        avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
                        count: warn.count,
                        lastWarnDate: null
                    };
                }
            }));

            enrichedWarns.sort((a, b) => b.count - a.count);

            const recentActivity = await Promise.all(recentLogs.slice(0, 10).map(async (log) => {
                try {
                    const user = await guild.members.fetch(log.userId);
                    const moderator = await guild.members.fetch(log.moderatorId);

                    return {
                        username: user.user.username,
                        moderatorName: moderator.user.username,
                        warnNumber: log.warnNumber,
                        reason: log.reason,
                        timestamp: new Date(log.timestamp).toLocaleString('es-AR')
                    };
                } catch (e) {
                    return {
                        username: 'Usuario Desconocido',
                        moderatorName: 'Moderador Desconocido',
                        warnNumber: log.warnNumber,
                        reason: log.reason,
                        timestamp: new Date(log.timestamp).toLocaleString('es-AR')
                    };
                }
            }));

            res.render('warns', {
                warns: enrichedWarns,
                totalUsers,
                totalWarns,
                avgWarns,
                recentWarns,
                recentActivity,
                user: req.user,
                selectedGuild: req.selectedGuild,
                adminGuilds: req.adminGuilds,
                cssFile: process.env.NODE_ENV === 'production' ? 'style.min.css' : 'style.css'
            });
        } catch (error) {
            console.error('Error loading warns:', error);
            res.status(500).send('Error al cargar el sistema de warns');
        }
    });
}

module.exports = setupDashboardRoutes;
