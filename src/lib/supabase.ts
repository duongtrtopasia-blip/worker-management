import { createClient } from '@supabase/supabase-js';

// Các biến môi trường này sẽ được lấy từ file .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://slhutfdbkqbitwcopxkq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_rLna6trDZm_j_a62OUEnZQ_3yetb6yZ';

// Khởi tạo Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
