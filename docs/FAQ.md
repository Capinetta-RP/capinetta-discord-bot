# ❓ Preguntas Frecuentes (FAQ)

Respuestas a las preguntas más comunes sobre **Capi Netta RP**.

---

## 🎯 Preguntas Generales

### ¿Qué es Capi Netta RP?
**Capi Netta RP** es un sistema modular de gestión para servidores Discord de Roleplay. Incluye:
- Sistema de anti-spam automático
- Moderación inteligente (warns, kicks, bans)
- Gestor de tickets profesional
- Dashboard web interactivo
- Auditoría completa
- Tarjetas de bienvenida personalizadas

### ¿Es gratis?
**Sí, completamente gratis.** El proyecto usa licencia MIT.

### ¿Cuál es la licencia?
**MIT License** - Eres libre de usar, modificar y distribuir. Ver [LICENSE](../LICENSE.MD)

### ¿Está en mantenimiento activo?
**Sí.** La última versión es v1.0.0 (30 de enero de 2026) con actualizaciones regulares.

### ¿Puedo usarlo en mi servidor?
Este sistema fue desarrollado específicamente para **Capi Netta RP**, pero al ser código abierto (MIT License) puedes adaptarlo para tu servidor. Ten en cuenta que algunas configuraciones están optimizadas para este servidor y requerirán ajustes.

---

## 🛠️ Instalación y Configuración

### ¿Cuáles son los requisitos mínimos?
```
- Node.js v18+ (recomendado v20 LTS)
- MariaDB/MySQL 8.0+
- PM2 (para producción)
- Dos bots Discord
```

Ver [QUICKSTART.md](QUICKSTART.md) para guía rápida.

### ¿Cuánto tiempo toma instalar?
**~5 minutos** si tienes todo preparado (MariaDB corriendo, tokens listos).

### ¿Necesito dos bots?
**Sí.** Uno para el Bot General (moderación, tickets, etc.) y otro para el Whitelist.

Puedes desactivar el bot de whitelist si no lo necesitas.

### ¿Puedo usar un solo bot?
**No recomendado.** El sistema está diseñado para dos bots separados para mejor organización.

Sin embargo, puedes:
- Usar un bot para ambos (editar `index-general.js` y `index-whitelist.js`)
- Registrar solo los comandos que necesites

### ¿Dónde obtengo los tokens?
1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Click en "New Application"
3. Ve a "Bot" → "Add Bot"
4. Click en "Reset Token"
5. Copia el token a `.env`

### ¿Cómo asigno permisos al bot?
```
Permisos necesarios:
✅ Administrator (recomendado para simplicidad)
O específicamente:
✅ Manage Guild
✅ View Channels
✅ Send Messages
✅ Manage Messages
✅ Manage Roles
✅ Manage Channels
✅ Create Public Threads
✅ Create Private Threads
✅ Embed Links
✅ Attach Files
✅ Read Message History
✅ Mention Everyone
✅ Use Slash Commands
```

### ¿Puedo cambiar los comandos?
**Sí.** Edita los archivos en `/commands/` y redeploy:
```bash
npm run deploy:general
npm run deploy:whitelist
```

---

## 📊 Base de Datos

### ¿Puedo usar PostgreSQL?
**Sí, pero requiere cambios.** Actualmente usa MariaDB con Prisma ORM.

Para cambiar a PostgreSQL:
1. Edita `prisma/schema.prisma`
2. Cambia `provider = "mysql"` a `provider = "postgresql"`
3. Actualiza `DATABASE_URL` en `.env`
4. Corre `npx prisma migrate dev`

### ¿Cómo hago un backup?
```bash
# Backup completo
mysqldump -u root -p capi_netta > backup.sql

# Restaurar
mysql -u root -p capi_netta < backup.sql
```

O automatiza con cron (Linux):
```bash
# Diariamente a las 2 AM
0 2 * * * mysqldump -u root -p capi_netta > /backups/backup_$(date +%Y%m%d).sql
```

### ¿Dónde se guardan los datos?
Todos en MariaDB, tablas sincronizadas:
- `Guild` - Configuración del servidor
- `GuildUser` - Usuarios del servidor
- `Warning` - Advertencias
- `Ticket` - Datos de tickets
- Etc.

Ver `prisma/schema.prisma` para esquema completo.

---

## 🎫 Sistema de Tickets

### ¿Cómo creo una categoría de tickets?
```
/ticket add nombre_categoria 🎫 @rol_staff descripcion
```

Ejemplo:
```
/ticket add Soporte 🔧 @Staff Support technical issues
```

### ¿Puedo tener múltiples roles en tickets?
**Sí.** Usa `/ticket addrole` para agregar roles adicionales.

```
/ticket addrole Soporte @Moderators
```

Ahora ambos roles (Staff y Moderators) pueden ver tickets de Soporte.

### ¿Qué sucede cuando cierro un ticket?
1. Se genera un transcript automático
2. Se envía por DM al usuario
3. Se archiva en el canal de logs
4. El canal de ticket se elimina después de 5 segundos

### ¿Puedo restaurar un ticket cerrado?
**No automáticamente.** El transcript está archivado, pero no puedes reabrir el canal.

Puedes crear uno nuevo manualmente si es necesario.

### ¿Dónde se guardan los transcripts?
- **Archivos**: Canal configurado con `/ticket setlogs`
- **DB**: Información en tabla `Ticket`
- **Usuario**: Copia en DM

---

## ⚖️ Moderación

### ¿Cómo funciona el sistema de advertencias?
1. `/warn @usuario razón`
2. Se registra en DB
3. Al 1er y 2do warn: Solo aviso
4. Al 3er warn: Timeout automático de 10 minutos + log

### ¿Cómo restauro roles después de un timeout?
```
/unmute @usuario
```

El bot automáticamente:
1. Busca roles en DB
2. Los restaura todos
3. Registra en logs

### ¿Puedo limpiar advertencias?
**Sí.**
```
/reset-warns @usuario
```

Esto resetea el contador a 0. El historial se mantiene en `/history`.

### ¿Qué pasa si alguien es baneado?
1. Se registra el ban con executor
2. Se manda log al canal
3. Se guarda razón en `/history`
4. El miembro ya no puede acceder

---

## 🛡️ Seguridad y Anti-Spam

### ¿Cómo funciona el anti-spam?
Detecta automáticamente:
- 10+ menciones simultáneas → Aislamiento
- Spam masivo → BulkDelete
- Cuentas nuevas (<7 días) → Expulsión automática

### ¿Puedo configurar el umbral de spam?
**No actualmente.** Está hardcodeado en `messageCreate.js`.

Para cambiar, edita:
```javascript
// En events/bot-general/messageCreate.js
const MENTION_THRESHOLD = 10; // Cambiar este valor
const AGE_THRESHOLD = 7; // Días mínimos de antigüedad
```

### ¿Qué es la "zona de aislamiento"?
Un rol/canal donde se mueven usuarios sospechosos. Tienen acceso limitado mientras se verifica.

Se configura con `/setup` al iniciar.

### ¿Se perdonan automáticamente?
**No.** Un admin debe usar `/unmute` para restaurar roles.

---

## 🌐 Dashboard Web

### ¿Cómo accedo al dashboard?
```
http://localhost:3000
```

Necesitas autenticarte con Discord (OAuth2).

### ¿Por qué pide autenticación?
Por seguridad. Solo admins del servidor pueden ver/editar configuración.

### ¿Puedo cambiar el puerto?
**Sí.** En `.env`:
```env
PORT=8080
```

Luego accede en `http://localhost:8080`

### ¿Funcionará detrás de Nginx/Reverse Proxy?
**Sí.** Configurado con `trust proxy`. Solo asegúrate que:
```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
```

### ¿Puedo desplegar en producción?
**Sí.** Ve [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) sección "Despliegue en Producción".

Opciones:
- VPS (DigitalOcean, Linode, etc)
- Oracle Cloud Free Tier (recomendado)
- Docker + Kubernetes

---

## 🚀 Despliegue y Producción

### ¿Cuál es la mejor forma de desplegar?
**Recomendado**: Oracle Cloud Free Tier + PM2
- 2 vCPU Always Free
- 12GB RAM
- 200GB almacenamiento
- Gratis por tiempo ilimitado

### ¿Qué es PM2?
Gestor de procesos Node.js que:
- Reinicia automáticamente el bot si cae
- Gestiona logs
- Permite clustering
- Monitoreo en tiempo real

### ¿Cómo verifico que los bots están corriendo?
```bash
pm2 list
pm2 logs
pm2 monit
```

### ¿Puedo tener uptime 24/7?
**Sí.** Usa PM2 con reinicio automático.

Ver `ecosystem.config.js` para configuración.

### ¿Cuánto costo?
**Gratis si usas:**
- Oracle Cloud Free Tier (recomendado)
- VPS barato ($5-10/mes)

**Pagos:**
- Base de datos: ~$0-15/mes
- VPS: ~$5-30/mes
- Total: ~$10-50/mes máximo

---

## 🐛 Problemas Comunes

### El bot no responde a comandos
```bash
# 1. Verificar que está online
pm2 logs

# 2. Redeploy comandos
npm run deploy:general

# 3. Verificar permisos en Discord
# El bot necesita "Usar Slash Commands" en el canal
```

### "Cannot find module"
```bash
npm install
```

### Error de conexión a BD
```bash
# Verificar que MariaDB está corriendo
mysql -u root -p

# Si no, iniciar servicio
# Windows: services.msc
# Linux: sudo systemctl start mariadb
```

### Bot está lento
```bash
# Optimización:
1. Actualizar índices en BD
2. Limpiar logs viejos
3. Aumentar recursos (RAM/CPU)
4. Verificar conexión de internet
```

### Los logs no aparecen
```bash
# Verificar canal de logs
/set-debug #canal_logs

# O manualmente en dashboard: /config
```

---

## 💡 Tips y Trucos

### Crear alias de comandos
Edita `commandHandler.js` para crear accesos directos:
```javascript
// /setup también funciona como /config
```

### Personalizar mensajes de error
Edita `logger.js` para cambiar emojis y formatos.

### Agregar reacciones automáticas
En `messageCreate.js` puedes agregar lógica para reaccionar a mensajes específicos.

### Crear roles automáticos
Planificado para v2.1. Mientras tanto, puedes:
```bash
/set-verify
# Configurar rol de verificado automático
```

---

¿Tu pregunta no está aquí?

- 📖 Lee [README](../README.md) completo
- ⚡ Ve [QUICKSTART.md](QUICKSTART.md) para inicio rápido
- 🐛 Abre un [Issue](https://github.com/Capinetta-RP/capinetta-discord-bot/issues)
- 💬 Crea una [Discussion](https://github.com/Capinetta-RP/capinetta-discord-bot/discussions)
- 🔒 Security: [SECURITY.md](SECURITY.md)

---

**Última actualización**: 2 de febrero de 2026
