'use server';

import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function loginAction(username: string, password: string) {
  // 1. Fetch user from database
  const { data: user, error } = await supabase
    .from('system_users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !user) {
    return { success: false, error: 'Tài khoản không tồn tại' };
  }

  if (user.status !== 'active') {
    return { success: false, error: 'Tài khoản đã bị vô hiệu hóa' };
  }

  // 2. Verify password
  const isValid = bcrypt.compareSync(password, user.password_hash);
  
  if (!isValid) {
    return { success: false, error: 'Mật khẩu không chính xác' };
  }

  // 3. Set cookies
  cookies().set('admin_auth', 'true', { secure: true, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
  cookies().set('user_role', user.role, { secure: true, httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 7 });
  cookies().set('username', user.username, { secure: true, httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 7 });
  cookies().set('full_name', user.full_name || user.username, { secure: true, httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 7 });

  return { success: true };
}

export async function logoutAction() {
  cookies().delete('admin_auth');
  cookies().delete('user_role');
  cookies().delete('username');
  cookies().delete('full_name');
  return { success: true };
}
