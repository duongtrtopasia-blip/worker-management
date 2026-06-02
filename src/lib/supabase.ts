import { createClient } from '@supabase/supabase-js';

// Các biến môi trường này sẽ được lấy từ file .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Khởi tạo Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
