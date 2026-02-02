/**
 * Gestor de estadísticas por servidor (Guild)
 */

const { prisma } = require('./database');

class GuildStats {
    /**
     * Obtiene estadísticas completas de un servidor
     */
    static async getGuildStats(guildId) {
        try {
            const [ticketsOpen, ticketsTotal, warnsTotal, logsTotal, activeUsers] = await Promise.all([
                // Tickets abiertos
                prisma.ticket.count({
                    where: {
                        guildId: guildId,
                        status: { not: 'closed' }
                    }
                }),
                // Total de tickets (todos los estados)
                prisma.ticket.count({
                    where: { guildId: guildId }
                }),
                // Total de warnings
                prisma.warn.count({
                    where: { guildId: guildId }
                }),
                // Total de logs de actividad
                prisma.activityLog.count({
                    where: { guildId: guildId }
                }),
                // Usuarios activos (últimos 7 días)
                prisma.activityLog.findMany({
                    where: {
                        guildId: guildId,
                        timestamp: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    },
                    select: { userId: true },
                    distinct: ['userId']
                })
            ]);

            return {
                guildId,
                tickets: {
                    open: ticketsOpen,
                    total: ticketsTotal,
                    closedRate: ticketsTotal > 0 ? Math.round(((ticketsTotal - ticketsOpen) / ticketsTotal) * 100) : 0
                },
                warns: {
                    total: warnsTotal
                },
                activity: {
                    totalLogs: logsTotal,
                    activeUsers: activeUsers.length
                }
            };
        } catch (error) {
            console.error(`Error getting stats for guild ${guildId}:`, error);
            return null;
        }
    }

    /**
     * Obtiene estadísticas de múltiples servidores
     */
    static async getMultiGuildStats(guildIds) {
        try {
            const stats = await Promise.all(
                guildIds.map(id => this.getGuildStats(id))
            );
            return stats.filter(s => s !== null);
        } catch (error) {
            console.error('Error getting multi-guild stats:', error);
            return [];
        }
    }

    /**
     * Obtiene top warnings (usuarios más advertidos)
     */
    static async getTopWarned(guildId, limit = 10) {
        try {
            const topWarned = await prisma.warn.groupBy({
                by: ['userId'],
                where: { guildId: guildId },
                _count: {
                    id: true
                },
                orderBy: {
                    _count: {
                        id: 'desc'
                    }
                },
                take: limit
            });

            return topWarned.map(item => ({
                userId: item.userId,
                warnCount: item._count.id
            }));
        } catch (error) {
            console.error('Error getting top warned:', error);
            return [];
        }
    }

    /**
     * Obtiene estadísticas de warnings por período
     */
    static async getWarnsTrend(guildId, days = 30) {
        try {
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const warns = await prisma.warnLog.findMany({
                where: {
                    userId: {
                        in: (await prisma.warn.findMany({
                            where: { guildId: guildId },
                            select: { userId: true },
                            distinct: ['userId']
                        })).map(w => w.userId)
                    },
                    timestamp: { gte: startDate }
                },
                select: { timestamp: true }
            });

            // Agrupar por día
            const trend = {};
            for (const warn of warns) {
                const day = warn.timestamp.toISOString().split('T')[0];
                trend[day] = (trend[day] || 0) + 1;
            }

            return Object.entries(trend).map(([date, count]) => ({ date, count }));
        } catch (error) {
            console.error('Error getting warns trend:', error);
            return [];
        }
    }

    /**
     * Obtiene tickets por estado
     */
    static async getTicketsByStatus(guildId) {
        try {
            const ticketsByStatus = await prisma.ticket.groupBy({
                by: ['status'],
                where: { guildId: guildId },
                _count: {
                    id: true
                }
            });

            const result = {
                open: 0,
                closed: 0,
                pending: 0,
                other: 0
            };

            for (const item of ticketsByStatus) {
                if (item.status === 'closed') result.closed += item._count.id;
                else if (item.status === 'open') result.open += item._count.id;
                else if (item.status === 'pending') result.pending += item._count.id;
                else result.other += item._count.id;
            }

            return result;
        } catch (error) {
            console.error('Error getting tickets by status:', error);
            return {};
        }
    }

    /**
     * Obtiene resumen comparativo entre servidores
     */
    static async getComparison(guildIds) {
        try {
            const stats = await this.getMultiGuildStats(guildIds);

            if (stats.length === 0) {
                return null;
            }

            const avg = {
                openTickets: Math.round(stats.reduce((sum, s) => sum + s.tickets.open, 0) / stats.length),
                totalWarns: Math.round(stats.reduce((sum, s) => sum + s.warns.total, 0) / stats.length),
                activeUsers: Math.round(stats.reduce((sum, s) => sum + s.activity.activeUsers, 0) / stats.length)
            };

            const comparison = stats.map(s => ({
                guildId: s.guildId,
                openTickets: { value: s.tickets.open, diff: s.tickets.open - avg.openTickets },
                totalWarns: { value: s.warns.total, diff: s.warns.total - avg.totalWarns },
                activeUsers: { value: s.activity.activeUsers, diff: s.activity.activeUsers - avg.activeUsers }
            }));

            return { avg, comparison };
        } catch (error) {
            console.error('Error getting comparison:', error);
            return null;
        }
    }

    /**
     * Obtiene actividad reciente
     */
    static async getRecentActivity(guildId, limit = 50) {
        try {
            const activity = await prisma.activityLog.findMany({
                where: { guildId: guildId },
                orderBy: { timestamp: 'desc' },
                take: limit,
                select: {
                    id: true,
                    userId: true,
                    action: true,
                    details: true,
                    timestamp: true
                }
            });

            return activity;
        } catch (error) {
            console.error('Error getting recent activity:', error);
            return [];
        }
    }
}

module.exports = GuildStats;
