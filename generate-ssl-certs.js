/**
 * Script para generar certificados SSL self-signed para desarrollo
 * Uso: node generate-ssl-certs.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, 'certs');

// Crear directorio si no existe
if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
    console.log('📁 Directorio certs/ creado');
}

const keyPath = path.join(certsDir, 'key.pem');
const certPath = path.join(certsDir, 'cert.pem');

// Verificar si ya existen
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('⚠️  Los certificados ya existen en certs/');
    console.log('   Si quieres regenerarlos, elimina la carpeta certs/ primero.');
    process.exit(0);
}

console.log('🔐 Generando certificados SSL self-signed...\n');
console.log('⚠️  NOTA: Estos certificados son SOLO para desarrollo local');
console.log('   Para producción, usa Let\'s Encrypt o un certificado válido\n');

try {
    // Generar certificado self-signed válido por 365 días
    const command = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=AR/ST=Buenos Aires/L=CABA/O=Capi Netta RP/CN=localhost"`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log('\n✅ Certificados generados exitosamente:');
    console.log(`   🔑 Clave privada: ${keyPath}`);
    console.log(`   📜 Certificado: ${certPath}`);
    console.log('\n📝 Para usar HTTPS en desarrollo:');
    console.log('   1. Actualiza .env: HTTPS_ENABLED=true');
    console.log('   2. Reinicia el servidor');
    console.log('   3. Accede a https://localhost:3000');
    console.log('   4. Acepta la advertencia de seguridad del navegador\n');
    console.log('🌐 Para producción:');
    console.log('   Usa Certbot (Let\'s Encrypt):');
    console.log('   sudo certbot certonly --standalone -d tu-dominio.com');
    console.log('   Luego actualiza SSL_KEY_PATH y SSL_CERT_PATH en .env\n');
    
} catch (error) {
    console.error('\n❌ Error al generar certificados:');
    console.error('   Asegúrate de tener OpenSSL instalado:');
    console.error('   - Windows: https://slproweb.com/products/Win32OpenSSL.html');
    console.error('   - Linux/Mac: viene preinstalado o usa: apt-get install openssl');
    console.error(`\n   Error: ${error.message}`);
    process.exit(1);
}
