# 🔒 Política de Seguridad

## Reportar Vulnerabilidades de Seguridad

**⚠️ No abras un issue público si encontraste una vulnerabilidad de seguridad.**

Por favor, reporta vulnerabilidades de seguridad **en privado** a través de:

📧 **Discord**: Envía DM al mantenedor en [Capi Netta RP Discord](https://discord.gg/tpxRFHugX7)

O utiliza las **Security Advisories** de GitHub:
1. Ve a [Security](https://github.com/Capinetta-RP/capinetta-discord-bot/security/advisories)
2. Click en "Report a vulnerability"
3. Completa el formulario con detalles

### Qué incluir en tu reporte

```
- Descripción clara de la vulnerabilidad
- Pasos para reproducirla
- Impacto potencial (severidad)
- Tu información de contacto (opcional)
- Crédito deseado (por favor, menciona cómo quieres ser creditado)
```

---

## Proceso de Respuesta

1. **Confirmación** (24-48 horas): Recibirás confirmación de recepción
2. **Investigación** (3-7 días): Analizamos el problema
3. **Parche** (7-30 días): Desarrollamos y testeamos la solución
4. **Release**: Lanzamos versión de seguridad
5. **Disclosure**: Publicamos detalles después del release

---

## Prácticas de Seguridad

### Backend (Discord.js Bot)

✅ **Implementado**
- Validación de permisos en cada comando
- Tokens almacenados en variables de entorno
- Rate limiting en eventos críticos
- Validación de inputs
- Error handling seguro (sin exponer datos sensibles)
- Auditoría de acciones administrativas

❌ **A Evitar**
- Almacenar tokens en código
- Usar `eval()` en comandos
- Confiar únicamente en checks del lado del cliente
- Exponer errores internos a usuarios finales
- Cachear datos sensibles sin expiración

### Base de Datos

✅ **Implementado**
- Contraseñas hasheadas (no aplicable aquí, pero si se agrega autenticación)
- Queries preparadas con Prisma ORM
- Backup automático recomendado
- Restricción de permisos de usuario DB

❌ **A Evitar**
- SQL injection (evitado con Prisma)
- Almacenar contraseñas en texto plano
- Credenciales DB en repositorio
- Acceso DB sin autenticación

### Dashboard Web

✅ **Implementado**
- OAuth2 Discord obligatorio
- Headers de seguridad (Helmet.js)
- Sessions seguras (HTTPOnly cookies)
- CORS configurado
- Rate limiting
- HTTPS recomendado en producción

❌ **A Evitar**
- Credenciales en URLs
- Endpoints sin autenticación
- Almacenar tokens en localStorage
- Confiar en tokens expirados

### Secretos y Configuración Segura

**IMPORTANTE**: Los secretos **NUNCA van en el código JavaScript**. Deben estar en el archivo `.env` que NO se commitea.

#### ❌ INCORRECTO (NO HAGAS ESTO)
```javascript
// En index.js
const TOKEN = "xoxb_tu_token_aqui_1234567890";
const DB_PASSWORD = "micontraseña123";
```

Este código **expone tus secretos** si lo subes a GitHub.

#### ✅ CORRECTO (SIEMPRE HAZLO ASÍ)

**1. Crea archivo `.env` en la raíz** (NO se commitea, está en `.gitignore`):
```env
BOT_TOKEN_GENERAL=xoxb_tu_token_general_aqui
BOT_TOKEN_WHITELIST=xoxb_tu_token_whitelist_aqui
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_aqui
DB_NAME=capi_netta
DISCORD_CLIENT_ID=tu_client_id_aqui
DISCORD_CLIENT_SECRET=tu_client_secret_aqui
```

**2. En tu código, usa variables de entorno**:
```javascript
// En index.js
const TOKEN = process.env.BOT_TOKEN_GENERAL;
const DB_PASSWORD = process.env.DB_PASSWORD;
```

#### Checklist de Seguridad
- ✅ `.env` creado y con valores reales
- ✅ `.env` está en `.gitignore` (verificar: `git check-ignore .env`)
- ✅ `.env.example` en el repo SIN secretos reales (solo placeholders)
- ✅ Nunca commitear `.env`

---

## Dependencias Vulnerables

Revisamos periódicamente vulnerabilidades en dependencias:

```bash
# Auditar
npm audit

# Arreglar automáticamente (con cuidado)
npm audit fix

# Reportar CVEs nuevos
npm audit --audit-level=moderate
```

**Política**: Actualizamos dependencias críticas inmediatamente, no-críticas en próximas releases.

---

## Sincronización Segura entre Bots

- ✅ Base de datos centralizada (MariaDB)
- ✅ Eventos sincronizados por GuildId
- ✅ Validación cruzada de permisos
- ✅ Logs de todas las acciones

---

## Auditoría y Logs

Todas las acciones sensibles se registran:

- 🔐 Cambios de configuración
- ⚖️ Sanciones aplicadas
- 🎫 Creación/cierre de tickets
- 👤 Cambios de roles
- 📊 Acceso a dashboard web

Los logs se mantienen por **90 días** (configurable).

---

## Reporte de Bugs de Seguridad Previos

| Fecha | Severidad | Descripción | Estado |
| :--- | :--- | :--- | :--- |
| - | - | Aún no hay reportes públicos | - |

---

## Checklist de Seguridad para Deployments

Antes de desplegar a producción, verifica:

- [ ] `.env` actualizado con credenciales reales
- [ ] `.gitignore` contiene `.env` (no commitear secretos)
- [ ] HTTPS habilitado en dashboard
- [ ] Firewall configurado (puerto 3000 solo para tu IP si es posible)
- [ ] MariaDB con credenciales seguras
- [ ] Backup automático configurado
- [ ] `NODE_ENV=production`
- [ ] PM2 con reinicio automático habilitado
- [ ] Logs rotados para evitar llenar disco
- [ ] Monitoreo de recursos habilitado

---

## Canales de Comunicación Segura

- **Discord**: DM al mantenedor en [Capi Netta RP](https://discord.gg/tpxRFHugX7) (verificado)
- **GitHub Security Advisory**: Recomendado
- **GitHub Issues**: Para reportes públicos no-críticos

---

## Agradecimientos

Agradecemos a la comunidad de seguridad que reporta responsablemente. 

Los reportes verificados serán creditados en CHANGELOG.md (con tu consentimiento).

---

## Información Adicional

- [OWASP Top 10 - Web Application Security](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Discord.js Security Guidelines](https://discord.js.org/#/docs/discord.js/main/general/faq?scrollTo=token-leak)

---

**Última actualización**: 29 de enero de 2026
