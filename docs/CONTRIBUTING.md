# 🤝 Guía de Contribución

¡Gracias por tu interés en contribuir a **Capi Netta RP**! Este documento te guiará a través del proceso de contribución.

## 📋 Tabla de Contenidos

- [Código de Conducta](#codigo-de-conducta)
- [¿Cómo Contribuir?](#como-contribuir)
    - [1. Reportar Bugs](#1-reportar-bugs)
    - [2. Sugerir Mejoras](#2-sugerir-mejoras)
- [Pull Requests](#pull-requests)
- [Estándares de Código](#estandares-de-codigo)
- [Testing](#testing)
- [Proceso de Review](#proceso-de-review)
- [Recursos Útiles](#recursos-utiles)
- [¿Preguntas?](#preguntas)

---

<a id="codigo-de-conducta"></a>
## 📜 Código de Conducta

Este proyecto adhiere a un Código de Conducta. Al participar, esperas:

- ✅ Ser respetuoso con todos los contribuidores.
- ✅ Aceptar crítica constructiva.
- ✅ Enfocarte en lo mejor para la comunidad.
- ❌ No toleramos: spam, acoso, discriminación, o contenido inapropiado.

---

<a id="como-contribuir"></a>
## 🚀 ¿Cómo Contribuir?

<a id="1-reportar-bugs"></a>
### 1. Reportar Bugs

**Antes de reportar:**
- Verifica que el bug no exista ya en [Issues](https://github.com/Capinetta-RP/capinetta-discord-bot/issues).
- Reproduce el bug en una rama separada.
- Recopia toda la información posible.

**Formato de Issue:**
```markdown
### Descripción del Bug
Descripción clara y concisa del problema.

### Pasos para Reproducir
1. Abre...
2. Haz clic en...
3. Observa el error...

### Comportamiento Esperado
Qué debería pasar.

### Comportamiento Actual
Qué sucede realmente.

### Entorno
- Node.js: v20.10.0
- MariaDB: 8.0
- Discord.js: 14.13.0
- OS: Windows 11

### Logs/Errores
```
Pega aquí los logs completos
```

### Capturas o Video (opcional)
Adjunta si es relevante.
```

<a id="2-sugerir-mejoras"></a>
### 2. Sugerir Mejoras

**Formato de Feature Request:**
```markdown
### Descripción de la Mejora
¿Qué quieres agregar?

### Justificación
¿Por qué es útil?

### Ejemplo de Uso
Cómo se vería en acción.

### Alternativas Consideradas
Otras soluciones exploradas.
```

---

<a id="pull-requests"></a>
## 💾 Pull Requests

### Preparación

1. **Fork el repositorio**
   ```bash
   git clone https://github.com/TU_USUARIO/capinetta-discord-bot.git
   cd CapiNetta-System
   ```

2. **Crea una rama descriptiva**
   ```bash
   git checkout -b feature/descripcion-clara
   # o para bugs:
   git checkout -b fix/descripcion-del-bug
   ```

3. **Instala dependencias**
   ```bash
   npm install
   ```

4. **Haz cambios siguiendo nuestros estándares** (ver abajo)

5. **Commit con mensajes claros**
   ```bash
   git commit -m "feat: Agrega validación de permisos mejorada"
   # o
   git commit -m "fix: Corrige error en bulkDelete cuando hay 0 mensajes"
   ```

### Convención de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<scope>): <descripción>

[cuerpo opcional]

[footer opcional]
```

**Tipos:**
- `feat`: Nueva característica
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios en formato (sin lógica)
- `refactor`: Refactorización de código
- `perf`: Mejoras de rendimiento
- `test`: Agregación o modificación de tests
- `chore`: Cambios en build/deps

**Ejemplos:**
```
feat(tickets): Agrega soporte para emojis en categorías
fix(antiSpam): Corrige falsos positivos en detección
docs(README): Actualiza instrucciones de instalación
refactor(logger): Simplifica lógica de consolidación de eventos
```

### Estructura del PR

```markdown
## 📝 Descripción
Explicación clara de los cambios.

## 🔗 Issues Relacionados
Cierra #123

## 📋 Cambios
- [ ] Cambio 1
- [ ] Cambio 2
- [ ] Test added/updated
- [ ] Documentación actualizada

## 🧪 Pruebas Realizadas
Describe cómo probaste los cambios.

## 📸 Screenshots (opcional)
Si aplica.

## ✅ Checklist
- [ ] Mi código sigue los estándares de este proyecto
- [ ] He actualizado la documentación relevante
- [ ] He agregado tests si es necesario
- [ ] Los tests existentes pasan
```

---

<a id="estandares-de-codigo"></a>
## 🎨 Estándares de Código

### JavaScript/Node.js

1. **Indentación**: 4 espacios
   ```javascript
   function ejemplo() {
       const x = 1;
       return x;
   }
   ```

2. **Nomenclatura**
   ```javascript
   // Variables y funciones: camelCase
   const userName = "Tullo";
   function handleTicketCreation() {}

   // Clases y constructores: PascalCase
   class TicketManager {}

   // Constantes globales: UPPER_SNAKE_CASE
   const MAX_WARNINGS = 3;
   ```

3. **Comentarios**
   ```javascript
   /**
    * @file filename.js
    * @description Descripción del propósito del archivo.
    */

   /**
    * Descripción de la función.
    * @param {Type} paramName - Descripción del parámetro.
    * @returns {Type} Descripción del retorno.
    */
   function myFunction(paramName) {
       // Comentarios en línea para lógica compleja
   }
   ```

4. **Async/Await**
   ```javascript
   // ✅ Correcto
   async function handleTicket(interaction) {
       try {
           const result = await getTicketData(id);
           return result;
       } catch (error) {
           console.error("Error:", error);
       }
   }

   // ❌ Evitar
   function handleTicket() {
       getTicketData(id).then(result => {
           // ...
       });
   }
   ```

5. **Errores y Validación**
   ```javascript
   // ✅ Validar inputs
   if (!interaction.guild || !interaction.member) {
       return interaction.reply({ 
           content: "❌ Error: Comando debe ser usado en un servidor.",
           flags: [MessageFlags.Ephemeral] 
       });
   }

   // ✅ Manejo de errores
   try {
       // Lógica
   } catch (error) {
       console.error("Contexto del error:", error);
       logError(client, error, "Descripción");
   }
   ```

6. **Discord.js + discord-api-types**
   ```javascript
   // ✅ Usar componentes de discord.js
   const { 
       SlashCommandBuilder, 
       EmbedBuilder,
       PermissionFlagsBits 
   } = require('discord.js');

   // ✅ Validar permisos
   if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
       return interaction.reply("❌ Permisos insuficientes.");
   }
   ```

### Prisma ORM

```prisma
// ✅ Modelos bien definidos
model Guild {
    id            String        @id
    name          String
    settings      GuildSettings?
    users         GuildUser[]
    tickets       Ticket[]
    createdAt     DateTime      @default(now())
    updatedAt     DateTime      @updatedAt

    @@index([id])
}

// ❌ Evitar
model Guild {
    id      String
    data    Json    // Almacenar datos sueltos
}
```

### Estructura de Directorios

```
features/
├── commandName/
│   ├── index.js           # Export principal
│   ├── command.js         # Definición SlashCommand
│   ├── handlers.js        # Lógica (si es complejo)
│   └── types.d.ts         # Tipos TypeScript (si lo necesitas)
```

---

<a id="testing"></a>
## 🧪 Testing

### Requerimientos para PRs

- ✅ Pruebas manuales en servidor Discord.
- ✅ Validar que no rompe funcionalidad existente.
- ✅ Verificar permisos y edge cases.

### Pruebas Recomendadas

```bash
# Verificar sintaxis
npm run lint  # (si está configurado)

# Validar Prisma
npx prisma validate

# Iniciar bot en desarrollo
npm run dev
```

---

<a id="proceso-de-review"></a>
## 🔍 Proceso de Review

1. **Revisión Automática**
   - ✅ Checks de CI/CD (próximos)
   - ✅ Validación de commits

2. **Revisión Manual**
   - El mantenedor revisa el código
   - Se sugieren cambios si es necesario
   - Discusión sobre decisiones arquitectónicas

3. **Aprobación**
   - Una vez aprobado: Merge a `main`
   - Se etiqueta automáticamente en changelog

4. **Release**
   - Los cambios se incluyen en el próximo release
   - Se actualiza CHANGELOG.md

---

<a id="recursos-utiles"></a>
## 📚 Recursos Útiles

- [Discord.js Documentación](https://discord.js.org)
- [Prisma Documentación](https://www.prisma.io/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

<a id="preguntas"></a>
## 🙋 ¿Preguntas?

- Abre una [Discussion](https://github.com/Capinetta-RP/capinetta-discord-bot/discussions)
- Únete al [servidor Discord](https://discord.gg/tpxRFHugX7)
- Contacta al mantenedor en Discord

---

**¡Gracias por contribuir!** 🎉

Tu trabajo hace que Capi Netta RP sea mejor para todos.
