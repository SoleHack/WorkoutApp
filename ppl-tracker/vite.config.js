import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'vendor-react',   test: /node_modules\/(react|react-dom|react-router)/ },
            { name: 'vendor-charts',  test: /node_modules\/recharts/ },
            { name: 'vendor-supabase',test: /node_modules\/@supabase/ },
          ],
        },
      },
    },
  },
})
