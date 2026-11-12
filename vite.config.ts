import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{
            name: 'phaser',
            test: /node_modules[\\/]phaser[\\/]/,
            maxSize: 450_000,
          }],
        },
      },
    },
  },
})
