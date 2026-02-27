const fs = require('fs');
const path = require('path');

// La nueva versión se obtiene de la variable de entorno que 'npm version' crea.
const newVersion = process.env.npm_package_version;

if (!newVersion) {
  console.error('Error: La nueva versión no está disponible. Ejecuta este script a través de "npm version".');
  process.exit(1);
}

// console.log(`Sincronizando ambos proyectos a la versión: ${newVersion}`);

// --- Ruta al archivo del backend ---
// ¡IMPORTANTE! asegurarse de que esta ruta sea la correcta en tu sistema.
const backendFilePath = path.resolve('D:', 'Proyecto Maikel', 'sl-services', 'sl-club-wp-services', 'routes', 'validation.routes.js');
const backendVersionRegex = /(const serverVersion = ")(\d+\.\d+\.\d+)(")/;

try {
  let backendFileContent = fs.readFileSync(backendFilePath, 'utf8');

  if (!backendVersionRegex.test(backendFileContent)) {
    throw new Error(`No se pudo encontrar el patrón de versión (ej: const serverVersion = "1.0.0";) en ${backendFilePath}`);
  }

  backendFileContent = backendFileContent.replace(backendVersionRegex, `$1${newVersion}$3`);
  fs.writeFileSync(backendFilePath, backendFileContent, 'utf8');

  // console.log(`✅ Backend actualizado en: ${backendFilePath}`);

} catch (error) {
  console.error(`❌ Error al actualizar la versión del backend: ${error.message}`);
  process.exit(1);
}

console.log('🎉 Sincronización de versiones completada.');
