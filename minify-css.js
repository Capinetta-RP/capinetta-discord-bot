/**
 * Script simple para minificar CSS
 * Uso: node minify-css.js
 */

const fs = require('fs');
const path = require('path');

const cssFiles = [
    path.join(__dirname, 'web', 'public', 'css', 'style.css'),
    path.join(__dirname, 'web', 'public', 'css', 'metrics.css'),
    path.join(__dirname, 'web', 'public', 'css', 'statistics.css'),
    path.join(__dirname, 'web', 'public', 'css', 'canales.css'),
    path.join(__dirname, 'web', 'public', 'css', 'errors.css'),
    path.join(__dirname, 'web', 'public', 'css', 'login.css'),
];
const minifiedFile = path.join(__dirname, 'web', 'public', 'css', 'style.min.css');

try {
    let combinedCss = '';

    // Leer y combinar todos los CSS
    cssFiles.forEach(file => {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            combinedCss += '\n/* ' + path.basename(file) + ' */\n' + content;
        }
    });

    // Minificación simple pero efectiva:
    const minified = combinedCss
        // Remover comentarios
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remover espacios innecesarios
        .replace(/\s+/g, ' ')
        // Remover espacios alrededor de caracteres especiales
        .replace(/\s*([{}:;,>+~])\s*/g, '$1')
        // Remover punto y coma antes de cerrar llave
        .replace(/;}/g, '}')
        .trim();

    fs.writeFileSync(minifiedFile, minified, 'utf8');

    const originalSize = Buffer.byteLength(combinedCss, 'utf8');
    const minifiedSize = Buffer.byteLength(minified, 'utf8');
    const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

    console.log('✅ CSS minificado exitosamente');
    console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`   Minificado: ${(minifiedSize / 1024).toFixed(2)} KB`);
    console.log(`   Ahorro: ${savings}%`);
    console.log(`   Archivo creado: ${minifiedFile}`);
    console.log(`   Archivos procesados:`);
    cssFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`     ✓ ${path.basename(file)}`);
        }
    });

} catch (error) {
    console.error('❌ Error al minificar CSS:', error.message);
    process.exit(1);
}
