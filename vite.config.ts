import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnon =
    env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    envDir: process.cwd(),
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(
        env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl
      ),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnon
      ),
      'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(
        env.SUPABASE_SERVICE_ROLE_KEY || ''
      ),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
