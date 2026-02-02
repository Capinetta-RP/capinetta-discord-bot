/**
 * @file setupMessages.js
 * @description Utilidades para enviar mensajes de configuración automática (Verify, Support/Mute).
 * Se utiliza tanto en comandos manuales como en la configuración automática del Dashboard.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");

/**
 * Asegura que el canal de soporte/mute tenga el mensaje de instrucciones.
 * @param {import("discord.js").TextChannel} channel - El canal de soporte.
 */
async function ensureSupportMessage(channel) {
    if (!channel) return;

    try {
        // Verificar últimos mensajes para evitar duplicados
        const messages = await channel.messages.fetch({ limit: 10 });
        const existingMessage = messages.find(m =>
            m.author.id === channel.client.user.id &&
            m.embeds.length > 0 &&
            m.embeds[0].title === "📌 Instrucciones de la 𝐙𝐎𝐍𝐀 𝐌𝐔𝐓𝐄"
        );

        if (existingMessage) {
            console.log(`[Setup] Mensaje de soporte ya existente en ${channel.name}`);
            return;
        }

        const supportEmbed = new EmbedBuilder()
            .setTitle("📌 Instrucciones de la 𝐙𝐎𝐍𝐀 𝐌𝐔𝐓𝐄")
            .setDescription(
                "Si estás viendo este canal, es porque nuestro sistema de seguridad detectó actividad sospechosa en tu cuenta.\n\n" +
                "**¿Qué debo hacer?**\n" +
                "1️⃣ **Cambiar tu contraseña:** Es probable que tu cuenta haya sido vulnerada.\n" +
                "2️⃣ **Activar 2FA:** Recomendamos usar la autenticación en dos pasos.\n" +
                "3️⃣ **Avisar al Staff:** Una vez que tu cuenta sea segura, escribí en este canal para que un administrador te devuelva tus roles.\n\n" +
                "Gracias por ayudar a mantener seguro el servidor de Capi Netta RP.\n" +
                "*Sistema de Seguridad Automático*"
            )
            .setColor(0xe67e22) // Naranja/Warning
            .setFooter({ text: "Seguridad | Capi Netta RP" });

        const message = await channel.send({ embeds: [supportEmbed] });
        await message.pin().catch(e => console.warn("No se pudo fijar el mensaje de soporte:", e.message));
        console.log(`[Setup] Mensaje de soporte enviado a ${channel.name}`);

    } catch (error) {
        console.error(`[Setup] Error enviando mensaje de soporte a ${channel.name}:`, error);
    }
}

/**
 * Asegura que el canal de verificación tenga el mensaje con botón.
 * @param {import("discord.js").TextChannel} channel - El canal de verificación.
 */
async function ensureVerifyMessage(channel) {
    if (!channel) return;

    try {
        // Verificar últimos mensajes
        const messages = await channel.messages.fetch({ limit: 10 });
        const existingMessage = messages.find(m =>
            m.author.id === channel.client.user.id &&
            m.embeds.length > 0 &&
            (m.embeds[0].title === "Obtén tu verificación" || m.embeds[0].title === "Verificación")
        );

        if (existingMessage) {
            console.log(`[Setup] Mensaje de verificación ya existente en ${channel.name}`);
            return;
        }

        const verifyEmbed = new EmbedBuilder()
            .setAuthor({ name: "Administración | Capi Netta RP" })
            .setTitle("Obtén tu verificación")
            .setDescription(
                "¡Bienvenido/a a **Capi Netta RP**!\n\n" +
                "⏱️ Permanecé **1 minuto** en el servidor\n" +
                "📜 Leé y aceptá las normativas\n\n" +
                "Luego presioná el botón ✅"
            )
            .setColor(0x3498db);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verify")
                .setEmoji("✅")
                .setLabel("Verificarme")
                .setStyle(ButtonStyle.Success)
        );

        await channel.send({ embeds: [verifyEmbed], components: [row] });
        console.log(`[Setup] Mensaje de verificación enviado a ${channel.name}`);

    } catch (error) {
        console.error(`[Setup] Error enviando mensaje de verificación a ${channel.name}:`, error);
    }
}

module.exports = {
    ensureSupportMessage,
    ensureVerifyMessage
};
