const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const webpack = require('webpack');
const packageJson = require('./package.json');

module.exports = {
  // 1. Empezamos con la configuración por defecto de WordPress
  ...defaultConfig,

  // 2. Añadimos la regla para manejar los archivos .lottie
  module: {
    ...defaultConfig.module,
    rules: [
      ...defaultConfig.module.rules,
      {
        test: /\.lottie$/,
        type: 'asset/resource', // Trata los archivos .lottie como recursos
        generator: {
          filename: 'lottie/[name][ext]', // Los organiza en una carpeta 'lottie' en el build
        },
      },
    ],
  },

  // 3. Añadimos el plugin para inyectar la versión del paquete
  plugins: [
    ...defaultConfig.plugins,
    new webpack.DefinePlugin({
      'process.env.PLUGIN_VERSION': JSON.stringify(packageJson.version),
    }),
  ],
};