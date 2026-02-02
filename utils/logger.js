/**
 * @file logger.js
 * @description Sistema de registro de actividad.
 * Envía logs visuales a canal de Discord y los guarda en MariaDB (Prisma) para auditoría.
 */

const { EmbedBuilder } = require('discord.js');
const { getGuildSettings } = require('./dataHandler');

/**
 * Envía un log formateado y lo guarda en DB.
 * @param {Object} client - Cliente de Discord
 * @param {Object} user - Usuario que ejecuta la acción
 * @param {string} text - Descripción del evento
 * @param {string} guildId - ID del servidor
 * @param {Object} messageToEdit - (Opcional) Si es un log de edición de mensaje
 */
async function sendLog(client, user, text, guildId, messageToEdit = null) {
    if (!guildId) return;
    const { prisma } = require("./database"); // Require on-demand
    const fs = require('fs');
    const path = require('path');
    try {
        // 1. Guardar en DB para historial permanente (Prisma)
        await prisma.activityLog.create({
            data: {
                guildId,
                userId: user.id || 'System',
                action: text
            }
        });

        // 2. Guardar en archivo de logs (JSON por línea)
        const logDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
        const logFile = path.join(logDir, `${new Date().toISOString().slice(0, 10)}.log`);
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            user: user.id || 'System',
            guildId,
            message: text,
            context: 'sendLog'
        };
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');

        // 3. Enviar embed a Discord (Visual)
        const settings = await getGuildSettings(guildId);
        if (!settings || !settings.logsChannel) return;

        const channel = await client.channels.fetch(settings.logsChannel).catch(() => null);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setDescription(text)
            .setColor(0x3498db) // Azul genérico
            .setTimestamp()
            .setFooter({ text: `User ID: ${user.id || 'System'}` });

        if (user.avatarURL) {
            embed.setAuthor({ name: user.tag || 'Sistema', iconURL: user.displayAvatarURL() });
        }

        await channel.send({ embeds: [embed] });

    } catch (err) {
        console.error("Error en logger:", err);
    }
}

/**
 * Registra errores críticos del sistema en DB y Consola.
 */
async function logError(client, error, context, guildId = null) {
    const { prisma } = require("./database");
    const fs = require('fs');
    const path = require('path');
    console.error(`[${context}] Error:`, error);

    try {
        await prisma.systemError.create({
            data: {
                context: context,
                message: error.toString(),
                stack: error.stack
            }
        });
        // Guardar en archivo de logs (JSON por línea)
        const logDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
        const logFile = path.join(logDir, `${new Date().toISOString().slice(0, 10)}.log`);
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            message: error.toString(),
            stack: error.stack,
            context
        };
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');

        // Notificar en Discord si hay guildId (fix solicitado)
        if (guildId && client) {
            const settings = await getGuildSettings(guildId);
            if (settings && settings.debugChannel) {
                const channel = await client.channels.fetch(settings.debugChannel).catch(() => null);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle(`🚨 Error de Sistema: ${context}`)
                        .setDescription(`\`\`\`js\n${error.toString().substring(0, 4000)}\n\`\`\``)
                        .setColor(0xe74c3c) // Rojo
                        .addFields({ name: 'Stack Trace', value: `\`\`\`js\n${(error.stack || 'No stack').substring(0, 1000)}\n\`\`\`` })
                        .setTimestamp();

                    await channel.send({ embeds: [embed] }).catch(console.error);
                }
            }
        }
    } catch (dbErr) {
        console.error("Critical: Failed to log error to DB.", dbErr);
    }
}

module.exports = { sendLog, logError };
