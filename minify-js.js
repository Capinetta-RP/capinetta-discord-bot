/**
 * Script para minificar JavaScript
 * Uso: node minify-js.js
 */

const fs = require('fs');
const path = require('path');

const jsFiles = [
    { src: 'web/public/js/sidebar.js', dest: 'web/public/js/sidebar.min.js' },
    { src: 'web/public/js/dashboard-utils.js', dest: 'web/public/js/dashboard-utils.min.js' },
    { src: 'web/public/js/alerts.js', dest: 'web/public/js/alerts.min.js' },
    { src: 'web/public/js/apiManager.js', dest: 'web/public/js/apiManager.min.js' },
    { src: 'web/public/js/chartManager.js', dest: 'web/public/js/chartManager.min.js' },
    { src: 'web/public/js/logger.js', dest: 'web/public/js/logger.min.js' },
    { src: 'web/public/js/metrics.js', dest: 'web/public/js/metrics.min.js' },
    { src: 'web/public/js/statistics.js', dest: 'web/public/js/statistics.min.js' },
    { src: 'web/public/js/pages/canales.js', dest: 'web/public/js/pages/canales.min.js' },
    { src: 'web/public/js/pages/roles.js', dest: 'web/public/js/pages/roles.min.js' }
];

let totalOriginal = 0;
let totalMinified = 0;

console.log('🔧 Minificando archivos JavaScript...\n');

jsFiles.forEach(({ src, dest }) => {
    const srcPath = path.join(__dirname, src);
    const destPath = path.join(__dirname, dest);

    if (!fs.existsSync(srcPath)) {
        console.log(`⚠️  ${src} no encontrado, saltando...`);
        return;
    }

    try {
        const js = fs.readFileSync(srcPath, 'utf8');

        // Minificación básica pero efectiva
        const minified = js
            // Remover comentarios de una línea
            .replace(/\/\/.*$/gm, '')
            // Remover comentarios multilínea
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Remover espacios en blanco múltiples
            .replace(/\s+/g, ' ')
            // Remover espacios alrededor de operadores y símbolos
            .replace(/\s*([{}\[\]();,:<>?!&|=+\-*/%])\s*/g, '$1')
            // Remover espacio después de palabra clave
            .replace(/\b(return|throw|typeof|delete|void|await|yield)\s+/g, '$1 ')
            // Mantener espacio necesario en declaraciones
            .replace(/\b(const|let|var|function|class|if|else|for|while|do|switch|case|break|continue|new)\s+/g, '$1 ')
            .trim();

        fs.writeFileSync(destPath, minified, 'utf8');

        const originalSize = Buffer.byteLength(js, 'utf8');
        const minifiedSize = Buffer.byteLength(minified, 'utf8');
        const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

        totalOriginal += originalSize;
        totalMinified += minifiedSize;

        console.log(`✅ ${path.basename(src)}`);
        console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
        console.log(`   Minificado: ${(minifiedSize / 1024).toFixed(2)} KB`);
        console.log(`   Ahorro: ${savings}%\n`);

    } catch (error) {
        console.error(`❌ Error al minificar ${src}:`, error.message);
    }
});

const totalSavings = ((1 - totalMinified / totalOriginal) * 100).toFixed(1);
console.log('━'.repeat(50));
console.log(`📊 Total:`);
console.log(`   Original: ${(totalOriginal / 1024).toFixed(2)} KB`);
console.log(`   Minificado: ${(totalMinified / 1024).toFixed(2)} KB`);
console.log(`   Ahorro total: ${totalSavings}%`);
