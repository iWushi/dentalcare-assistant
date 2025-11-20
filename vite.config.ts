import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente. O terceiro argumento '' carrega TODAS as variáveis, não apenas as que começam por VITE_
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
      sourcemap: false
    }
  };
});