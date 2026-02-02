/**
 * @file kick.js
 * @description Comando para expulsar miembros.
 * Incluye validación de permisos y registro en el canal de logs del servidor.
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

const { sendLog } = require('../../../utils/logger');
const logger = require('../../../utils/structuredLogger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un miembro del servidor')
        .addUserOption(opt => opt.setName('usuario').setDescription('El usuario a expulsar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón de la expulsión'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada';

        // Validar longitud de la razón
        if (reason.length > 1000) {
            return interaction.reply({ content: '❌ La razón no puede exceder 1000 caracteres.', flags: [MessageFlags.Ephemeral] });
        }

        // Validar que no se pueda expulsar a sí mismo
        if (user.id === interaction.user.id) {
            return interaction.reply({ content: '❌ No puedes expulsarte a ti mismo.', flags: [MessageFlags.Ephemeral] });
        }

        // Fetch obligatorio para verificar kickable
        const member = await interaction.guild.members.fetch(user.id).catch(err => {
            console.error(`Error fetching member ${user.id}:`, err.message);
            return null;
        });

        if (!member) return interaction.reply({ content: '❌ Usuario no encontrado en el servidor.', flags: [MessageFlags.Ephemeral] });

        if (!member.kickable) {
            return interaction.reply({
                content: '❌ No puedo expulsar a este usuario (Mi rol es inferior o es el dueño).',
                flags: [MessageFlags.Ephemeral]
            });
        }

        // Ejecutar Kick
        await member.kick(reason);

        await interaction.reply({ content: `✅ **${user.tag}** fue expulsado correctamente.\n📝 **Razón:** ${reason}` });

        // Enviar Log
        sendLog(
            interaction.client,
            interaction.user,
            `👞 **KICK**: ${user.tag} expulsado por ${interaction.user.tag}. Razón: ${reason}`,
            interaction.guild.id
        );

        // Log estructurado para estadísticas
        logger.warn('KICK', {
            action: 'KICK',
            user: user.tag,
            userId: user.id,
            moderator: interaction.user.tag,
            moderatorId: interaction.user.id,
            reason,
            guildId: interaction.guild.id
        });
    },
};