# ⚡ Inicio Rápido (5 minutos)

Una guía rápida para poner Capi Netta RP en funcionamiento en tu servidor Discord.

---

## 📋 Requisitos Mínimos

- ✅ Node.js v18+
- ✅ MariaDB/MySQL 8.0+ (con acceso local)
- ✅ Dos bots Discord creados
- ✅ Terminal/PowerShell/Bash

---

## 🚀 Instalación en 5 pasos

### 1️⃣ Clonar el Repositorio

```bash
git clone https://github.com/Capinetta-RP/capinetta-discord-bot.git
cd capinetta-discord-bot
```

**Tiempo**: 30 segundos

---

### 2️⃣ Configurar Variables de Entorno

Abre `.env` (o renombra `.env.example` a `.env`) y llena estos campos:

```env
# Discord Tokens (obtén en https://discord.com/developers/applications)
BOT_TOKEN_GENERAL=xoxb_tu_token_bot_general
BOT_TOKEN_WHITELIST=xoxb_tu_token_bot_whitelist

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña_mariadb
DB_NAME=capi_netta

# Optional (Dashboard Web)
DISCORD_CLIENT_ID=tu_client_id
DISCORD_CLIENT_SECRET=tu_client_secret
```

**Tiempo**: 2 minutos

---

### 3️⃣ Instalar Dependencias e Inicializar BD

```bash
npm install
npx prisma generate
npx prisma db push
```

> **Nota**: Si MariaDB no está corriendo, inicia el servicio:
> - Windows: `services.msc` → MySQL → Iniciar
> - Linux: `sudo systemctl start mariadb`
> - Mac: `brew services start mariadb-server`

**Tiempo**: 1-2 minutos

---

### 4️⃣ Registrar Comandos en Discord

```bash
npm run deploy:general
npm run deploy:whitelist
```

Deberías ver: `✅ Comandos registrados exitosamente`

**Tiempo**: 30 segundos

---

### 5️⃣ Iniciar los Bots

```bash
# Para desarrollo (logs en consola)
npm start

# O para producción (con PM2)
npm run prod
```

Busca este mensaje:
```
✅ Bot General iniciado correctamente
✅ Bot Whitelist iniciado correctamente
```

**Tiempo**: 10 segundos

---

## ✨ Primeros Pasos en tu Servidor Discord

Una vez los bots estén online:

### 1. Invitar los Bots
Obtén los links en Discord Developer Portal:
```
https://discord.com/oauth2/authorize?client_id=1461819439279243304&permissions=8&integration_type=0&scope=bot+applications.commands
```

Pega en el navegador y selecciona tu servidor. **Permisos recomendados: Administrator**

### 2. Ejecutar Setup Inicial
En cualquier canal:
```
/setup
```

El bot te guiará para:
- ✅ Establecer canal de bienvenida
- ✅ Configurar zona de aislamiento
- ✅ Definir rol de verificado

### 3. Crear Categoría de Tickets (Opcional)
```
/ticket add nombre_categoria 🔧 @rol_staff
```

### 4. Enviar Panel de Tickets
```
/ticket panel canal_actual
```

---

## 🎯 Comandos Básicos para Probar

```bash
# Ver configuración actual
/config

# Verificar latencia
/ping

# Ver estadísticas del servidor
/stats

# Historial de usuario (moderación)
/history @usuario

# Advertir a usuario
/warn @usuario razón
```

---

## 🔍 Verificar que Todo Funciona

### ✅ Bot está online
```bash
# Deberías ver en logs:
[Bot] Ready! Logged in as "Capi General#1234"
[Bot] Ready! Logged in as "Capi Whitelist#5678"
```

### ✅ Comandos registrados
```bash
# En Discord, escribe "/" y deberías ver tus comandos
/setup
/config
/warn
/ticket
```

### ✅ Database conectada
```bash
/db-tables
# Deberías ver conteos de tablas
```

### ✅ Logs funcionando
```bash
# Elimina un mensaje en el servidor
# Deberías ver el log en tu canal configurado
```

---

## 🆘 Solución de Problemas

### ❌ "Cannot find module 'discord.js'"
```bash
npm install
```

### ❌ "Connection refused" (MariaDB)
```bash
# Verifica que MariaDB está corriendo
mysql -u root -p

# Si falta, instala:
# Windows: https://mariadb.org/download/
# Linux: sudo apt install mariadb-server
# Mac: brew install mariadb
```

### ❌ "Invalid token"
- Verifica `.env` tiene tokens correctos (sin espacios)
- Recrea el token en Discord Developer Portal si cambió

### ❌ "Database does not exist"
```bash
# Crea la BD manualmente
mysql -u root -p
CREATE DATABASE capi_netta;
EXIT;

# Luego:
npx prisma db push
```

### ❌ "Bot no responde a comandos"
```bash
# Verificar permisos del bot en Discord
# El bot necesita: View Channels, Send Messages, Manage Roles

# Redeploy comandos
npm run deploy:general
npm run deploy:whitelist
```

---

## 📊 Próximos Pasos

Después de verificar que todo funciona:

1. **Lee la documentación completa** → [README](../README.md)
2. **Personaliza configuración** → `/config` dashboard
3. **Crea categorías de tickets** → `/ticket add`
4. **Configura whitelist** → Invita bot whitelist
5. **Revisa logs** → Establece canal de logs

---

## 💡 Tips

- 🔐 **Seguridad**: Mantén `.env` privado, nunca lo commitees
- 📱 **Mobile**: El dashboard web (`:3000`) es responsive
- 🐛 **Debugging**: Activa `DEBUG=true` en `.env` para logs verbosos
- 🔄 **Reiniciar**: `pm2 restart all`

---

## 📞 Necesitas Ayuda?

- 📖 Lee [README](../README.md) para documentación completa
- 🐛 Abre un [Issue](https://github.com/Capinetta-RP/capinetta-discord-bot/issues)
- 💬 Únete a nuestro [Servidor Discord](https://discord.gg/tpxRFHugX7)
- 📧 Reporta seguridad en [SECURITY.md](SECURITY.md)

---

**¡Ahora estás listo para usar Capi Netta RP! 🎉**

Si todo funcionó, prueba con algunos comandos y disfruta del sistema.

Para preguntas avanzadas, ver [README](../README.md) completo.

---

**Última actualización**: 2 de febrero de 2026
