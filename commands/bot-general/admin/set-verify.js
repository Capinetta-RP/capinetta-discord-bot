/**
 * @file set-verify.js
 * @description Comando para establecer la "Zona de Verificación".
 * Envía un Embed estético con un botón de verificación integrado.
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { ensureVerifyMessage } = require("../../../utils/setupMessages.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("set-verify")
        .setDescription("Envía el mensaje con el botón de verificación en este canal")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            await ensureVerifyMessage(interaction.channel);
            await interaction.editReply({ content: "✅ Sistema de verificación verificado/enviado." });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: "❌ Hubo un error al enviar el mensaje de verificación." });
        }
    },
};