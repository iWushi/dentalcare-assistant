
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO MANUAL DO SUPABASE ---
// Como não existe ficheiro .env neste ambiente, cola os teus dados diretamente abaixo.

// 1. URL do teu projeto Supabase (ex: https://xyz.supabase.co)
const SUPABASE_URL = 'https://hpuwvszhcxabcoxqcuec.supabase.co';

// 2. Chave "anon" / "public" do Supabase (ex: eyJhbGciOiJIUzI1NiIsIn...)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwdXd2c3poY3hhYmNveHFjdWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MTA2NTQsImV4cCI6MjA3OTA4NjY1NH0.usZ3Jbten1fmq_am8SKJ5QsBeZPRQZPa6-eqrfsswBU';

// --- Validação ---
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('YOUR_SUPABASE_URL')) {
  console.error('🚨 ERRO CRÍTICO: Supabase não configurado. Edita o ficheiro services/supabase.ts');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
