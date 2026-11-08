'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Settings, Database, CheckCircle, AlertTriangle, Users, 
  UserPlus, Key, Lock, Unlock, Trash2, Edit, Shield, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { backupDatabaseAction } from '@/app/actions/backup';
import { 
  getUsersAction, createUserAction, updateUserAction, 
  changePasswordAction, toggleUserStatusAction, deleteUserAction 
} from '@/app/actions/user';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'backup'>('users');
  const [userRole, setUserRole] = useState('editor');

  // Backup State
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Create User Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const roleMatch = document.cookie.match(new RegExp('(^| )user_role=([^;]+)'));
    if (roleMatch) setUserRole(roleMatch[2]);
    
    if (roleMatch?.[2] === 'admin') {
      fetchUsers();
    } else {
      setActiveTab('backup'); // Non-admins can only see backup
    }
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsersAction();
      setUsers(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi tải danh sách người dùng');
    }
    setLoadingUsers(false);
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    const toastId = toast.loading('Đang trích xuất dữ liệu...');
    try {
      const res = await backupDatabaseAction();
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vincons_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Đã tải bản sao lưu xuống máy tính!', { id: toastId });
      } else {
        toast.error(res.error || 'Có lỗi xảy ra khi backup', { id: toastId });
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi kết nối máy chủ', { id: toastId });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createUserAction(formData);
      toast.success('Tạo tài khoản thành công!');
      setShowCreateForm(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (username === 'admin') {
      return toast.error('Không thể xóa tài khoản Admin gốc!');
    }
    if (!window.confirm(`Bạn có chắc muốn xóa tài khoản "${username}" không?`)) return;
    
    try {
      await deleteUserAction(id);
      toast.success('Xóa tài khoản thành công');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string, username: string) => {
    if (username === 'admin') {
      return toast.error('Không thể vô hiệu hóa tài khoản Admin gốc!');
    }
    
    try {
      await toggleUserStatusAction(id, currentStatus);
      toast.success('Cập nhật trạng thái thành công');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleResetPassword = async (id: string, username: string) => {
    const newPassword = window.prompt(`Nhập mật khẩu mới cho người dùng "${username}":\n(Tối thiểu 6 ký tự)`);
    if (newPassword === null) return;
    if (newPassword.trim().length < 6) {
      return toast.error('Mật khẩu quá ngắn!');
    }

    try {
      const formData = new FormData();
      formData.append('id', id);
      formData.append('new_password', newPassword);
      await changePasswordAction(formData);
      toast.success(`Đã đổi mật khẩu cho tài khoản ${username}!`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 rounded-[10px] bg-[#1e3a8a]">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-[22px] font-extrabold text-[#0f1b33] tracking-[-0.02em]">Cài đặt hệ thống</h1>
          <p className="text-[13px] text-[#5b6577] mt-0.5">Quản trị tài khoản và cấu hình cơ sở dữ liệu</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e3e8ef]">
        {userRole === 'admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-3 text-[13px] font-bold border-b-2 transition-all ${
              activeTab === 'users' 
                ? 'border-[#1e3a8a] text-[#1e3a8a]' 
                : 'border-transparent text-[#5b6577] hover:text-[#0f1b33] hover:border-[#8592a4]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Quản lý Người Dùng
            </div>
          </button>
        )}
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-5 py-3 text-[13px] font-bold border-b-2 transition-all ${
            activeTab === 'backup' 
              ? 'border-[#1e3a8a] text-[#1e3a8a]' 
              : 'border-transparent text-[#5b6577] hover:text-[#0f1b33] hover:border-[#8592a4]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Sao Lưu CSDL
          </div>
        </button>
      </div>

      <div className="bg-white p-6 border border-[#e3e8ef] rounded-[12px] shadow-[0_1px_2px_rgba(15,27,51,0.04)] min-h-[400px]">
        
        {/* ================== TAB QUẢN LÝ NGƯỜI DÙNG ================== */}
        {activeTab === 'users' && userRole === 'admin' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center border-b border-[#e3e8ef] pb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#0f1b33]">Danh Sách Quản Trị Viên</h2>
                <p className="text-xs text-[#5b6577] mt-1">Cấp quyền truy cập hệ thống cho các nhân sự khác</p>
              </div>
              <button 
                onClick={() => setShowCreateForm(!showCreateForm)}
                className={showCreateForm ? 'btn-secondary' : 'btn-primary'}
              >
                {showCreateForm ? 'Hủy Bỏ' : <><UserPlus className="w-4 h-4" /> Thêm Tài Khoản Mới</>}
              </button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
              <form onSubmit={handleCreateUser} className="bg-[#f7f9fc] p-5 rounded-[12px] border border-[#e3e8ef] grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#334155]">Tên đăng nhập (Username) *</label>
                  <Input name="username" required placeholder="Ví dụ: nva_editor" className="bg-white border-[#8592a4]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#334155]">Mật khẩu khởi tạo *</label>
                  <Input name="password" required type="password" placeholder="Tối thiểu 6 ký tự" className="bg-white border-[#8592a4]" minLength={6} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#334155]">Họ và tên người dùng</label>
                  <Input name="full_name" placeholder="Ví dụ: Nguyễn Văn A" className="bg-white border-[#8592a4]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#334155]">Quyền truy cập *</label>
                  <select name="role" className="w-full h-10 px-3 rounded-[10px] border border-[#8592a4] bg-white text-sm text-[#0f1b33] focus:border-[#1e3a8a] focus:ring-[3px] focus:ring-[#c9d4f0] outline-none">
                    <option value="editor">Editor (Chỉ có quyền thao tác và duyệt thẻ)</option>
                    <option value="admin">Admin (Toàn quyền quản trị hệ thống)</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end pt-2">
                  <button type="submit" disabled={isSubmitting} className="btn-primary">
                    {isSubmitting ? 'Đang tạo...' : <><Save className="w-4 h-4" /> Lưu Tài Khoản</>}
                  </button>
                </div>
              </form>
            )}

            {/* Users Table */}
            {loadingUsers ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-2 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[12px] border border-[#e3e8ef]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#f7f9fc] text-[#5b6577] text-[11px] uppercase tracking-wider font-extrabold border-b border-[#e3e8ef]">
                    <tr>
                      <th className="px-4 py-3">Người Dùng</th>
                      <th className="px-4 py-3 text-center">Phân Quyền</th>
                      <th className="px-4 py-3 text-center">Trạng Thái</th>
                      <th className="px-4 py-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e3e8ef]">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-[#f7f9fc] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-[#0f1b33]">{user.username}</div>
                          <div className="text-xs text-[#5b6577]">{user.full_name || 'Không có tên'}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {user.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 bg-[#fef2f2] text-[#b4141a] px-2.5 py-1 rounded-full text-[11px] font-bold border border-[#f5b5b8] uppercase">
                              <Shield className="w-3 h-3" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-[#eef2fb] text-[#1e3a8a] px-2.5 py-1 rounded-full text-[11px] font-bold border border-[#c9d4f0] uppercase">
                              <Edit className="w-3 h-3" /> Editor
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {user.status === 'active' ? (
                            <span className="text-[#047857] bg-[#ecfdf5] px-2.5 py-1 rounded-full text-[11px] font-bold border border-[#a7f3d0]">Đang hoạt động</span>
                          ) : (
                            <span className="text-[#5b6577] bg-[#f3f5f9] px-2.5 py-1 rounded-full text-[11px] font-bold border border-[#e3e8ef]">Bị Khóa</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleResetPassword(user.id, user.username)}
                              title="Đổi mật khẩu"
                              className="p-1.5 text-[#1e3a8a] bg-[#eef2fb] hover:bg-[#c9d4f0] rounded-[8px] transition-colors"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            
                            {user.username !== 'admin' && (
                              <>
                                <button 
                                  onClick={() => handleToggleStatus(user.id, user.status, user.username)}
                                  title={user.status === 'active' ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                                  className={`p-1.5 rounded-[8px] transition-colors ${
                                    user.status === 'active' 
                                      ? 'text-[#92400e] bg-[#fef7e6] hover:bg-[#f5d89a]' 
                                      : 'text-[#047857] bg-[#ecfdf5] hover:bg-[#a7f3d0]'
                                  }`}
                                >
                                  {user.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                </button>
                                
                                <button 
                                  onClick={() => handleDeleteUser(user.id, user.username)}
                                  title="Xóa tài khoản"
                                  className="p-1.5 text-[#b4141a] bg-[#fef2f2] hover:bg-[#f5b5b8] rounded-[8px] transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================== TAB SAO LƯU DỮ LIỆU ================== */}
        {activeTab === 'backup' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
            <div className="border-b border-[#e3e8ef] pb-4">
              <h2 className="text-base font-extrabold text-[#0f1b33]">Sao lưu dữ liệu Local</h2>
              <p className="text-xs text-[#5b6577] mt-1">Trích xuất cơ sở dữ liệu hệ thống ra tệp tin an toàn</p>
            </div>
            
            <div className="bg-[#eef2fb] border border-[#c9d4f0] rounded-[12px] p-5 flex gap-4">
              <Database className="w-6 h-6 text-[#1e3a8a] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-extrabold text-[#0f1b33] mb-1">Backup thủ công an toàn</p>
                <p className="text-sm text-[#334155] mb-4">
                  Tính năng này sẽ trích xuất toàn bộ dữ liệu từ Cơ sở dữ liệu hiện tại (bảng công nhân, hồ sơ, và danh sách thẻ) 
                  sang định dạng JSON. Sau đó tải trực tiếp xuống máy tính của bạn để lưu trữ.
                </p>
                <button 
                  onClick={handleBackup} 
                  disabled={isBackingUp}
                  className="btn-primary"
                >
                  {isBackingUp ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang trích xuất...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Tải Xuống Bản Sao Lưu</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
