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
        <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}>
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cài Đặt Hệ Thống</h1>
          <p className="text-sm text-gray-400 mt-0.5">Quản trị và cấu hình toàn bộ hệ thống</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {userRole === 'admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'users' 
                ? 'border-brand-blue text-brand-blue' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'backup' 
              ? 'border-brand-blue text-brand-blue' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Sao Lưu CSDL
          </div>
        </button>
      </div>

      <div className="bg-white p-6 border border-gray-100 rounded-xl shadow-sm min-h-[400px]">
        
        {/* ================== TAB QUẢN LÝ NGƯỜI DÙNG ================== */}
        {activeTab === 'users' && userRole === 'admin' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Danh Sách Quản Trị Viên</h2>
                <p className="text-xs text-gray-500 mt-1">Cấp quyền truy cập hệ thống cho các nhân sự khác</p>
              </div>
              <Button 
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="gap-2 text-white shadow-md transition-transform active:scale-95"
                style={{ background: 'linear-gradient(135deg, #1e3a8a, #970731)' }}
              >
                {showCreateForm ? 'Hủy Bỏ' : <><UserPlus className="w-4 h-4" /> Thêm Tài Khoản Mới</>}
              </Button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
              <form onSubmit={handleCreateUser} className="bg-gray-50 p-5 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Tên đăng nhập (Username) *</label>
                  <Input name="username" required placeholder="Ví dụ: nva_editor" className="bg-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Mật khẩu khởi tạo *</label>
                  <Input name="password" required type="password" placeholder="Tối thiểu 6 ký tự" className="bg-white" minLength={6} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Họ và tên người dùng</label>
                  <Input name="full_name" placeholder="Ví dụ: Nguyễn Văn A" className="bg-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Quyền truy cập *</label>
                  <select name="role" className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-brand-blue/20 outline-none">
                    <option value="editor">Editor (Chỉ có quyền thao tác và duyệt thẻ)</option>
                    <option value="admin">Admin (Toàn quyền quản trị hệ thống)</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end pt-2">
                  <Button type="submit" disabled={isSubmitting} className="bg-brand-blue hover:bg-brand-blue/90 gap-2 text-white">
                    {isSubmitting ? 'Đang tạo...' : <><Save className="w-4 h-4" /> Lưu Tài Khoản</>}
                  </Button>
                </div>
              </form>
            )}

            {/* Users Table */}
            {loadingUsers ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Người Dùng</th>
                      <th className="px-4 py-3 text-center">Phân Quyền</th>
                      <th className="px-4 py-3 text-center">Trạng Thái</th>
                      <th className="px-4 py-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{user.username}</div>
                          <div className="text-xs text-gray-500">{user.full_name || 'Không có tên'}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {user.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold border border-red-100 uppercase">
                              <Shield className="w-3 h-3" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-100 uppercase">
                              <Edit className="w-3 h-3" /> Editor
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {user.status === 'active' ? (
                            <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100">Đang hoạt động</span>
                          ) : (
                            <span className="text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-gray-200">Bị Khóa</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleResetPassword(user.id, user.username)}
                              title="Đổi mật khẩu"
                              className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            
                            {user.username !== 'admin' && (
                              <>
                                <button 
                                  onClick={() => handleToggleStatus(user.id, user.status, user.username)}
                                  title={user.status === 'active' ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    user.status === 'active' 
                                      ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' 
                                      : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                  }`}
                                >
                                  {user.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                </button>
                                
                                <button 
                                  onClick={() => handleDeleteUser(user.id, user.username)}
                                  title="Xóa tài khoản"
                                  className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
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
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-lg font-semibold text-gray-800">Sao lưu dữ liệu Local</h2>
              <p className="text-xs text-gray-500 mt-1">Trích xuất cơ sở dữ liệu hệ thống ra tệp tin an toàn</p>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-4">
              <Database className="w-6 h-6 text-brand-blue shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Backup thủ công an toàn</p>
                <p className="text-sm text-blue-700/80 mb-4">
                  Tính năng này sẽ trích xuất toàn bộ dữ liệu từ Cơ sở dữ liệu hiện tại (bảng công nhân, hồ sơ, và danh sách thẻ) 
                  sang định dạng JSON. Sau đó tải trực tiếp xuống máy tính của bạn để lưu trữ.
                </p>
                <Button 
                  onClick={handleBackup} 
                  disabled={isBackingUp}
                  className="bg-brand-blue hover:bg-brand-blue/90 gap-2 text-white shadow-sm"
                >
                  {isBackingUp ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang trích xuất...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Tải Xuống Bản Sao Lưu</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
