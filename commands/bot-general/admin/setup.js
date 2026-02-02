/**
 * @file setup.js
 * @description Asistente de Configuración (Wizard) interactivo.
 * Guía al administrador paso a paso para configurar los canales y roles esenciales del bot.
 * 
 * Flujo:
 * Paso 1: Selección de Canales Clave (Logs, Verify, Debug).
 * Paso 2: Selección de Roles (User, NoVerify, Muted).
 * Paso 3: Módulos Opcionales (Support, Welcome) y Finalización.
 */

const {
    SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder, MessageFlags
} = require('discord.js');
const { updateGuildSettings } = require('../../../utils/dataHandler');
const { logError } = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Asistente interactivo para configurar el servidor')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guild = interaction.guild;

        // Estado inicial de la configuración (se va llenando paso a paso)
        let config = {
            logsChannel: null, verifyChannel: null, debugChannel: null,
            roleUser: null, roleNoVerify: null, roleMuted: null,
            welcomeChannel: null, supportChannel: null, staffRoles: [], isSetup: true
        };

        let step = 1; // Control de flujo del Wizard

        /**
         * Genera el Embed visual según el paso actual.
         */
        const getEmbed = () => {
            const embed = new EmbedBuilder().setTitle("🛠️ Asistente de Configuración | Capi Netta RP").setColor(0x3498db).setTimestamp();

            if (step === 1) {
                embed.setDescription("### Paso 1: Canales del Sistema\nSeleccioná los canales para **Logs**, **Verificación** y **Debug**.");
                embed.addFields(
                    { name: "📍 Logs:", value: config.logsChannel ? `<#${config.logsChannel}>` : "❌", inline: true },
                    { name: "✅ Verificación:", value: config.verifyChannel ? `<#${config.verifyChannel}>` : "❌", inline: true },
                    { name: "🚨 Debug:", value: config.debugChannel ? `<#${config.debugChannel}>` : "❌", inline: true }
                );
            } else if (step === 2) {
                embed.setDescription("### Paso 2: Gestión de Roles\nConfigurá los roles de acceso.");
                embed.addFields(
                    { name: "👤 Usuario:", value: config.roleUser ? `<@&${config.roleUser}>` : "❌", inline: true },
                    { name: "❓ Sin Verificar:", value: config.roleNoVerify ? `<@&${config.roleNoVerify}>` : "❌", inline: true },
                    { name: "🔇 Muteado:", value: config.roleMuted ? `<@&${config.roleMuted}>` : "❌", inline: true }
                );
            } else if (step === 3) {
                embed.setDescription("### Paso 3: Roles de Staff\nSeleccioná los roles que se consideran Staff (aparecerán en estadísticas).");
                embed.addFields(
                    { name: "👮 Roles de Staff:", value: config.staffRoles.length > 0 ? config.staffRoles.map(r => `<@&${r}>`).join(', ') : "🔘 Opcional (se usarán permisos por defecto)", inline: false }
                );
            } else {
                embed.setDescription("### Paso 4: Módulos Opcionales");
                embed.addFields(
                    { name: "👋 Bienvenida:", value: config.welcomeChannel ? `<#${config.welcomeChannel}>` : "🔘 Opcional", inline: true },
                    { name: "💬 Soporte:", value: config.supportChannel ? `<#${config.supportChannel}>` : "🔘 Opcional", inline: true }
                );
            }
            return embed;
        };

        /**
         * Genera los componentes (SelectMenus y Botones) según el paso.
         */
        const getComponents = () => {
            const rows = [];
            if (step === 1) {
                // Paso 1: ChannelSelect (Max 3)
                rows.push(new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('select_channels').setPlaceholder('Seleccionar canales...').addChannelTypes(ChannelType.GuildText).setMaxValues(3)));
                // Botón Next + Magic Create
                rows.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('magic_create').setLabel('✨ Auto-Crear Faltantes').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('next').setLabel('Siguiente ➡️').setStyle(ButtonStyle.Primary).setDisabled(!config.logsChannel || !config.verifyChannel)
                ));
            } else if (step === 2) {
                // Paso 2: RoleSelect (Max 3)
                rows.push(new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('select_roles').setPlaceholder('Seleccionar roles...').setMaxValues(3)));
                // Botón Next + Magic Create
                rows.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('magic_create').setLabel('✨ Auto-Crear Faltantes').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('next').setLabel('Siguiente ➡️').setStyle(ButtonStyle.Primary).setDisabled(!config.roleUser || !config.roleMuted)
                ));
            } else if (step === 3) {
                // Paso 3: RoleSelect para Staff (Hasta 10 roles)
                rows.push(new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('select_staff_roles').setPlaceholder('Roles de Staff (opcional)...').setMinValues(0).setMaxValues(10)));
                rows.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('skip_staff').setLabel('Omitir ⏭️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('next').setLabel('Siguiente ➡️').setStyle(ButtonStyle.Primary)
                ));
            } else {
                // Paso 4: ChannelSelect Opcional
                rows.push(new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('select_optional').setPlaceholder('Canales opcionales...').addChannelTypes(ChannelType.GuildText).setMaxValues(2)));
                rows.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('magic_create').setLabel('✨ Auto-Crear Faltantes').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('finish').setLabel('✅ Finalizar Setup').setStyle(ButtonStyle.Success)
                ));
            }
            return rows;
        };

        const message = await interaction.reply({ embeds: [getEmbed()], components: getComponents(), flags: [MessageFlags.Ephemeral] });

        // Collector de 5 minutos
        const collector = message.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async i => {
            // Actualización de estado (config) según selecciones
            if (i.customId === 'select_channels') {
                config.logsChannel = i.values[0];
                config.verifyChannel = i.values[1] || config.verifyChannel;
                config.debugChannel = i.values[2] || config.debugChannel;
            }
            if (i.customId === 'select_roles') {
                config.roleUser = i.values[0];
                config.roleNoVerify = i.values[1] || config.roleNoVerify;
                config.roleMuted = i.values[2] || config.roleMuted;
            }
            if (i.customId === 'select_staff_roles') {
                config.staffRoles = i.values; // Array de IDs de roles
            }
            if (i.customId === 'select_optional') {
                config.welcomeChannel = i.values[0];
                config.supportChannel = i.values[1] || config.supportChannel;
            }

            // Lógica Magic Create
            if (i.customId === 'magic_create') {
                await i.deferUpdate();
                try {
                    if (step === 1) {
                        if (!config.logsChannel) config.logsChannel = (await guild.channels.create({ name: 'logs-system', type: ChannelType.GuildText })).id;
                        if (!config.verifyChannel) config.verifyChannel = (await guild.channels.create({ name: 'verificacion', type: ChannelType.GuildText })).id;
                        if (!config.debugChannel) config.debugChannel = (await guild.channels.create({ name: 'debug-console', type: ChannelType.GuildText })).id;
                    } else if (step === 2) {
                        if (!config.roleUser) config.roleUser = (await guild.roles.create({ name: 'Usuario' })).id;
                        if (!config.roleNoVerify) config.roleNoVerify = (await guild.roles.create({ name: 'Sin Verificar' })).id;
                        if (!config.roleMuted) config.roleMuted = (await guild.roles.create({ name: 'Muteado' })).id;
                    } else if (step === 4) { // Paso 4 (Opcionales)
                        if (!config.welcomeChannel) config.welcomeChannel = (await guild.channels.create({ name: 'bienvenida', type: ChannelType.GuildText })).id;
                        if (!config.supportChannel) config.supportChannel = (await guild.channels.create({ name: 'soporte', type: ChannelType.GuildText })).id;
                    }

                    // Avanzar automáticamente si no es el último paso
                    if (step < 4) step++;

                    await interaction.editReply({ embeds: [getEmbed()], components: getComponents() });
                } catch (err) {
                    console.error("Magic Create Error:", err);
                    await interaction.followUp({ content: "❌ Error creando recursos automáticamente.", flags: [MessageFlags.Ephemeral] });
                }
                return;
            }

            // Navegación
            if (i.customId === 'next') {
                step++;
                await i.deferUpdate();
                await interaction.editReply({ embeds: [getEmbed()], components: getComponents() });
                return;
            }
            if (i.customId === 'skip_staff') {
                step++;
                await i.deferUpdate();
                await interaction.editReply({ embeds: [getEmbed()], components: getComponents() });
                return;
            }
            if (i.customId === 'finish') {
                try {
                    // Convertir staffRoles a JSON antes de guardar
                    const finalConfig = { ...config };
                    if (finalConfig.staffRoles && finalConfig.staffRoles.length > 0) {
                        finalConfig.staffRoles = JSON.stringify(finalConfig.staffRoles);
                    } else {
                        finalConfig.staffRoles = null;
                    }
                    await updateGuildSettings(guild.id, finalConfig);
                    return i.update({ content: "🎉 **¡Configuración completada con éxito!**", embeds: [], components: [] });
                } catch (err) {
                    logError(interaction.client, err, "Finalizar Setup Wizard", guild.id);
                    return i.update({ content: "❌ Error al guardar. Revisá MariaDB.", embeds: [], components: [] });
                }
            }

            // Re-render para selecciones normales
            await i.update({ embeds: [getEmbed()], components: getComponents() });
        });
    }
};