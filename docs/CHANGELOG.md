# 📜 Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), 
y este proyecto adhiere al [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-01-30

### ✨ Agregado

#### 🎫 Sistema de Tickets Completo
- Creación dinámica de categorías con `/ticket add/edit/remove`
- Panel interactivo con selectmenu para crear tickets
- Comandos de gestión: `claim`, `transfer`, `close`
- Generación automática de transcripts al cerrar
- Logs centralizados con `/ticket setlogs`
- KPIs y métricas con `/ticket metrics`
- Soporte para múltiples roles por categoría (`/ticket addrole`)

#### 🛡️ Seguridad Mejorada
- Detección avanzada de menciones masivas (10+ menciones)
- Sistema de aislamiento con almacenamiento de roles en DB
- Bulkdelete automático para spam
- Validación de edad de cuenta (7 días mínimo)
- Auditoría completa de eventos del servidor

#### 📊 Monitoreo y Estadísticas
- Comando `/stats` con información en tiempo real
- Detección automática de plataforma (Oracle Cloud, AWS, etc.)
- Tarjetas de bienvenida personalizadas con Canvas
- Logs consolidados de cambios de rol (debounce)

#### 🌐 Dashboard Web
- Servidor Express con autenticación OAuth2 de Discord
- Panel interactivo para configuración de servidor
- Gestión de permisos basada en roles Discord
- Rate limiting y headers de seguridad

#### 📝 Moderación Completa
- Sistema de advertencias con timeout automático al 3º warn
- Comando `/history` para historial completo de sanciones
- Restauración de roles con `/unmute`
- Comando `/reset-warns` para limpiar contadores
- Integración con Audit Logs de Discord

### 🔧 Cambios Técnicos

- **ORM**: Migración a Prisma 5.10.0 para mejor tipado
- **DB**: Optimización de esquema con índices
- **Autenticación**: Passport.js con estrategia Discord OAuth2
- **Canvas**: Generación dinámica de imágenes de bienvenida
- **Seguridad**: Helmet.js para headers HTTP, Rate limiting
- **PM2**: Configuración de clustering y reinicio automático

### 📚 Documentación

- README.md completamente reescrito y ampliado
- CONTRIBUTING.md con guía detallada
- Estructura de proyecto documentada
- Exemplos de configuración (.env.example)

### 🐛 Arreglado

- Falsos positivos en detección de spam
- Race conditions en cambios de rol
- Memory leaks en event listeners
- Manejo de errores en bulkDelete

### 📦 Dependencias

```json
{
  "discord.js": "^14.13.0",
  "@prisma/client": "^5.10.0",
  "express": "^4.18.2",
  "canvas": "^2.11.2",
  "passport": "^0.7.0",
  "helmet": "^7.1.0",
  "discord-html-transcripts": "^3.2.0"
}
```

---

## [Próximas Características]

### En Desarrollo 🚧
- [ ] Dashboard con gráficos (Chart.js)
- [ ] Comandos de música
- [ ] Sistema de roles automáticos
- [ ] Integración con Twitch/YouTube
- [ ] API REST para terceros
- [ ] Soporte para 2FA
- [ ] Backup automático de DB
- [ ] Docker compose configuration

### Planificado 📋
- [ ] Sistema de experiencia/niveles
- [ ] Tienda de items personalizados
- [ ] Eventos del servidor automáticos
- [ ] Integración con bots externos
- [ ] Web panel mejorado

---

## Notas de Actualización

### Instalación Inicial v1.0.0

```bash
# 1. Clonar repositorio
git clone https://github.com/Capinetta-RP/capinetta-discord-bot.git

git clone https://github.com/Capinetta-RP/capinetta-discord-bot.git
cd capinetta-discord-bot

# 2. Instalar dependencias
npm install

# 3. Configurar .env
cp .env.example .env
# Editar .env con tus credenciales

# 4. Generar cliente Prisma
npx prisma generate

# 4. Generar cliente Prisma
npx prisma generate

# 5. Ejecutar migraciones
npx prisma db push

# 6. Deploy de comandos
npm run deploy

# 7. Iniciar bots
npm run prod
```

---

## Convención de Cambios

- ✨ **Agregado** - Nuevas características
- 🔧 **Cambios** - Cambios en características existentes
- 🐛 **Arreglado** - Correcciones de bugs
- ⚠️ **Deprecado** - Características que pronto serán removidas
- 🗑️ **Removido** - Características removidas
- 🔒 **Seguridad** - Parches de seguridad
- 📚 **Documentación** - Cambios en docs
- 🚀 **Rendimiento** - Mejoras de performance

---

## Preguntas o Sugerencias

Si tienes ideas para nuevas características o encuentras bugs, abre un issue en [GitHub Issues](https://github.com/Capinetta-RP/capinetta-discord-bot/issues).

---

**Última actualización**: 30 de enero de 2026
