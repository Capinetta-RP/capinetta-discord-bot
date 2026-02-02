/**
 * @file backgroundJobs.js
 * @description Background jobs for periodic tasks
 */

const { prisma } = require('../../utils/database');
const config = require('../../config');
const { upsertUserProfile, setCachedUserProfile } = require('./userFetcher');

const USER_PROFILE_STALE_MS = 24 * 60 * 60 * 1000; // 24 hours
const USER_PROFILE_REFRESH_BATCH = config.cache?.userProfileRefreshBatch || 50; // Default to 50 if not configured
const LOGS_RETENTION_DAYS = 90;

let isRefreshingProfiles = false;
let isCleaningLogs = false;

/**
 * Refresh stale user profiles from Discord
 */
async function refreshStaleUserProfiles(client) {
    if (!client || isRefreshingProfiles) return;
    isRefreshingProfiles = true;

    try {
        const threshold = new Date(Date.now() - USER_PROFILE_STALE_MS);
        const staleUsers = await prisma.user.findMany({
            where: { updatedAt: { lt: threshold } },
            select: { id: true },
            take: USER_PROFILE_REFRESH_BATCH
        });

        for (const user of staleUsers) {
            try {
                const discordUser = await client.users.fetch(user.id);
                await upsertUserProfile({
                    userId: discordUser.id,
                    username: discordUser.username,
                    avatar: discordUser.displayAvatarURL({ size: 64 }),
                    tag: discordUser.tag,
                    discriminator: discordUser.discriminator
                });

                setCachedUserProfile(
                    discordUser.id,
                    discordUser.username,
                    discordUser.displayAvatarURL({ size: 32 })
                );
            } catch (e) {
                // Ignore unresolvable users
            }
        }
    } catch (e) {
        // Ignore job errors
    } finally {
        isRefreshingProfiles = false;
    }
}

/**
 * Cleanup old logs from database
 */
async function cleanupOldLogs() {
    if (isCleaningLogs) return;
    isCleaningLogs = true;

    try {
        const threshold = new Date(Date.now() - (LOGS_RETENTION_DAYS * 24 * 60 * 60 * 1000));
        const deleted = await prisma.activityLog.deleteMany({
            where: {
                timestamp: { lt: threshold }
            }
        });

        if (deleted.count > 0) {
            console.log(`🧹 Limpieza automática: ${deleted.count} logs eliminados (>${LOGS_RETENTION_DAYS} días)`);
        }
    } catch (e) {
        console.error('Error en cleanup de logs:', e);
    } finally {
        isCleaningLogs = false;
    }
}

/**
 * Persist multiple users to database
 */
async function persistUsers(users) {
    if (!Array.isArray(users) || users.length === 0) return;
    await Promise.all(users.map((user) => upsertUserProfile({
        userId: user.id,
        username: user.username || user.tag || user.id,
        avatar: user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png',
        tag: user.tag,
        discriminator: user.discriminator
    })));
}

module.exports = {
    refreshStaleUserProfiles,
    cleanupOldLogs,
    persistUsers
};
