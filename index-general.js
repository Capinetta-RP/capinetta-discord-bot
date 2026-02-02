const { Client, GatewayIntentBits, Partials } = require("discord.js");
const config = require("./config");
const { getWarnsFromDB } = require("./utils/dataHandler");
const startDashboard = require('./web/dashboard');
const logger = require('./utils/structuredLogger');

// Cliente General (Main Bot)
const clientGeneral = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User]
});

// Inicialización de Maps Globales
clientGeneral.consecutiveMap = new Map();
clientGeneral.warnMap = new Map();

const loadEvents = require("./handlers/eventHandler");
const loadCommands = require("./handlers/commandHandler");

// Cargar Handlers solo para General
loadEvents(clientGeneral, "bot-general");
loadCommands(clientGeneral, "bot-general");

// Manejo de Errores Globales
process.on('unhandledRejection', (error) => {
    console.error('❌ [General] Unhandled Rejection:', error);
    // Log to file for production debugging
    if (process.env.NODE_ENV === 'production') {
        logger.logError(error, { type: 'unhandledRejection', bot: 'general' });
    }
});

process.on('uncaughtException', (error) => {
    console.error('❌ [General] Uncaught Exception:', error);
    if (process.env.NODE_ENV === 'production') {
        logger.logError(error, { type: 'uncaughtException', bot: 'general' });
    }
    // Exit process on uncaught exceptions in production
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
});

(async () => {
    try {
        // 1. Cargar Datos
        clientGeneral.warnMap = await getWarnsFromDB();
        console.log("✅ [General] Warns cargados desde Base de Datos.");

        // 2. Iniciar Dashboard Web
        startDashboard(clientGeneral);

        // 3. Login Discord
        await clientGeneral.login(config.general.token);
        console.log("✅ [General] Login exitoso.");

    } catch (err) {
        console.error("❌ [General] Error fatal en inicio:", err);
        process.exit(1);
    }
})();
