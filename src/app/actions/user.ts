'use server';

import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

async function checkAdmin() {
  const cookieStore = await cookies();
  const role = cookieStore.get('user_role')?.value;
  if (role !== 'admin') {
    throw new Error('Chỉ Admin mới có quyền thực hiện thao tác này');
  }
}

export async function getUsersAction() {
  await checkAdmin();
  
  const { data, error } = await supabase
    .from('system_users')
    .select('id, username, role, full_name, status, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error('Lỗi khi lấy danh sách người dùng: ' + error.message);
  return data;
}

export async function createUserAction(formData: FormData) {
  await checkAdmin();
  
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as string;
  const fullName = formData.get('full_name') as string;

  if (!username || !password || !role) {
    throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc');
  }

  // Mã hóa mật khẩu
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const { error } = await supabase.from('system_users').insert({
    username: username.trim(),
    password_hash: passwordHash,
    role,
    full_name: fullName?.trim() || null
  });

  if (error) {
    if (error.code === '23505') throw new Error('Tên đăng nhập đã tồn tại');
    throw new Error('Lỗi khi tạo người dùng mới: ' + error.message);
  }

  return { success: true };
}

export async function updateUserAction(formData: FormData) {
  await checkAdmin();

  const id = formData.get('id') as string;
  const role = formData.get('role') as string;
  const fullName = formData.get('full_name') as string;

  const { error } = await supabase
    .from('system_users')
    .update({ role, full_name: fullName?.trim() || null })
    .eq('id', id);

  if (error) throw new Error('Lỗi khi cập nhật thông tin: ' + error.message);
  return { success: true };
}

export async function changePasswordAction(formData: FormData) {
  await checkAdmin();

  const id = formData.get('id') as string;
  const newPassword = formData.get('new_password') as string;

  if (!newPassword || newPassword.length < 6) {
    throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(newPassword, salt);

  const { error } = await supabase
    .from('system_users')
    .update({ password_hash: passwordHash })
    .eq('id', id);

  if (error) throw new Error('Lỗi khi đổi mật khẩu: ' + error.message);
  return { success: true };
}

export async function toggleUserStatusAction(id: string, currentStatus: string) {
  await checkAdmin();
  
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
  const { error } = await supabase
    .from('system_users')
    .update({ status: newStatus })
    .eq('id', id);

  if (error) throw new Error('Lỗi khi cập nhật trạng thái');
  return { success: true };
}

export async function deleteUserAction(id: string) {
  await checkAdmin();
  
  const { error } = await supabase
    .from('system_users')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Lỗi khi xóa người dùng');
  return { success: true };
}
