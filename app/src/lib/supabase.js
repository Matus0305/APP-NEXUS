// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Tus credenciales reales de Supabase
const supabaseUrl = 'https://zqcrrrbdgdkxucrymymy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxY3JycmJkZ2RreHVjcnlteW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDAyMzYsImV4cCI6MjA5Mjg3NjIzNn0.L5JI_0nvC3AxovJsLZ3e_azyq4fRW74jgqCaitLfefU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);