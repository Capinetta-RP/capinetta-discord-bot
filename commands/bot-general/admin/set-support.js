/**
 * @file set-support.js
 * @description Comando para la zona de "Aislamiento/Soporte".
 * Fija un mensaje informativo para usuarios restringidos.
 */

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { ensureSupportMessage } = require("../../../utils/setupMessages.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("set-support")
        .setDescription("Envía y fija las instrucciones en el canal de soporte/mute (Zona Mute)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            await ensureSupportMessage(interaction.channel);
            await interaction.editReply({ content: "✅ Mensaje de Zona Mute verificado/enviado y fijado." });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: "❌ Hubo un error al enviar el mensaje de soporte." });
        }
    },
};