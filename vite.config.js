import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// You must install these dependencies: npm install -D tailwindcss postcss autoprefixer
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // CRITICAL: Add the CSS configuration for PostCSS
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
})