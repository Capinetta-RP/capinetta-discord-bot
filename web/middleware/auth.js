/**
 * @file auth.js
 * @description Authentication middleware
 */

const { PermissionsBitField } = require('discord.js');
const logger = require('../../utils/structuredLogger');

/**
 * Middleware to check if user is authenticated and has admin permissions
 */
async function checkAuth(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/discord');
    }

    const discordClient = req.app.locals.discordClient;
    if (!discordClient) {
        return res.status(503).send('Dashboard sin conexión al bot.');
    }

    try {
        const userGuilds = req.user.guilds || [];
        const adminGuilds = [];

        for (const guild of userGuilds) {
            const botGuild = discordClient.guilds.cache.get(guild.id);
            if (!botGuild) continue;

            try {
                const member = await botGuild.members.fetch(req.user.id);
                if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    adminGuilds.push({
                        id: guild.id,
                        name: guild.name,
                        icon: guild.icon
                    });
                }
            } catch (err) {
                logger.warn('Failed to fetch member permissions', {
                    userId: req.user.id,
                    guildId: guild.id,
                    error: err.message
                });
                continue;
            }
        }

        if (adminGuilds.length === 0) {
            return res.redirect('/access-denied');
        }

        req.adminGuilds = adminGuilds;

        let selectedGuildId = req.query.server || req.session.selectedGuildId;

        if (!selectedGuildId || !adminGuilds.find(g => g.id === selectedGuildId)) {
            selectedGuildId = adminGuilds[0].id;
        }

        req.session.selectedGuildId = selectedGuildId;

        // Force 'server' query param for consistency in Views
        // Exclude global pages that don't need server context
        if (req.method === 'GET' && req.accepts('html') && !req.query.server &&
            !req.path.startsWith('/api') &&
            !req.path.startsWith('/auth') &&
            !req.path.startsWith('/servidores') &&
            !req.path.startsWith('/overview')) {
            const query = new URLSearchParams(req.query);
            query.set('server', selectedGuildId);
            return res.redirect(`${req.path}?${query.toString()}`);
        }

        const guild = await discordClient.guilds.fetch(selectedGuildId);
        const member = await guild.members.fetch(req.user.id);

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return res.redirect('/access-denied');
        }

        req.discordMember = member;
        req.selectedGuild = {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            memberCount: guild.memberCount
        };

        return next();
    } catch (err) {
        logger.logError(err, { middleware: 'checkAuth', userId: req.user?.id });
        return res.status(403).send('No se pudo validar permisos en el servidor.');
    }
}

/**
 * Middleware to ensure user is not authenticated (for login page)
 */
function ensureGuest(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    next();
}

module.exports = {
    checkAuth,
    ensureGuest
};
