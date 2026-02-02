# 🤖 Capi Netta RP - Multi-Bot System (v1.0)

🔒 **SISTEMA EXCLUSIVO** para el servidor de **Capi Netta RP**

Sistema modular y escalable de gestión para servidores de Discord de Roleplay, compuesto por un **Bot General** y un **Bot de Whitelist**. Implementa seguridad avanzada, moderación inteligente, sistema de tickets profesional y dashboard web. Utiliza **Prisma + MariaDB** para persistencia de datos y está optimizado para ejecutarse 24/7 mediante **PM2**.

**Características destacadas**: Anti-spam automático, sistema de tickets con transcripts, dashboard web con autenticación Discord, auditoría multiservidor, KPIs de soporte en tiempo real y tarjetas de bienvenida personalizadas con canvas.

🔗 **Enlaces Oficiales**:
- 🌐 **Sitio Web**: [www.capinettarp.com.ar](https://www.capinettarp.com.ar)
- 💬 **Servidor Discord**: [Únete a Capi Netta RP](https://discord.gg/tpxRFHugX7)
- 🐙 **GitHub**: [Capinetta-RP/capinetta-discord-bot](https://github.com/Capinetta-RP/capinetta-discord-bot)

---

## 📢 Últimas Actualizaciones (30/01/2026)

✨ **Mejoras en Gestión de Tickets**:
- Nombres de usuarios en lugar de IDs en la tabla (con avatares)
- Botón "Ver Transcript" para acceder al historial de chats
- Transcripts guardados localmente en tu dominio (seguro y privado)
- Solo staff autenticado puede verlos

Ejecuta `npx prisma db push` para aplicar los cambios de BD.

---

## 📚 Documentación Rápida

| 📖 Documentación | 🎯 Para Quién | ⏱️ Tiempo |
| :--- | :--- | :--- |
| [⚡ Inicio Rápido](docs/QUICKSTART.md) | Nuevos usuarios | 5 min |
| [❓ Preguntas Frecuentes](docs/FAQ.md) | Todos | 5-10 min |
| [🤝 Cómo Contribuir](docs/CONTRIBUTING.md) | Desarrolladores | 10 min |
| [🚀 Guía de Despliegue](docs/DEPLOYMENT_GUIDE.md) | DevOps/SysAdmin | 30 min |
| [🔒 Seguridad](docs/SECURITY.md) | Researchers | 5 min |
| [📚 Centro de Docs](DOCUMENTATION.md) | Todos | 2 min |

> ✨ **¿Primero vez?** → [Comienza aquí](docs/QUICKSTART.md)

---

## 🚀 Funciones Actuales

### 🛡️ Seguridad y Anti-Spam (Multiservidor)
* **Aislamiento Preventivo**: Detecta automáticamente mensajes repetitivos, guarda los roles del usuario en MariaDB (por GuildId) y lo traslada a una zona de aislamiento restringida.
* **Limpieza de Spam**: Al detectar un ataque, el bot ejecuta un `bulkDelete` para eliminar instantáneamente todos los mensajes del spammer.
* **Sistema Anti-Bot**: Expulsa automáticamente cuentas con una antigüedad menor a 7 días para prevenir ataques organizados.
* **Verificación por Botón**: Sistema con cooldown de 1 minuto que requiere confirmación antes de otorgar el rol de usuario. Previene raids automáticos.
* **Auditoría Multi-Evento**: Registra entradas/salidas, cambios de rol (con debounce), bans, ediciones y eliminaciones de mensajes con timestamps y executor.

### ⚖️ Moderación, Whitelist y Disciplina
* **Sistema de Advertencias Inteligente**: Comando `/warn` registra infracciones con razón y timestamp. Al llegar a 3 warns, aplica timeout automático de 10 minutos. Comando `/reset-warns` permite borrar contadores.
* **Historial de Sanciones**: Comando `/history` permite consultar todas las sanciones previas de un usuario (warns, kicks, bans).
* **Restauración de Roles**: Comando `/unmute` recupera y aplica automáticamente la lista completa de roles almacenados en MariaDB antes de ser sancionado.
* **Expulsión Registrada**: Comando `/kick` con razón e integración con Audit Logs para rastreabilidad.
* **Whitelist Estética**: Comandos `/aprobar` y `/rechazar` que envían embeds personalizados con información del usuario al canal de resultados configurado.

### 🎫 Sistema de Tickets Profesional
* **Creación de Categorías Dinámicas**: Comando `/ticket add/edit/remove` permite crear categorías con roles específicos, emojis y descripciones personalizadas.
* **Panel Interactivo**: Comando `/ticket panel` envía un embed con botones/selectmenu para crear tickets de forma rápida y visual.
* **Gestión Avanzada de Tickets**: 
  - **Reclamar ticket** (`claim`): El staff asigna el ticket a sí mismo.
  - **Transferir ticket** (`transfer`): Reasigna a otro miembro del equipo con confirmación.
  - **Cerrar ticket** (`close`): Cierra el ticket con opción de confirmación.
  - **Agregar roles extras** (`/ticket addrole`): Permite que múltiples roles vean y trabajen en tickets.
* **Recordatorios Automáticos de Inactividad**: Sistema inteligente que detecta tickets sin respuesta y envía pings al staff:
  - Primer recordatorio a los 30 minutos de inactividad.
  - Segundo recordatorio a los 60 minutos si no hay respuesta.
  - Previene tickets olvidados y mejora tiempos de respuesta.
* **Transcripts Automáticos**: Al cerrar un ticket, genera un archivo `.html` con el historial completo enviado por MD al usuario y guardado localmente en el servidor.
* **Logs Centralizados**: Comando `/ticket setlogs` configura el canal donde se archivan automáticamente los transcripts.
* **KPIs de Soporte**: Comando `/ticket metrics` visualiza:
  - Tiempo promedio de resolución por categoría.
  - Volumen total de tickets por período.
  - Ranking de productividad del Staff.
  - Gráficos de tendencias (próximamente).

### 📊 Monitoreo y Utilidad
* **Estado del Servidor**: Comando `/stats` que muestra en tiempo real:
  - Uso de RAM y carga de CPU (compatible con Oracle Cloud, AWS, etc).
  - Uptime del bot.
  - Almacenamiento en disco disponible.
  - Latencia de conexión a MariaDB.
* **Tarjetas de Bienvenida**: Imagen personalizada con Canvas al entrar al servidor (GTA-style font, avatar circular con neón).
* **Ping y Conectividad**: Comando `/ping` para validar latencia del bot.
* **Logs Detallados**: Sistema de auditoría que registra:
  - Mensajes editados/eliminados con autor y contenido.
  - Cambios de roles con consolidación de sesión (debounce).
  - Entradas de miembros.
  - Actividad en voz (join/leave).

---

## 🛠️ Instalación y Configuración

> **⚡ Instalación Rápida**: Si es tu primera vez, consulta la [Guía de Inicio Rápido](docs/QUICKSTART.md) para una instalación en 5 minutos.

### Requisitos Previos
- **Node.js** v18+ (recomendado v20 LTS)
- **MariaDB/MySQL 8.0+** con usuario y contraseña configurados
- **PM2** instalado globalmente (`npm install pm2 -g`)
- **Dos Tokens de Discord** (Bot General y Bot Whitelist)
- **OAuth2 Client ID y Secret** (para dashboard web)

### Instalación Básica
```bash
# Clonar repositorio
git clone https://github.com/Capinetta-RP/capinetta-discord-bot.git
cd capinetta-discord-bot

# Instalar dependencias y configurar base de datos
npm install
npx prisma generate
npx prisma db push

# Desplegar comandos slash
npm run deploy

# Iniciar en producción con PM2
npm run prod
```

Para instrucciones detalladas, troubleshooting y configuración avanzada, consulta:
- 📖 [Guía de Inicio Rápido](docs/QUICKSTART.md) - Instalación paso a paso
- 🚀 [Guía de Despliegue](docs/DEPLOYMENT_GUIDE.md) - Producción en VPS/Cloud
- ❓ [FAQ](docs/FAQ.md) - Preguntas frecuentes

---

## 📋 Comandos Disponibles

### 🏆 Gestión y Configuración

| Comando | Subcomando | Descripción | Permisos |
| :--- | :--- | :--- | :--- |
| `/setup` | - | Wizard interactivo: Configura canales de bienvenida, logs, roles, etc. | Admin |
| `/config` | - | Dashboard maestro: Ver y editar configuración en tiempo real (SelectMenus). | Admin |
| `/ticket` | `add` | Crear nueva categoría de soporte con rol(es) asignado(s). | Admin |
| | `addrole` | Agregar un rol extra para ver tickets de una categoría. | Admin |
| | `edit` | Modificar categoría (nombre, emoji, descripción, roles). | Admin |
| | `remove` | Eliminar una categoría existente. | Admin |
| | `list` | Listar todas las categorías configuradas. | Admin |
| | `panel` | Enviar panel de creación de tickets a un canal específico. | Admin |
| | `setlogs` | Configurar canal de almacenamiento de transcripts. | Admin |
| | `metrics` | Mostrar KPIs: Tiempo resolución, ranking staff, volúmenes. | Admin |
| `/set-verify` | - | Enviar panel con botón de verificación (1 min cooldown). | Admin |
| `/set-support` | - | Enviar mensaje informativo de soporte/normativa. | Admin |
| `/set-debug` | - | Redirigir canal de logs de errores rápidamente. | Admin |
| `/db-tables` | - | Diagnóstico: Mostrar conteo de registros en MariaDB por tabla. | Admin |

### ⚖️ Moderación

| Comando | Descripción | Permisos |
| :--- | :--- | :--- |
| `/warn` | Advertir a usuario. Al 3º warn: timeout automático 10min + registro DB. | Mod |
| `/reset-warns` | Limpiar contador de advertencias de un usuario. | Admin |
| `/history` | Historial completo: warns, kicks, bans con timestamps. | Mod |
| `/unmute` | Levantar sanción y restaurar TODOS los roles previos (desde DB). | Mod |
| `/kick` | Expulsar miembro con razón + auditoría en Audit Logs. | Kick |
| `/clear` | Borrado masivo de mensajes (Bulk Delete). | Manage Messages |

### 🛡️ Whitelist

| Comando | Descripción | Permisos |
| :--- | :--- | :--- |
| `/aprobar` | Aprobar solicitud WL: Envía embed personalizado a canal de resultados. | Staff |
| `/rechazar` | Rechazar solicitud WL: Envía normativa y motivo. | Staff |

### 🔧 Utilidad

| Comando | Descripción | Permisos |
| :--- | :--- | :--- |
| `/stats` | Monitor en tiempo real: CPU, RAM, uptime, almacenamiento, latencia DB. | Admin |
| `/ping` | Test de latencia bot ↔ Discord ↔ MariaDB. | Todos |

### 🎫 Tickets (Interacciones)

Las siguientes acciones se ejecutan mediante botones/selectmenus en los canales de tickets:

| Acción | Descripción |
| :--- | :--- |
| **Crear Ticket** | SelectMenu en el panel: Usuario selecciona categoría y se crea canal privado. |
| **Reclamar** (`claim_ticket`) | Staff asigna ticket a sí mismo. |
| **Transferir** (`transfer_ticket`) | Reasigna a otro miembro con UserSelectMenu. Requiere confirmación. |
| **Cerrar** (`close_ticket`) | Cierra ticket + genera transcript. Confirmación opcional. |
| **Verificación** | Botón en `/set-verify`: Otorga rol de verificado tras 1 min. |

---

## 🏗️ Arquitectura del Proyecto

```
capi-netta-rp/
├── commands/                    # Comandos slash por bot
│   ├── bot-general/
│   │   ├── admin/              # Setup, Config, Tickets, Debug
│   │   ├── moderation/         # Warn, Kick, Unmute, History
│   │   └── utility/            # Ping, Stats
│   └── bot-whitelist/
│       └── admin/              # Aprobar, Rechazar
├── events/                      # Manejadores de eventos
│   ├── bot-general/
│   │   ├── ready.js            # Inicio del bot
│   │   ├── interactionCreate.js # Router de comandos/botones/menus
│   │   ├── messageCreate.js     # Anti-spam
│   │   ├── messageDelete.js     # Auditoría
│   │   ├── messageUpdate.js     # Auditoría
│   │   ├── messageBulkDelete.js # Auditoría
│   │   ├── guildMemberAdd.js    # Bienvenida (Canvas)
│   │   ├── guildMemberUpdate.js # Cambios de rol (Debounce)
│   │   ├── guildBanAdd.js       # Auditoría de bans
│   │   ├── userUpdate.js        # Cambios de perfil
│   │   └── voiceStateUpdate.js  # Actividad en voz
│   └── bot-whitelist/
│       ├── ready.js
│       └── interactionCreate.js
├── handlers/
│   ├── commandHandler.js        # Cargador dinámico de comandos
│   └── eventHandler.js          # Cargador dinámico de eventos
├── utils/
│   ├── database.js              # Conexión Prisma + MariaDB
│   ├── dataHandler.js           # CRUD: Guilds, Users, Warnings, etc.
│   ├── logger.js                # Sistema de logs
│   ├── permissions.js           # Validación de permisos
│   └── tickets/                 # Módulo de Tickets (aislado)
│       ├── index.js             # Exports principales
│       ├── controllers/         # Lógica de ruteo
│       ├── handlers/            # Handlers de categorías, paneles, métricas
│       ├── views/               # Embeds y componentes
│       └── db/                  # Queries específicas de tickets
├── web/
│   ├── dashboard.js             # Servidor Express (Autenticación OAuth2)
│   ├── public/
│   │   ├── style.css
│   │   └── js/
│   └── views/                   # Templates EJS
├── prisma/
│   └── schema.prisma            # Esquema de DB (ORM Prisma)
├── index-general.js             # Punto de entrada Bot General
├── index-whitelist.js           # Punto de entrada Bot Whitelist
├── ecosystem.config.js          # Configuración PM2
└── config.js                    # Variables globales
```

## 📊 Flujos Principales

### 1. Anti-Spam
```
messageCreate.js → Detecta 1 + 3 mensajes iguales y da warn. Al 3er warn:
                → Guarda roles en DB
                → Mueve a zona de aislamiento
                → Ejecuta bulkDelete
```

### 2. Tickets
```
interactionCreate.js → SelectMenu (categoría)
                    → controllers/router.js
                    → handlers/panelHandlers.js
                    → Crea canal privado con roles
                    → generateTranscript al cerrar
```

### 3. Auditoría
```
messageDelete.js / guildMemberUpdate.js
        → logger.js (sendLog)
        → Envía embed al canal de logs
        → Registra en DB
```

### 4. Dashboard Web
```
dashboard.js (Express)
    → Passport Discord OAuth2
    → Redis caching (usuarios, stats, métricas)
    → Background jobs automáticos:
        - Limpieza de logs >30 días
        - Actualización de perfiles de usuario
    → prisma (consultas)
    → EJS templates
    → SelectMenus/Inputs dinámicos
```

---

## 🔑 Características Técnicas Avanzadas

### Seguridad
- **CORS + Helmet**: Headers de seguridad HTTP.
- **CSP con Nonces**: Content Security Policy dinámico con tokens únicos por request (sin `unsafe-inline`).
- **Rate Limiting**: Límite de requests en dashboard.
- **Sessions Seguras**: Express-session con cookies HTTPOnly.
- **Validación de Permisos**: Check Audit Logs + PermissionBits.

### Rendimiento
- **Redis Caching**: Sistema de caché distribuido para datos de usuarios, estadísticas y métricas del dashboard.
- **Background Jobs**: Tareas programadas para limpieza automática de logs antiguos (>30 días) y actualización de perfiles.
- **Debounce en Cambios de Rol**: Consolida múltiples eventos en 1 log.
- **Caching de Configuración**: getGuildSettings con caché opcional y TTL configurable.
- **Bulk Operations**: bulkDelete para limpiar spam.
- **Async/Await**: Manejo eficiente de promesas.

### Database (Prisma ORM)
- **Migraciones Automáticas**: `prisma db push`.
- **Relaciones**: Guild ↔ Guild Settings, User ↔ Warnings, Tickets ↔ Categories.
- **Indices**: Optimizados para queries frecuentes.

### Escalabilidad
- **Multi-Bot**: Sistema independiente para General y Whitelist.
- **Multi-Servidor**: Cada guild tiene sus propias configuraciones/logs.
- **PM2 Clustering**: Reinicio automático y gestión de procesos.

---

## 🚀 Despliegue en Producción

Para desplegar el sistema en producción, consulta la [Guía de Despliegue Completa](docs/DEPLOYMENT_GUIDE.md) que incluye:

- **VPS/Cloud** (DigitalOcean, Linode, AWS, etc.)
- **Oracle Cloud Free Tier** (recomendado - gratis permanente)
- **Docker + Docker Compose**
- **Configuración de Nginx/Apache como reverse proxy**
- **SSL/TLS con Let's Encrypt**
- **Monitoreo y mantenimiento**

### Opciones Rápidas

| Plataforma | Costo | Recursos | Guía |
|:-----------|:------|:---------|:-----|
| Oracle Cloud Free Tier | **Gratis** | 2 vCPU, 12GB RAM, 200GB | [Deployment Guide](docs/DEPLOYMENT_GUIDE.md#oracle-cloud) |
| VPS Básico | ~$5-10/mes | 1-2 vCPU, 2-4GB RAM | [Deployment Guide](docs/DEPLOYMENT_GUIDE.md#vps) |
| Docker Local | Gratis | Según host | [Deployment Guide](docs/DEPLOYMENT_GUIDE.md#docker) |

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Consulta la [Guía de Contribución](docs/CONTRIBUTING.md) para:

- Estándares de código y estilo
- Proceso de Pull Request
- Estructura del proyecto
- Cómo reportar bugs o sugerir features

---


## 📝 Licencia

Copyright (c) 2026 Capi Netta RP - MIT License

Eres libre de usar, modificar y distribuir este código bajo los términos de la licencia MIT. Solo se requiere mención del autor original.

⚠️ **Nota Importante**: Este es un proyecto específico para **Capi Netta RP**. Si deseas usar este código como base para tu propio proyecto, eres libre de hacerlo bajo MIT, pero asegúrate de atribuir el trabajo original.

---

## 📞 Soporte

- 🌐 **Sitio Web**: [www.capinettarp.com.ar](https://www.capinettarp.com.ar)
- 📖 **Documentación**: [docs/INDEX.md](docs/INDEX.md) - Centro de documentación
- 🐛 **Issues**: [GitHub Issues](https://github.com/Capinetta-RP/capinetta-discord-bot/issues) para bugs y sugerencias
- 💬 **Discord**: [Únete a Capi Netta RP](https://discord.gg/tpxRFHugX7)
- 🔒 **Seguridad**: [Reportar vulnerabilidades](docs/SECURITY.md)

---

## 🙏 Agradecimientos

Gracias a:
- **discord.js**: Librería base.
- **Prisma**: ORM moderno y tipado.
- **Canvas**: Generación de imágenes dinámicas.
- **PM2**: Gestión de procesos en producción.
- La comunidad de Discord.js por tutoriales y ejemplos.

---

**Última actualización**: 2 de febrero de 2026  
**Versión**: 1.0.0  
**Node.js**: v18+  
**MariaDB**: 8.0+