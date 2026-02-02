/**
 * @file management.route.js
 * @description Management routes for usuarios, canales, and roles
 */

const { prisma } = require('../../utils/database');
const { PermissionsBitField } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/structuredLogger');

// Helper constants
const memberFetchCooldowns = new Map();
const MEMBER_FETCH_COOLDOWN_MS = config.api.memberFetchCooldownMs;
const DEFAULT_USER_AVATAR = config.api.defaultUserAvatar;

// User profile cache management
const userProfileCache = new Map();
const USER_PROFILE_TTL_MS = config.cache.statsTTLMs;
const USER_PROFILE_CACHE_MAX_SIZE = 10000;

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

function setCachedUserProfile(userId, userName, userAvatar) {
    if (!userId) return;

    // LRU simple: si excede el límite, eliminar los más viejos
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

function warmUserProfileCache(users) {
    if (!Array.isArray(users)) return;
    for (const user of users) {
        if (!user?.id) continue;
        const userName = user.nickname || user.username || user.tag || user.id;
        const userAvatar = user.avatar || DEFAULT_USER_AVATAR;
        setCachedUserProfile(user.id, userName, userAvatar);
    }
}

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
        logger.logError('Error upserting user profile', { error: e.message, userId });
    }
}

async function persistUsers(users) {
    if (!Array.isArray(users) || users.length === 0) return;
    await Promise.all(users.map((user) => upsertUserProfile({
        userId: user.id,
        username: user.username || user.tag || user.id,
        avatar: user.avatar || DEFAULT_USER_AVATAR,
        tag: user.tag,
        discriminator: user.discriminator
    })));
}

function canFetchMembers(guildId) {
    const lastFetch = memberFetchCooldowns.get(guildId);
    if (!lastFetch) return true;
    return Date.now() - lastFetch > MEMBER_FETCH_COOLDOWN_MS;
}

function markMemberFetch(guildId) {
    memberFetchCooldowns.set(guildId, Date.now());
}

// Helper function para labels de tipo de canal
function getChannelTypeLabel(type) {
    const labels = {
        0: 'Texto',
        2: 'Voz',
        5: 'Anuncios',
        13: 'Escenario',
        15: 'Foro',
        4: 'Categoría'
    };
    return labels[type] || 'Otro';
}

/**
 * Setup all management routes
 * @param {Express} app - Express application
 * @param {Function} checkAuth - Authentication middleware
 */
function setupManagementRoutes(app, checkAuth) {
    // =============================================================================
    //                          GESTIÓN DE USUARIOS
    // =============================================================================

    app.get('/usuarios', checkAuth, async (req, res) => {
        try {
            const guildId = req.selectedGuild.id;
            const guild = app.locals.discordClient.guilds.cache.get(guildId);

            if (!guild) {
                return res.status(404).send('Servidor no encontrado');
            }

            // Obtener miembros del servidor (usar caché si está disponible)
            let members;
            try {
                // Solo hacer fetch si el cache está muy vacío Y podemos hacerlo (rate limit)
                if (guild.members.cache.size < 10 && canFetchMembers(guild.id)) {
                    markMemberFetch(guild.id);
                    members = await guild.members.fetch({ limit: 1000 });
                } else {
                    members = guild.members.cache;
                }
            } catch (error) {
                // Si hay rate limit, usar caché existente
                console.warn('Rate limit al obtener miembros, usando caché:', error.message);
                members = guild.members.cache;
            }

            // Estadísticas
            const totalMembers = members.size;
            const humanMembers = members.filter(m => !m.user.bot).size;
            const botMembers = members.filter(m => m.user.bot).size;
            const onlineMembers = members.filter(m => m.presence?.status === 'online').size;

            // Obtener todos los roles para el selector
            const roles = guild.roles.cache
                .filter(role => role.id !== guildId && !role.managed)
                .sort((a, b) => b.position - a.position)
                .map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#808080',
                    position: role.position
                }));

            // Preparar datos de usuarios
            const users = members.map(member => {
                const userRoles = member.roles.cache
                    .filter(role => role.id !== guildId)
                    .sort((a, b) => b.position - a.position)
                    .map(role => ({
                        id: role.id,
                        name: role.name,
                        color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#808080'
                    }));

                return {
                    id: member.user.id,
                    username: member.user.username,
                    discriminator: member.user.discriminator,
                    tag: member.user.tag,
                    avatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }),
                    nickname: member.nickname || null,
                    isBot: member.user.bot,
                    status: member.presence?.status || 'offline',
                    roles: userRoles,
                    joinedAt: member.joinedAt
                };
            }).sort((a, b) => a.username.localeCompare(b.username));

            warmUserProfileCache(users);
            await persistUsers(users);

            res.render('usuarios', {
                users,
                roles,
                stats: {
                    total: totalMembers,
                    humans: humanMembers,
                    bots: botMembers,
                    online: onlineMembers
                },
                user: req.user,
                selectedGuild: req.selectedGuild,
                adminGuilds: req.adminGuilds
            });
        } catch (error) {
            console.error('Error loading users:', error);
            res.status(500).send('Error al cargar usuarios');
        }
    });

    // Actualizar roles de un usuario
    app.post('/usuarios/update-roles/:userId', checkAuth, async (req, res) => {
        try {
            const guildId = req.selectedGuild.id;
            const { userId } = req.params;
            const { roleIds } = req.body;

            const guild = app.locals.discordClient.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).json({ message: 'Servidor no encontrado' });
            }

            const member = await guild.members.fetch(userId);
            if (!member) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            // Obtener roles actuales (excepto @everyone)
            const currentRoleIds = member.roles.cache
                .filter(role => role.id !== guildId)
                .map(role => role.id);

            // Roles que se pueden gestionar (no managed)
            const managedRoles = guild.roles.cache
                .filter(role => role.managed || role.id === guildId)
                .map(role => role.id);

            // Filtrar roles que no se pueden gestionar
            const newRoleIds = roleIds.filter(id => !managedRoles.includes(id));

            // Preservar roles managed que ya tiene el usuario
            const preservedManagedRoles = currentRoleIds.filter(id => managedRoles.includes(id));
            const finalRoleIds = [...new Set([...newRoleIds, ...preservedManagedRoles])];

            // Actualizar roles
            await member.roles.set(finalRoleIds, 'Actualizado desde el Dashboard');

            // Registrar actividad
            await prisma.activityLog.create({
                data: {
                    guildId,
                    userId: req.user.id,
                    action: `USER_ROLES_UPDATED: ${member.user.tag} (${userId})`
                }
            });

            res.json({
                success: true,
                message: `Roles de ${member.user.tag} actualizados correctamente`
            });
        } catch (error) {
            console.error('Error updating user roles:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al actualizar roles'
            });
        }
    });

    // =============================================================================
    //                          GESTIÓN DE CANALES
    // =============================================================================

    // Ruta de Gestión de Canales (PROTEGIDA) - Agrupada por Categorías
    app.get('/canales', checkAuth, async (req, res) => {
        try {
            const guildId = req.selectedGuild.id;
            const guild = app.locals.discordClient.guilds.cache.get(guildId);

            if (!guild) {
                return res.status(404).send('Servidor no encontrado');
            }

            // Obtener configuración para los roles (necesario para presets)
            const guildSettings = await prisma.guildSettings.findUnique({ where: { guildId } });

            // Obtener roles para el selector de permisos
            const roles = guild.roles.cache
                .filter(r => !r.managed && r.name !== '@everyone')
                .map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
                .sort((a, b) => a.name.localeCompare(b.name));

            // Obtener todos los canales
            const allChannelsCollection = guild.channels.cache;

            // Helper para detectar estado de permisos
            const { PermissionFlagsBits } = require('discord.js');
            const getChannelPermStatus = (channel) => {
                const everyoneOverwrite = channel.permissionOverwrites.cache.get(guildId);
                const isPrivate = everyoneOverwrite?.deny.has(PermissionFlagsBits.ViewChannel);

                if (isPrivate) {
                    // Verificar si es "Solo Staff" (Privado + Staff Allow)
                    let isStaff = false;
                    if (guildSettings?.staffRoles) {
                        try {
                            const roles = JSON.parse(guildSettings.staffRoles);
                            // Check if ANY staff role has Allow View
                            isStaff = roles.some(rid => channel.permissionOverwrites.cache.get(rid)?.allow.has(PermissionFlagsBits.ViewChannel));
                        } catch (e) {
                            logger.logError('Error parsing staff roles JSON', { error: e.message, guildId: channel.guild?.id });
                        }
                    }
                    if (isStaff) return { label: 'Solo Staff', icon: 'fa-user-shield', color: '#3498db' };
                    // Si está sincronizado con categoría privada, o es privado custom
                    return { label: 'Privado', icon: 'fa-eye-slash', color: '#6366f1' };
                }

                if (everyoneOverwrite?.deny.has(PermissionFlagsBits.SendMessages)) {
                    return { label: 'Bloqueado', icon: 'fa-lock', color: '#e74c3c' };
                }

                if (guildSettings?.roleNoVerify) {
                    const nv = channel.permissionOverwrites.cache.get(guildSettings.roleNoVerify);
                    if (nv?.deny.has(PermissionFlagsBits.ViewChannel)) return { label: '+Verificados', icon: 'fa-user-check', color: '#f39c12' };
                }

                return { label: 'Público', icon: 'fa-globe', color: '#2ecc71', isDefault: true };
            };

            // Helper para mapear datos del canal
            const mapChannelData = (channel) => ({
                id: channel.id,
                name: channel.name,
                type: channel.type,
                typeLabel: getChannelTypeLabel(channel.type),
                position: channel.position,
                parentId: channel.parentId,
                topic: channel.topic || '', // Incluir topic para edición
                nsfw: channel.nsfw || false,
                bitrate: channel.bitrate ? Math.floor(channel.bitrate / 1000) : null,
                userLimit: channel.userLimit || null,
                // Optimización: solo calcular members para canales de voz/stage
                membersConnected: (channel.type === 2 || channel.type === 13) ? (channel.members?.size || 0) : 0,
                slowmode: channel.rateLimitPerUser || 0,
                permStatus: getChannelPermStatus(channel)
            });

            // 1. Obtener Categorías y ordenarlas
            const categories = allChannelsCollection
                .filter(c => c.type === 4)
                .sort((a, b) => a.position - b.position)
                .map(c => ({
                    id: c.id,
                    name: c.name,
                    position: c.position
                }));

            // 2. Canales normales (no categorías)
            const channels = allChannelsCollection.filter(c => c.type !== 4);

            // 3. Agrupar canales
            const groupedChannels = [];

            // 3.1 Canales sin categoría
            const noCategoryChannels = channels
                .filter(c => !c.parentId)
                .sort((a, b) => a.position - b.position)
                .map(mapChannelData);

            if (noCategoryChannels.length > 0) {
                groupedChannels.push({
                    category: { id: 'uncategorized', name: 'SIN CATEGORÍA', position: -1 },
                    channels: noCategoryChannels
                });
            }

            // 3.2 Canales por categoría
            categories.forEach(cat => {
                const catChannels = channels
                    .filter(c => c.parentId === cat.id)
                    .sort((a, b) => {
                        const isVoiceA = a.type === 2 || a.type === 13;
                        const isVoiceB = b.type === 2 || b.type === 13;
                        if (isVoiceA !== isVoiceB) return isVoiceA ? 1 : -1;
                        return a.position - b.position;
                    })
                    .map(mapChannelData);

                groupedChannels.push({
                    category: cat,
                    channels: catChannels
                });
            });

            // Estadísticas
            const stats = {
                totalChannels: channels.size,
                textChannels: channels.filter(c => c.type === 0).size,
                voiceChannels: channels.filter(c => c.type === 2).size,
                announcementChannels: channels.filter(c => c.type === 5).size,
                forumChannels: channels.filter(c => c.type === 15).size,
                stageChannels: channels.filter(c => c.type === 13).size,
                totalCategories: categories.length,
                activeVoice: channels.filter(c => c.type === 2 || c.type === 13).reduce((sum, c) => sum + (c.members?.size || 0), 0)
            };

            res.render('canales', {
                groupedChannels, // Nueva estructura agrupada
                stats,
                user: req.user,
                selectedGuild: req.selectedGuild,
                adminGuilds: req.adminGuilds,
                guildSettings, // Pasar settings para UI de permisos
                roles // Roles para agregar permisos específicos
            });

        } catch (error) {
            console.error('Error loading channels:', error);
            res.status(500).send('Error al cargar la gestión de canales');
        }
    });

    // Ruta API para aplicar Presets de Permisos (POST)
    app.post('/canales/:guildId/permissions/:channelId', checkAuth, async (req, res) => {
        try {
            const { guildId, channelId } = req.params;
            const { preset, roleId } = req.body;

            // Verificar que el usuario tenga acceso a este guild
            if (req.selectedGuild.id !== guildId) {
                return res.status(403).json({ success: false, message: 'No autorizado para este servidor' });
            }

            const guild = app.locals.discordClient.guilds.cache.get(guildId);
            if (!guild) return res.status(404).json({ success: false, message: 'Servidor no encontrado' });

            const channel = guild.channels.cache.get(channelId);
            if (!channel) return res.status(404).json({ success: false, message: 'Canal no encontrado' });

            // Validar soporte de permisos
            if (!channel.permissionOverwrites) {
                return res.status(400).json({ success: false, message: 'Este tipo de canal no soporta permisos' });
            }

            const settings = await prisma.guildSettings.findUnique({ where: { guildId } });
            const reason = `Dashboard Permission Preset: ${preset}`;

            switch (preset) {
                case 'lock_all':
                    // Bloquear escritura para @everyone
                    await channel.permissionOverwrites.edit(guild.id, { SendMessages: false }, { reason });
                    break;

                case 'hide_unverified':
                    // Ocultar canal al rol No Verificado
                    if (settings?.roleNoVerify) {
                        await channel.permissionOverwrites.edit(settings.roleNoVerify, { ViewChannel: false }, { reason });
                    } else {
                        throw new Error('Rol "Sin Verificar" no configurado');
                    }
                    break;

                case 'staff_only':
                    // Ocultar a @everyone y permitir a Staff
                    await channel.permissionOverwrites.edit(guild.id, { ViewChannel: false }, { reason });
                    if (settings?.staffRoles) {
                        const staffRoles = JSON.parse(settings.staffRoles);
                        for (const roleId of staffRoles) {
                            await channel.permissionOverwrites.edit(roleId, { ViewChannel: true }, { reason });
                        }
                    }
                    break;

                case 'mute_zone':
                    // "Solo pueden ver ese canal" -> Zona de Mute
                    // Ocultar a @everyone y permitir VER al rol Muteado
                    if (settings?.roleMuted) {
                        await channel.permissionOverwrites.edit(guild.id, { ViewChannel: false }, { reason });
                        await channel.permissionOverwrites.edit(settings.roleMuted, { ViewChannel: true, SendMessages: false }, { reason });
                    } else {
                        throw new Error('Rol "Muteado" no configurado');
                    }
                    break;

                case 'private':
                    // Ocultar canal a @everyone (Hacerlo privado)
                    await channel.permissionOverwrites.edit(guild.id, { ViewChannel: false }, { reason });
                    break;

                case 'add_role':
                    if (!roleId) throw new Error('Se requiere un rol para esta acción');

                    const targetRole = guild.roles.cache.get(roleId);
                    if (!targetRole) throw new Error('Rol no encontrado');

                    // Lógica Jerárquica: Obtener rol seleccionado y SUPERIORES
                    // Nota: r.position numérico más alto = rol más alto.
                    const rolesToGrant = guild.roles.cache.filter(r =>
                        r.position >= targetRole.position &&
                        !r.managed && r.name !== '@everyone'
                    );

                    for (const [, role] of rolesToGrant) {
                        await channel.permissionOverwrites.edit(role.id, {
                            ViewChannel: true,
                            SendMessages: true,
                            Connect: true,
                            Speak: true
                        }, { reason: `${reason} (Jerárquico)` });
                    }
                    break;

                case 'sync':
                    // Sincronizar con categoría o limpiar
                    if (channel.parent) {
                        await channel.lockPermissions();
                    } else {
                        await channel.permissionOverwrites.set([], reason);
                    }
                    break;

                default:
                    return res.status(400).json({ success: false, message: 'Preset desconocido' });
            }

            // Si es una categoría, sincronizar hijos automáticamente
            // 4 = GuildCategory
            if (channel.type === 4) {
                channel.children.cache.forEach(async (child) => {
                    try {
                        await child.lockPermissions();
                    } catch (e) {
                        logger.logError('Error syncing child channel permissions', { error: e.message, childName: child.name, childId: child.id });
                    }
                });
            }

            // Registrar actividad
            await prisma.activityLog.create({
                data: {
                    guildId,
                    userId: req.user.id,
                    action: `CHANNEL_PERMS_UPDATE: ${channel.name} [${preset}]`
                }
            });

            res.json({ success: true, message: `Permisos actualizados (${preset})` });

        } catch (error) {
            console.error('Error setting permissions:', error);
            res.status(500).json({ success: false, message: error.message || 'Error interno' });
        }
    });

    // Ruta para Editar Propiedades del Canal
    app.post('/canales/:guildId/update/:channelId', checkAuth, async (req, res) => {
        try {
            const { guildId, channelId } = req.params;
            const { name, topic, nsfw, slowmode, userLimit } = req.body;

            if (req.selectedGuild.id !== guildId) return res.status(403).json({ success: false, message: 'No autorizado' });

            const guild = app.locals.discordClient.guilds.cache.get(guildId);
            const channel = guild.channels.cache.get(channelId);

            if (!channel) return res.status(404).json({ success: false, message: 'Canal no encontrado' });

            // Update Logic
            const updateData = {};
            if (name) updateData.name = name;
            if (topic !== undefined) updateData.topic = topic;
            if (nsfw !== undefined) updateData.nsfw = nsfw === 'true' || nsfw === true;

            // Parsed Integers
            if (slowmode !== undefined && slowmode !== '') updateData.rateLimitPerUser = parseInt(slowmode);

            // User Limit (Voice Only)
            if (userLimit !== undefined && userLimit !== '' && (channel.type === 2 || channel.type === 13)) {
                updateData.userLimit = parseInt(userLimit);
            }

            await channel.edit(updateData, { reason: `Editado desde Dashboard por ${req.user.username}` });

            res.json({ success: true, message: 'Canal actualizado correctamente' });

        } catch (error) {
            console.error('Error actualizando canal:', error);
            res.status(500).json({ success: false, message: 'Error interno: ' + error.message });
        }
    });

    // Ruta para Crear Canal
    app.post('/canales/:guildId/create', checkAuth, async (req, res) => {
        try {
            const { guildId } = req.params;
            const { name, type, parentId } = req.body;

            if (req.selectedGuild.id !== guildId) return res.status(403).json({ success: false, message: 'No autorizado' });

            const guild = app.locals.discordClient.guilds.cache.get(guildId);
            if (!guild) return res.status(404).json({ success: false, message: 'Guild no encontrada' });

            const channelData = {
                name,
                type: parseInt(type), // 0: Text, 2: Voice
                reason: `Creado desde Dashboard por ${req.user.username}`
            };

            if (parentId) channelData.parent = parentId;

            const newChannel = await guild.channels.create(channelData);

            res.json({ success: true, message: 'Canal creado', channelId: newChannel.id });
        } catch (error) {
            console.error('Error creando canal:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Ruta para Reordenar Canales
    app.patch('/canales/:guildId/positions', checkAuth, async (req, res) => {
        try {
            const { guildId } = req.params;
            const { positions } = req.body; // Array of { channel: id, position: int }

            if (req.selectedGuild.id !== guildId) return res.status(403).json({ success: false, message: 'No autorizado' });
            const guild = app.locals.discordClient.guilds.cache.get(guildId);

            // Discord espera: guild.channels.setPositions([{ channel, position }, ...])

            // 1. Separate Parent Updates (Discord restriction: one at a time)
            const positionUpdates = [];
            let parentUpdatesCount = 0;

            for (const p of positions) {
                const channelId = p.channel;
                const newParentId = p.parent || null; // Ensure null if undefined/empty
                const channel = guild.channels.cache.get(channelId);

                if (channel) {
                    // Check if parent changed
                    if (channel.parentId !== newParentId) {
                        try {
                            await channel.setParent(newParentId, { lockPermissions: false });
                            parentUpdatesCount++;
                        } catch (err) {
                            console.error(`Error updating parent for ${channel.name}:`, err);
                        }
                    }

                    // Add to position updates (exclude parent to avoid API error)
                    positionUpdates.push({
                        channel: channelId,
                        position: parseInt(p.position)
                    });
                }
            }

            // 2. Bulk Update Positions
            if (positionUpdates.length > 0) {
                console.log(`[Dashboard] Updating parents for ${parentUpdatesCount} channels, positions for ${positionUpdates.length} channels.`);
                await guild.channels.setPositions(positionUpdates);
            }

            res.json({ success: true, message: 'Orden actualizado' });
        } catch (error) {
            console.error('Error reordenando:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // =============================================================================
    //                          GESTIÓN DE ROLES
    // =============================================================================

    app.get('/roles', checkAuth, async (req, res) => {
        try {
            const guildId = req.selectedGuild.id;
            const guild = app.locals.discordClient.guilds.cache.get(guildId);

            if (!guild) {
                return res.status(404).send('Servidor no encontrado');
            }

            // Obtener todos los roles
            const allRoles = guild.roles.cache
                .filter(role => !role.managed && role.id !== guildId) // Excluir roles manejados y @everyone
                .map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.hexColor || '#808080',
                    memberCount: role.members.size,
                    permissions: Array.from(role.permissions.toArray()),
                    type: role.id === guildId ? 'default' : 'custom'
                }))
                .sort((a, b) => b.memberCount - a.memberCount);

            // Obtener roles de staff desde la base de datos
            const guildSettings = await prisma.guildSettings.findUnique({
                where: { guildId }
            });

            const staffRoleIds = guildSettings?.staffRoles ? JSON.parse(guildSettings.staffRoles) : [];

            // Marcar roles de staff y añadir información de jerarquía
            const rolesWithType = allRoles.map(role => {
                const discordRole = guild.roles.cache.get(role.id);
                let badge = 'custom';

                // Determinar badge por jerarquía (de menor a mayor prioridad)
                if (discordRole) {
                    // Primero verificar si está en staff roles
                    if (staffRoleIds.includes(role.id)) {
                        badge = 'staff';
                    }
                    // Administrator tiene mayor prioridad - sobrescribe staff
                    if (discordRole.permissions.has(PermissionsBitField.Flags.Administrator)) {
                        badge = 'admin';
                    }
                }

                return {
                    ...role,
                    type: badge
                };
            });

            // Estadísticas
            const totalRoles = rolesWithType.length;
            const adminRolesCount = rolesWithType.filter(r => r.type === 'admin').length;
            const staffRolesCount = rolesWithType.filter(r => r.type === 'staff').length;
            const assignedUsers = new Set(
                rolesWithType.reduce((acc, role) => {
                    guild.roles.cache.get(role.id)?.members.forEach(member => {
                        if (!member.user.bot) acc.push(member.id);
                    });
                    return acc;
                }, [])
            ).size;

            // Contar permisos únicos
            const allPermissions = new Set();
            rolesWithType.forEach(role => {
                role.permissions.forEach(perm => allPermissions.add(perm));
            });

            res.render('roles', {
                roles: rolesWithType,
                totalRoles,
                adminRoles: adminRolesCount,
                staffRoles: staffRolesCount,
                assignedUsers,
                totalPermissions: allPermissions.size,
                user: req.user,
                selectedGuild: req.selectedGuild,
                adminGuilds: req.adminGuilds
            });
        } catch (error) {
            console.error('Error loading roles:', error);
            res.status(500).send('Error al cargar la gestión de roles');
        }
    });

    // =============================================================================
    //                    ENDPOINTS PARA EDITAR/ELIMINAR ROLES
    // =============================================================================

    // Editar rol (color y permisos)
    app.post('/roles/edit/:roleId', checkAuth, async (req, res) => {
        try {
            const guildId = req.selectedGuild.id;
            const { roleId } = req.params;
            const body = req.body || {};
            const color = body.color;
            const permissions = body.permissions;

            const guild = app.locals.discordClient.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).json({ message: 'Servidor no encontrado' });
            }

            const role = guild.roles.cache.get(roleId);
            if (!role) {
                return res.status(404).json({ message: 'Rol no encontrado' });
            }

            // Validar que no sea un rol manejado por Discord
            if (role.managed) {
                return res.status(403).json({ message: 'No puedes editar roles manejados por Discord' });
            }

            // Convertir permisos a BitField
            const { PermissionsBitField } = require('discord.js');

            // Convertir nombres de permisos de SCREAMING_SNAKE_CASE a PascalCase
            const convertedPermissions = (permissions || []).map(perm => {
                // Convertir "ADMINISTRATOR" -> "Administrator"
                return perm.split('_').map((word, index) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join('');
            });

            const permissionBits = new PermissionsBitField(convertedPermissions);

            // Preparar datos para actualizar (solo lo que se proporciona)
            const updateData = {
                reason: 'Editado desde el Dashboard'
            };

            // Solo actualizar color si se proporciona
            if (color !== undefined && color !== null && color !== '') {
                updateData.color = color;
            }

            // Solo actualizar permisos si se proporcionan
            if (permissions !== undefined && permissions !== null) {
                updateData.permissions = permissionBits;
            }

            // Actualizar el rol
            await role.edit(updateData);

            res.json({
                success: true,
                message: 'Rol actualizado correctamente'
            });
        } catch (error) {
            console.error('Error updating role:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al actualizar el rol'
            });
        }
    });

    // Eliminar rol
    app.post('/roles/delete/:roleId', checkAuth, async (req, res) => {
        try {
            const guildId = req.selectedGuild.id;
            const { roleId } = req.params;

            const guild = app.locals.discordClient.guilds.cache.get(guildId);
            if (!guild) {
                return res.status(404).json({ message: 'Servidor no encontrado' });
            }

            const role = guild.roles.cache.get(roleId);
            if (!role) {
                return res.status(404).json({ message: 'Rol no encontrado' });
            }

            // Validar que no sea un rol manejado por Discord o @everyone
            if (role.managed || role.id === guildId) {
                return res.status(403).json({ message: 'No puedes eliminar este rol' });
            }

            const roleName = role.name;

            // Eliminar el rol
            await role.delete('Eliminado desde el Dashboard');

            // Registrar actividad
            await prisma.activityLog.create({
                data: {
                    guildId,
                    userId: req.user.id,
                    action: `ROLE_DELETED: "${roleName}" (${roleId})`
                }
            });

            res.json({
                success: true,
                message: `Rol "${roleName}" eliminado correctamente`
            });
        } catch (error) {
            console.error('Error deleting role:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error al eliminar el rol'
            });
        }
    });
}

module.exports = { setupManagementRoutes, getChannelTypeLabel };
