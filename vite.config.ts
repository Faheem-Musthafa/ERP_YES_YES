import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor libraries into separate, cacheable chunks.
        // Users' browsers cache these independently — a code change in one
        // page won't invalidate the React or Supabase bundle.
        manualChunks: (id) => {
          // Core React runtime — almost never changes
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          // Supabase client
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          // Charting library — large, changes infrequently
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
          // All UI component libraries
          if (
            id.includes('node_modules/@radix-ui') ||
            id.includes('node_modules/@mui') ||
            id.includes('node_modules/@emotion') ||
            id.includes('node_modules/lucide-react') ||
            id.includes('node_modules/class-variance-authority') ||
            id.includes('node_modules/clsx') ||
            id.includes('node_modules/tailwind-merge')
          ) {
            return 'vendor-ui';
          }
          // Form & date utilities
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/date-fns')) {
            return 'vendor-utils';
          }
        },
      },
    },
  },
  // Pre-bundle known heavy barrel-import packages in dev so HMR stays fast
  optimizeDeps: {
    include: [
      'lucide-react',
      'recharts',
      '@mui/material',
      '@mui/icons-material',
      'react-hook-form',
      'date-fns',
    ],
  },
})
