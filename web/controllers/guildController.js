/**
 * @file guildController.js
 * @description Controller for guild-related operations
 */

const { PermissionsBitField } = require('discord.js');
const cacheManager = require('../utils/cacheManager');

/**
 * Get guild metrics (voice users, staff online)
 */
async function getGuildMetrics(guild, guildSettings) {
    if (!guild) return { voice: 0, staff: 0 };

    const cached = cacheManager.getDiscordMetricsCache(guild.id);
    if (cached) return cached;

    let voice = 0;
    let staff = 0;

    try {
        voice = guild.voiceStates.cache.filter(vs => vs.channelId).size;
    } catch (e) {
        voice = 0;
    }

    const members = guild.members.cache;

    if (guildSettings?.staffRoles && guildSettings.staffRoles !== 'null') {
        try {
            const staffRoleIds = JSON.parse(guildSettings.staffRoles);
            staff = members.filter(m => {
                if (m.user.bot) return false;
                const isOnline = m.presence?.status !== 'offline' && m.presence?.status !== undefined;
                const hasStaffRole = m.roles.cache.some(role => staffRoleIds.includes(role.id));
                return isOnline && hasStaffRole;
            }).size;
        } catch (e) {
            staff = 0;
        }
    } else {
        staff = members.filter(m => {
            if (m.user.bot) return false;
            if (m.presence?.status === 'offline' || m.presence?.status === undefined) return false;
            return m.roles.cache.some(role =>
                role.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
                role.permissions.has(PermissionsBitField.Flags.Administrator)
            );
        }).size;
    }

    const metrics = { voice, staff };
    cacheManager.setDiscordMetricsCache(guild.id, metrics);
    return metrics;
}

/**
 * Get channel type label for display
 */
function getChannelTypeLabel(type) {
    const typeMap = {
        0: 'Texto',
        2: 'Voz',
        4: 'Categoría',
        5: 'Anuncios',
        10: 'Hilo',
        11: 'Hilo Público',
        12: 'Hilo Privado',
        13: 'Escenario',
        15: 'Foro'
    };
    return typeMap[type] || 'Desconocido';
}

module.exports = {
    getGuildMetrics,
    getChannelTypeLabel
};
