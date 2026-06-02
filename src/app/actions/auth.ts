'use server';

import { cookies } from 'next/headers';

export async function loginAction(username: string, password: string) {
  if (username === 'administrator' && password === 'Khongchoaibiet123#') {
    cookies().set('admin_auth', 'true', { secure: true, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 }); // 7 days
    return { success: true };
  }
  return { success: false, error: 'Tài khoản hoặc mật khẩu không chính xác' };
}

export async function logoutAction() {
  cookies().delete('admin_auth');
  return { success: true };
}
