/**
 * @file config.route.js
 * @description Configuration routes for Capi Netta Dashboard
 */

const { prisma } = require('../../utils/database');
const { ensureSupportMessage, ensureVerifyMessage } = require('../../utils/setupMessages.js');

/**
 * Setup configuration routes
 * @param {Express} app - Express application
 * @param {Function} checkAuth - Authentication middleware
 */
function setupConfigRoutes(app, checkAuth) {
    app.get('/configuracion', checkAuth, async (req, res) => {
        try {
            const guildId = req.selectedGuild.id;
            const guildSettings = await prisma.guildSettings.findUnique({
                where: { guildId }
            });

            // Si no existe configuración, crear una vacía
            const settings = guildSettings || {
                guildId,
                logsChannel: null,
                debugChannel: null,
                verifyChannel: null,
                welcomeChannel: null,
                supportChannel: null,
                roleUser: null,
                roleNoVerify: null,
                roleMuted: null,
                ticketLogsChannel: null,
                ticketPanelChannel: null,
                ticketPanelMessage: null,
                isSetup: false
            };

            // Obtener canales y roles del servidor para los selectores
            const guild = app.locals.discordClient.guilds.cache.get(guildId);
            const channels = guild ? guild.channels.cache
                .filter(c => c.type === 0) // Solo canales de texto
                .map(c => ({ id: c.id, name: c.name }))
                .sort((a, b) => a.name.localeCompare(b.name)) : [];

            const roles = guild ? guild.roles.cache
                .filter(r => !r.managed && r.name !== '@everyone')
                .map(r => ({ id: r.id, name: r.name }))
                .sort((a, b) => a.name.localeCompare(b.name)) : [];

            res.render('configuracion', {
                user: req.user,
                selectedGuild: req.selectedGuild,
                adminGuilds: req.adminGuilds,
                settings,
                channels,
                roles,
                success: req.query.success,
                error: req.query.error
            });
        } catch (error) {
            res.status(500).send("Error cargando configuración: " + error.message);
        }
    });

    app.post('/configuracion/save', checkAuth, async (req, res) => {
        try {
            const guildId = req.selectedGuild.id;

            const { staffRoles } = req.body; // Solo extraemos staffRoles del body original

            // Auto-creación de recursos (Nuevo)
            const guild = app.locals.discordClient.guilds.cache.get(guildId);
            const { ChannelType, PermissionFlagsBits } = require('discord.js');

            const keysToProcess = [
                'logsChannel', 'debugChannel', 'verifyChannel', 'welcomeChannel', 'supportChannel', 'ticketLogsChannel',
                'roleUser', 'roleNoVerify', 'roleMuted'
            ];

            // Objeto para guardar los valores finales (IDs)
            const finalValues = { ...req.body };

            if (guild) {
                for (const key of keysToProcess) {
                    if (req.body[key] === 'CREATE') {
                        try {
                            let createdId = null;

                            // Determinar si es Canal o Rol basado en el nombre de la key
                            if (key.includes('Channel')) {
                                const nameMap = {
                                    logsChannel: 'logs-system',
                                    debugChannel: 'debug-console',
                                    verifyChannel: 'verificacion',
                                    welcomeChannel: 'bienvenida',
                                    supportChannel: 'soporte',
                                    ticketLogsChannel: 'logs-tickets'
                                };

                                const newChannel = await guild.channels.create({
                                    name: nameMap[key] || 'nuevo-canal',
                                    type: ChannelType.GuildText,
                                    reason: 'Auto-creado desde Dashboard'
                                });
                                createdId = newChannel.id;

                            } else if (key.includes('role')) {
                                const nameMap = {
                                    roleUser: 'Usuario',
                                    roleNoVerify: 'Sin Verificar',
                                    roleMuted: 'Muteado'
                                };

                                const newRole = await guild.roles.create({
                                    name: nameMap[key] || 'Nuevo Rol',
                                    reason: 'Auto-creado desde Dashboard'
                                });
                                createdId = newRole.id;
                            }

                            if (createdId) {
                                finalValues[key] = createdId; // Reemplazar 'CREATE' con el ID real
                            }
                        } catch (err) {
                            console.error(`Error auto-creating resource for ${key}:`, err);
                            // Si falla, dejamos el valor como null o el original para evitar crashes
                            finalValues[key] = null;
                        }
                    }
                }
            }

            // Usar los valores finales procesados
            const {
                logsChannel, debugChannel, verifyChannel, welcomeChannel, supportChannel,
                roleUser, roleNoVerify, roleMuted, ticketLogsChannel
            } = finalValues;

            // Procesar staffRoles (puede venir como array o string único)
            let staffRolesJson = null;
            if (staffRoles) {
                const rolesArray = Array.isArray(staffRoles) ? staffRoles : [staffRoles];
                staffRolesJson = JSON.stringify(rolesArray);
            }

            await prisma.guildSettings.upsert({
                where: { guildId },
                update: {
                    logsChannel: logsChannel || null,
                    debugChannel: debugChannel || null,
                    verifyChannel: verifyChannel || null,
                    welcomeChannel: welcomeChannel || null,
                    supportChannel: supportChannel || null,
                    roleUser: roleUser || null,
                    roleNoVerify: roleNoVerify || null,
                    roleMuted: roleMuted || null,
                    ticketLogsChannel: ticketLogsChannel || null,
                    staffRoles: staffRolesJson,
                    isSetup: true
                },
                create: {
                    guildId,
                    logsChannel: logsChannel || null,
                    debugChannel: debugChannel || null,
                    verifyChannel: verifyChannel || null,
                    welcomeChannel: welcomeChannel || null,
                    supportChannel: supportChannel || null,
                    roleUser: roleUser || null,
                    roleNoVerify: roleNoVerify || null,
                    roleMuted: roleMuted || null,
                    ticketLogsChannel: ticketLogsChannel || null,
                    staffRoles: staffRolesJson,
                    isSetup: true
                }
            });

            if (guild) {
                // Inicializar mensajes de configuración automática (Async, no bloqueamos la respuesta)
                if (verifyChannel) {
                    const channel = guild.channels.cache.get(verifyChannel);
                    if (channel) ensureVerifyMessage(channel).catch(e => console.error('Error auto-setup verify:', e));
                }

                if (supportChannel) {
                    // El canal de soporte puede ser usado para Zona Mute/Jail
                    const channel = guild.channels.cache.get(supportChannel);
                    if (channel) ensureSupportMessage(channel).catch(e => console.error('Error auto-setup support:', e));
                }
            }

            res.redirect('/configuracion?success=1');
        } catch (error) {
            res.redirect('/configuracion?error=' + encodeURIComponent(error.message));
        }
    });
}

module.exports = { setupConfigRoutes };
