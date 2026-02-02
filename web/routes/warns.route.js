/**
 * @file warns.route.js
 * @description Warns management routes for Capi Netta Dashboard
 */

const { prisma } = require('../../utils/database');

/**
 * Setup warns routes
 * @param {Express} app - Express application
 * @param {Function} checkAuth - Authentication middleware
 */
function setupWarnsRoutes(app, checkAuth) {
    app.post('/warns/reset/:userId', checkAuth, async (req, res) => {
        try {
            const guildId = req.selectedGuild.id;
            const { userId } = req.params;

            await prisma.warn.delete({
                where: {
                    guildId_userId: {
                        guildId,
                        userId
                    }
                }
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Error resetting warns:', error);
            res.json({ success: false, error: error.message });
        }
    });

    app.get('/warns/history/:userId', checkAuth, async (req, res) => {
        try {
            const { userId } = req.params;
            const guildId = req.selectedGuild.id;
            const guild = app.locals.discordClient.guilds.cache.get(guildId);

            const logs = await prisma.warnLog.findMany({
                where: { userId },
                orderBy: { timestamp: 'desc' },
                take: 50
            });

            const enriched = await Promise.all(logs.map(async (log) => {
                let moderatorName = 'Moderador Desconocido';
                try {
                    if (guild) {
                        const moderator = await guild.members.fetch(log.moderatorId);
                        moderatorName = moderator?.user?.username || moderatorName;
                    }
                } catch (e) {
                    // Ignorar errores de fetch
                }

                return {
                    warnNumber: log.warnNumber,
                    reason: log.reason,
                    moderatorName,
                    timestamp: new Date(log.timestamp).toLocaleString('es-AR')
                };
            }));

            res.json({ success: true, logs: enriched, guildName: guild?.name || 'Servidor actual' });
        } catch (error) {
            console.error('Error loading warn history:', error);
            res.status(500).json({ success: false, message: 'Error al cargar historial de warns' });
        }
    });
}

module.exports = { setupWarnsRoutes };
