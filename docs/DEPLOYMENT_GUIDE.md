# 🚀 Guía de Despliegue

Instrucciones detalladas para desplegar **Capi Netta RP** en diferentes plataformas.

---

## 📋 Tabla de Contenidos

- [Oracle Cloud (Recomendado)](#oracle-cloud-recomendado)
- [DigitalOcean](#digitalocean)
- [Linode](#linode)
- [Docker](#docker)
- [Servidor Local](#servidor-local)
- [Solución de Problemas](#solución-de-problemas)

---

## Oracle Cloud (Recomendado)

### ✅ Por Qué Oracle Cloud?
- 🆓 **Gratis para siempre** (Always Free Tier)
- 💪 **Potente**: 2 vCPU, 12GB RAM, 200GB SSD
- 🌍 **Confiable**: Cloud de Oracle
- 📊 **Compatible**: `/stats` detecta Oracle Cloud automáticamente

### 📋 Requisitos
- Cuenta Oracle (gratis)
- Tarjeta de crédito para verificación (no se cobra)

### 🔧 Instalación (30 minutos)

#### 1. Crear Instancia
```bash
# Ve a Oracle Cloud Console
# Compute → Instances → Create Instance

# Configuración:
- Image: Ubuntu 22.04 (Always Free eligible)
- Shape: Ampere (ARM) A1 Compute (4 OCPUs, 24GB RAM)
- Storage: 200GB (máximo free)
- Network: Create new VCN
- Boot Volume: 50GB

# Genera SSH Key:
- Download private key file
- Guarda en ~/.ssh/capi-netta.key
chmod 600 ~/.ssh/capi-netta.key
```

#### 2. Configurar Firewall
```bash
# En Oracle Cloud Console:
# VCN → Security Lists → Agregar Ingress Rules

# Agregar:
- TCP 22 (SSH) desde 0.0.0.0/0
- TCP 3000 (Dashboard) desde 0.0.0.0/0
- TCP 3306 (MySQL) desde IP_PRIVADA_SOLO

# O simplemente permitir todo si es desarrollo:
- All Protocols desde 0.0.0.0/0
```

#### 3. SSH a la Instancia
```bash
# Obtén IP pública de Oracle Cloud Console
ssh -i ~/.ssh/capi-netta.key ubuntu@PUBLIC_IP

# Primera conexión aceptará la huella digital
```

#### 4. Instalar Dependencias
```bash
sudo apt update
sudo apt upgrade -y

# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MariaDB
sudo apt install -y mariadb-server mariadb-client

# PM2 global
sudo npm install -g pm2

# Git
sudo apt install -y git

# Verificar
node --version  # v20.x.x
npm --version   # 10.x.x
mysql --version
```

#### 5. Configurar MariaDB
```bash
sudo mysql_secure_installation
# Sigue los prompts (recomenda: Y para todas)

# Crear base de datos
sudo mysql -u root << EOF
CREATE DATABASE capi_netta;
CREATE USER 'capi'@'localhost' IDENTIFIED BY 'tu_contraseña_fuerte';
GRANT ALL PRIVILEGES ON capi_netta.* TO 'capi'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF

# Iniciar servicio
sudo systemctl start mariadb
sudo systemctl enable mariadb
```

#### 6. Clonar y Configurar Proyecto
```bash
cd /opt
sudo git clone https://github.com/Capinetta-RP/capinetta-discord-bot.git
sudo chown -R ubuntu:ubuntu capinetta-discord-bot
cd capinetta-discord-bot

# Crear .env
nano .env
# Pega y edita:
BOT_TOKEN_GENERAL=tu_token_aqui
BOT_TOKEN_WHITELIST=tu_token_aqui
DB_HOST=localhost
DB_USER=capi
DB_PASSWORD=tu_contraseña_fuerte
DB_NAME=capi_netta
NODE_ENV=production
```

#### 7. Instalar y Deploy
```bash
npm install
npx prisma generate
npx prisma db push

npm run deploy:general
npm run deploy:whitelist
```

#### 8. Iniciar con PM2
```bash
npm run prod

# Configurar para que reinicie al rebootear
pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save
```

#### 9. (Opcional) SSL con Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx

# Si tienes dominio
sudo certbot certonly --standalone -d tudominio.com

# Edita nginx para proxy HTTPS
# (Si está usando Nginx en frente)
```

#### 10. Verificar Despliegue
```bash
# Ver bots corriendo
pm2 list

# Ver logs
pm2 logs

# Ver stats
pm2 monit

# Acceder dashboard
# http://PUBLIC_IP:3000
```

### 💡 Tips Oracle Cloud
- Usa siempre instancias "Always Free eligible"
- Monitorea uso de recursos en Oracle Console
- Configura alertas de facturación
- Realiza backups regulares

---

## DigitalOcean

### 💰 Costos
- **Droplet**: $5-12/mes (512MB-2GB RAM)
- **Managed DB**: $15+/mes (recomendado)
- **Total**: ~$20-30/mes

### 🔧 Instalación

#### 1. Crear Droplet
```bash
# En DigitalOcean Console:
- Image: Ubuntu 22.04 LTS
- Size: Basic, $6/mes (1GB RAM, 25GB SSD)
- Region: Más cercano a ti
- SSH Key: Configura público
- Nombre: capi-netta-rp
```

#### 2. SSH Inicial
```bash
ssh root@DROPLET_IP

# Actualizar
apt update && apt upgrade -y
```

#### 3. Crear Usuario (no usar root)
```bash
adduser capi_user
usermod -aG sudo capi_user

# Configurar SSH key para nuevo usuario
# (Copiar authorized_keys)

# Salir y reconectar como capi_user
exit
ssh capi_user@DROPLET_IP
```

#### 4. Instalar Software (igual que Oracle)
Ver sección Oracle Cloud pasos 4-8, es idéntico.

#### 5. Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 3306/tcp
sudo ufw enable
```

#### 6. (Recomendado) Managed Database
```bash
# En DigitalOcean:
- Create → Databases → MySQL
- Size: Basic $15/mes
- Obtén connection string
- Actualiza .env con credentials
```

---

## Linode

### 💰 Costos
- **Linode**: $5-10/mes (1GB-4GB RAM)
- **NodeBalancer**: $10+/mes (opcional)
- **Backup**: Incluido

### 🔧 Instalación

Muy similar a DigitalOcean. 

#### Pasos Clave:
```bash
# 1. Crear Linode
# - Image: Ubuntu 22.04 LTS
# - Region: Cercano
# - Plan: Nanode $5/mes

# 2. SSH como root
ssh root@LINODE_IP

# 3. Crear usuario no-root (como DigitalOcean)
adduser capi_user
usermod -aG sudo capi_user

# 4. Instalar software (igual que Oracle/DigitalOcean)

# 5. Firewall (UFW)
sudo ufw allow 22
sudo ufw allow 3000
sudo ufw enable
```

---

## Docker

### 📦 Crear Imagen Docker

#### 1. Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Dependencias del sistema
RUN apk add --no-cache mariadb-client

# Copiar archivos
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Prisma
RUN npx prisma generate

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Comando
CMD ["node", "index-general.js"]
```

#### 2. Docker Compose
```yaml
version: '3.8'

services:
  mariadb:
    image: mariadb:latest
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: capi_netta
      MYSQL_USER: capi
      MYSQL_PASSWORD: capi_password
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  capi-general:
    build: .
    environment:
      BOT_TOKEN_GENERAL: ${BOT_TOKEN_GENERAL}
      BOT_TOKEN_WHITELIST: ${BOT_TOKEN_WHITELIST}
      DB_HOST: mariadb
      DB_USER: capi
      DB_PASSWORD: capi_password
      DB_NAME: capi_netta
      NODE_ENV: production
    depends_on:
      mariadb:
        condition: service_healthy
    restart: unless-stopped

  capi-whitelist:
    build: .
    environment:
      BOT_TOKEN_WHITELIST: ${BOT_TOKEN_WHITELIST}
      DB_HOST: mariadb
      # ... rest of env vars
    depends_on:
      mariadb:
        condition: service_healthy
    restart: unless-stopped

volumes:
  mysql_data:
```

#### 3. Ejecutar
```bash
# Crear .env.docker (con variables)
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down

# Rebuild
docker-compose up -d --build
```

---

## Servidor Local

Para desarrollo y testing.

### Requisitos
- Node.js v20+
- MariaDB/MySQL local
- PM2 (opcional)

### Instalación
```bash
# 1. Clonar
git clone https://github.com/Capinetta-RP/capinetta-discord-bot.git
cd capinetta-discord-bot

# 2. Crear .env (copiar de .env.example)
cp .env.example .env
nano .env

# 3. Instalar
npm install

# 4. Configurar BD
mysql -u root -p < schema.sql  # si existe
npx prisma db push

# 5. Deploy comandos
npm run deploy:general

# 6. Ejecutar
npm start

# O con PM2
npm run prod
```

---

## 🔒 Checklist de Seguridad Pre-Producción

- [ ] `.env` no está en `.gitignore` (verificar: `git check-ignore .env`)
- [ ] Tokens son únicos y seguros (regenerados si fue necesario)
- [ ] Base de datos tiene contraseña fuerte
- [ ] Firewall solo permite puertos necesarios
- [ ] SSH usa key-based auth (no password)
- [ ] HTTPS habilitado (si es web-facing)
- [ ] Backups automáticos configurados
- [ ] Logs rotados para no llenar disco
- [ ] Monitoreo de recursos habilitado
- [ ] Plan de disaster recovery

---

## 📊 Monitoreo Post-Despliegue

### Con PM2
```bash
pm2 monit
pm2 logs
pm2 save  # Guardar config
pm2 startup  # Arrancar en reboot
```

### Healthchecks
```bash
# Verificar API
curl http://localhost:3000/health

# Verificar BD
mysql -u root -p -e "SELECT 1 FROM capi_netta.Guild LIMIT 1;"

# Verificar bot
# Ejecutar comando en Discord: /ping
```

### Alertas Recomendadas
- CPU > 80%
- RAM > 90%
- Disco > 85%
- BD desconectada
- Bot offline

---

## 🔄 Backup y Recuperación

### Backup Automático
```bash
# Script diario (cron)
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mysqldump -u capi -p$DB_PASSWORD capi_netta > $BACKUP_DIR/capi_$TIMESTAMP.sql

# Guardar solo últimos 30 días
find $BACKUP_DIR -name "capi_*.sql" -mtime +30 -delete
```

### Recuperación
```bash
# Restaurar backup
mysql -u capi -p$DB_PASSWORD capi_netta < /backups/capi_TIMESTAMP.sql
```

---

## 🚨 Solución de Problemas

### Bot no inicia
```bash
# Ver error completo
pm2 logs --lines 100

# Verificar sintaxis
node -c index-general.js

# Recrear node_modules
rm -rf node_modules
npm install
```

### Conexión BD falla
```bash
# Verificar credenciales
mysql -u capi -p$PASSWORD -h localhost

# Verificar que servicio corre
systemctl status mariadb

# Reiniciar
systemctl restart mariadb
```

### Alto uso de CPU/RAM
```bash
# Análisis de procesos
top
ps aux

# Memory leaks
node --inspect index-general.js
# Ir a chrome://inspect
```

---

## 📞 Soporte

¿Problemas?
- 📖 Ver [README](../README.md)
- ⚡ Ver [QUICKSTART.md](QUICKSTART.md)
- 🐛 [Issues GitHub](https://github.com/Capinetta-RP/capinetta-discord-bot/issues)
- 💭 [Servidor Discord](https://discord.gg/tpxRFHugX7)

---

**Última actualización**: 29 de enero de 2026
