import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable source maps for debugging (can be disabled in production)
    sourcemap: false,
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunks for vendor libraries
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // UI utilities
          'vendor-ui': ['clsx', 'tailwind-merge', 'lucide-react'],
        },
      },
    },
  },
  // Pre-bundle heavy dependencies for faster dev server startup
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@supabase/supabase-js',
      'lucide-react',
      'date-fns',
      'clsx',
      'tailwind-merge',
      'react-dropzone',
    ],
  },
  // Optimize dev server
  server: {
    // Warm up frequently used files
    warmup: {
      clientFiles: [
        './src/App.tsx',
        './src/main.tsx',
        './src/contexts/AuthContext.tsx',
        './src/contexts/ThemeContext.tsx',
        './src/components/layout/DashboardLayout.tsx',
        './src/lib/supabase.ts',
      ],
    },
  },
})
