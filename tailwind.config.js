// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Asegúrate que esto apunte a tus archivos
  ],
  theme: {
    extend: {
      // Aquí movemos tus colores personalizados para que Tailwind los reconozca
      colors: {
        'sl-blue': {
          '50': '#f2f6fc',
          '100': '#e1ecf8',
          '200': '#caddf3',
          '300': '#a5c8eb',
          '400': '#7aace0',
          '500': '#5b8ed6',
          '600': '#4775c9',
          '700': '#3d61b8',
          '800': '#375096',
          '900': '#304678',
          '950': '#212c4a',
        },
        'sl-pink': {
          '50': '#fef1f7',
          '100': '#fee5f0',
          '200': '#ffcae4',
          '300': '#ff9fcb',
          '400': '#ff63a7',
          '500': '#ff3a87',
          '600': '#f0125e',
          '700': '#d10545',
          '800': '#ad0739',
          '900': '#8f0c34',
          '950': '#580019',
        },
        'sl-red': {
          '600': '#ed1139',
          '700': '#c80830',
          '900': '#8f0c2f',
        },
        'sl-gray': {
          '50': '#ffffff',
          '75': '#f9f9f9',
          '100': '#f0f0f0',
          '150': '#e1e1e1',
          '200': '#d2d2d2',
          '250': '#c3c3c3',
          '300': '#b5b5b5',
          '500': '#7e7e7e',
          '700': '#4a4a4a',
          '800': '#333333',
          '850': '#272727',
          '900': '#1d1d1d',
          '950': '#121212',
        }
      }
    },
  },
  plugins: [
    require('daisyui'), // Asegúrate de que el plugin de DaisyUI esté aquí
  ],
  important: '#payment-form-container',
  
  daisyui: {
    themes: ["light", "dark"], // Puedes configurar los temas que usas
  },
};
