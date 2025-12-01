import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente. O terceiro argumento '' carrega TODAS as variáveis
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Tenta encontrar a chave em várias fontes possíveis para ser à prova de falhas
  const apiKey = process.env.API_KEY || env.API_KEY || process.env.VITE_API_KEY || env.VITE_API_KEY;

  return {
    plugins: [react()],
    define: {
      // Injecta a variável globalmente no código do cliente
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      // Increase chunk size warning limit to reduce noise for large vendors
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            // Split React and ReactDOM
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // Split Charting library which is heavy
            'charts': ['recharts'],
            // Split Markdown rendering
            'markdown': ['react-markdown'],
            // Split Icons
            'icons': ['lucide-react'],
            // Split Google GenAI SDK
            'genai': ['@google/genai'],
            // Split Supabase SDK
            'supabase': ['@supabase/supabase-js'],
            // Split PDF generation
            'print': ['react-to-print'],
            // Split Excel generation
            'excel': ['xlsx']
          }
        }
      }
    }
  };
});