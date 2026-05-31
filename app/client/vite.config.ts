import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cached forever after first load
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Data layer — rarely changes
          'vendor-query': ['@tanstack/react-query', 'zustand', 'axios'],
          // Forms
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Icons — large, load once
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    // Raise the per-chunk warning threshold (some vendor chunks are expected large)
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:       'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
});
