import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    // Production optimizations
    minify: 'terser',
    sourcemap: false, // Disable in production for security
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
          icons: ['lucide-react'],
          utils: ['date-fns']
        }
      }
    },
    // Optimize bundle size
    chunkSizeWarningLimit: 1000,
    // Enable compression
    reportCompressedSize: true
  },
  preview: {
    port: 3000,
    host: true
  },
  // Environment variable prefix
  envPrefix: 'VITE_',
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})