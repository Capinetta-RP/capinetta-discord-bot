/**
 * @file userFetcher.js
 * @description Batch user fetching utility to avoid rate limits
 */

const { prisma } = require('../../utils/database');

const DEFAULT_USER_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png';
const USER_PROFILE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const USER_PROFILE_CACHE_MAX_SIZE = 10000;
const BATCH_FETCH_DELAY_MS = 100; // Delay between batch processing
const BATCH_SIZE = 50; // Max users per batch

// In-memory cache for user profiles
const userProfileCache = new Map();

// Queue for pending user fetches
let fetchQueue = [];
let batchTimeout = null;

/**
 * Get cached user profile
 */
function getCachedUserProfile(userId) {
    if (!userId) return null;
    const cached = userProfileCache.get(userId);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
        userProfileCache.delete(userId);
        return null;
    }
    return cached;
}

/**
 * Set cached user profile with LRU eviction
 */
function setCachedUserProfile(userId, userName, userAvatar) {
    if (!userId) return;

    // Simple LRU: if exceeds limit, remove oldest
    if (userProfileCache.size >= USER_PROFILE_CACHE_MAX_SIZE) {
        const firstKey = userProfileCache.keys().next().value;
        if (firstKey) userProfileCache.delete(firstKey);
    }

    userProfileCache.set(userId, {
        userName,
        userAvatar,
        expiresAt: Date.now() + USER_PROFILE_TTL_MS
    });
}

/**
 * Warm cache with multiple users at once
 */
function warmUserProfileCache(users) {
    if (!Array.isArray(users)) return;
    for (const user of users) {
        if (!user?.id) continue;
        const userName = user.nickname || user.username || user.tag || user.id;
        const userAvatar = user.avatar || DEFAULT_USER_AVATAR;
        setCachedUserProfile(user.id, userName, userAvatar);
    }
}

/**
 * Get user profile from database
 */
async function getUserProfileFromDb(userId) {
    if (!userId) return null;
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, avatar: true, tag: true }
        });
        if (!user) return null;
        return {
            userName: user.username || user.tag || userId,
            userAvatar: user.avatar || DEFAULT_USER_AVATAR
        };
    } catch (e) {
        return null;
    }
}

/**
 * Upsert user profile in database
 */
async function upsertUserProfile({ userId, username, avatar, tag, discriminator }) {
    if (!userId || !username) return;
    try {
        await prisma.user.upsert({
            where: { id: userId },
            update: {
                username,
                avatar,
                tag,
                discriminator,
                lastSeenAt: new Date()
            },
            create: {
                id: userId,
                username,
                avatar,
                tag,
                discriminator,
                lastSeenAt: new Date()
            }
        });
    } catch (e) {
        // Ignore persistence errors
    }
}

/**
 * Batch fetch users from Discord
 */
async function processFetchQueue(client, guild) {
    if (!Array.isArray(fetchQueue) || fetchQueue.length === 0) return;

    const batch = fetchQueue.splice(0, BATCH_SIZE);
    const userIds = [...new Set(batch)]; // Deduplicate

    try {
        // Try to fetch members in batch
        if (guild && userIds.length > 1) {
            const members = await guild.members.fetch({ user: userIds });
            
            members.forEach(member => {
                const userName = member.displayName || member.user.username;
                const userAvatar = member.displayAvatarURL({ size: 32 });
                
                setCachedUserProfile(member.id, userName, userAvatar);
                
                // Persist to DB
                upsertUserProfile({
                    userId: member.id,
                    username: member.user.username,
                    avatar: member.user.displayAvatarURL({ size: 64 }),
                    tag: member.user.tag,
                    discriminator: member.user.discriminator
                });
            });
        } else if (client) {
            // Fallback to individual fetches if no guild or single user
            for (const userId of userIds) {
                try {
                    const user = await client.users.fetch(userId);
                    const userName = user.username;
                    const userAvatar = user.displayAvatarURL({ size: 32 });
                    
                    setCachedUserProfile(userId, userName, userAvatar);
                    
                    await upsertUserProfile({
                        userId,
                        username: user.username,
                        avatar: user.displayAvatarURL({ size: 64 }),
                        tag: user.tag,
                        discriminator: user.discriminator
                    });
                } catch (e) {
                    // User not found, skip
                }
            }
        }
    } catch (e) {
        console.warn('Batch fetch error:', e.message);
    }

    // Process next batch if queue has more items
    if (fetchQueue.length > 0) {
        setTimeout(() => processFetchQueue(client, guild), BATCH_FETCH_DELAY_MS);
    } else {
        batchTimeout = null;
    }
}

/**
 * Queue user for batch fetching
 * Note: This is a simplified queue that only stores userIds.
 * Client and guild are passed when processing begins.
 */
function queueUserFetch(userId) {
    if (!fetchQueue.includes(userId)) {
        fetchQueue.push(userId);
    }
}

/**
 * Resolve user profile with batching support
 */
async function resolveUserProfile({ client, guild, userId }) {
    if (!userId) {
        return { userName: 'Sistema', userAvatar: DEFAULT_USER_AVATAR };
    }

    // Check cache first
    const cached = getCachedUserProfile(userId);
    if (cached) return cached;

    // Check database
    const dbProfile = await getUserProfileFromDb(userId);
    if (dbProfile) {
        setCachedUserProfile(userId, dbProfile.userName, dbProfile.userAvatar);
        return dbProfile;
    }

    // Check guild cache
    if (guild) {
        const cachedMember = guild.members.cache.get(userId);
        if (cachedMember) {
            const userName = cachedMember.displayName || cachedMember.user.username;
            const userAvatar = cachedMember.displayAvatarURL({ size: 32 });
            setCachedUserProfile(userId, userName, userAvatar);
            
            await upsertUserProfile({
                userId,
                username: cachedMember.user.username,
                avatar: cachedMember.user.displayAvatarURL({ size: 64 }),
                tag: cachedMember.user.tag,
                discriminator: cachedMember.user.discriminator
            });
            
            return { userName, userAvatar };
        }
    }

    // For individual resolves, don't use the queue as it's unreliable
    // Instead, recommend using batchResolveUserProfiles for batch operations
    
    return { userName: userId, userAvatar: DEFAULT_USER_AVATAR };
}

/**
 * Batch resolve multiple user profiles
 */
async function batchResolveUserProfiles({ client, guild, userIds }) {
    const profiles = {};
    const toFetch = [];

    // First pass: get from cache and DB
    for (const userId of userIds) {
        if (!userId) continue;

        const cached = getCachedUserProfile(userId);
        if (cached) {
            profiles[userId] = cached;
            continue;
        }

        const dbProfile = await getUserProfileFromDb(userId);
        if (dbProfile) {
            setCachedUserProfile(userId, dbProfile.userName, dbProfile.userAvatar);
            profiles[userId] = dbProfile;
            continue;
        }

        // Check guild cache
        if (guild) {
            const cachedMember = guild.members.cache.get(userId);
            if (cachedMember) {
                const userName = cachedMember.displayName || cachedMember.user.username;
                const userAvatar = cachedMember.displayAvatarURL({ size: 32 });
                profiles[userId] = { userName, userAvatar };
                setCachedUserProfile(userId, userName, userAvatar);
                continue;
            }
        }

        toFetch.push(userId);
    }

    // Batch fetch remaining users
    if (toFetch.length > 0 && guild) {
        try {
            const members = await guild.members.fetch({ user: toFetch });
            
            for (const [memberId, member] of members) {
                const userName = member.displayName || member.user.username;
                const userAvatar = member.displayAvatarURL({ size: 32 });
                
                profiles[memberId] = { userName, userAvatar };
                setCachedUserProfile(memberId, userName, userAvatar);
                
                await upsertUserProfile({
                    userId: memberId,
                    username: member.user.username,
                    avatar: member.user.displayAvatarURL({ size: 64 }),
                    tag: member.user.tag,
                    discriminator: member.user.discriminator
                });
            }
        } catch (e) {
            console.warn('Batch fetch failed:', e.message);
        }
    }

    // Fill in any missing with defaults
    for (const userId of toFetch) {
        if (!profiles[userId]) {
            profiles[userId] = { userName: userId, userAvatar: DEFAULT_USER_AVATAR };
        }
    }

    return profiles;
}

module.exports = {
    getCachedUserProfile,
    setCachedUserProfile,
    warmUserProfileCache,
    getUserProfileFromDb,
    upsertUserProfile,
    resolveUserProfile,
    batchResolveUserProfiles
};
