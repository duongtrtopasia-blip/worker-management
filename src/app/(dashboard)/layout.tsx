'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  CreditCard,
  FolderOpen,
  UploadCloud,
  Settings,
  LogOut,
  Bell,
  Car,
  HardHat,
  UtensilsCrossed,
  ClipboardList,
} from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { AppNotification, getNotificationsAction } from '@/app/actions/notification';
import { fetchWorkersCached, fetchDocumentsCached } from '@/lib/data-cache';

const managementMenuItems = [
  { name: 'Tổng quan', href: '/', icon: Home },
  { name: 'Danh sách công nhân', href: '/workers', icon: Users },
  { name: 'Thẻ ra vào', href: '/cards', icon: CreditCard },
  { name: 'Hồ sơ tài liệu', href: '/documents', icon: FolderOpen },
];

const utilityMenuItems = [
  { name: 'In Tem Mũ', href: '/helmet-tags', icon: HardHat },
  { name: 'Thẻ Cơm', href: '/meal-cards', icon: UtensilsCrossed },
  { name: 'Tra cứu xe', href: '/vehicle-search', icon: Car },
  { name: 'Import Excel', href: '/import', icon: UploadCloud },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = React.useState('admin');
  const [username, setUsername] = React.useState('Ban Chỉ Huy');

  React.useEffect(() => {
    const roleMatch = document.cookie.match(new RegExp('(^| )user_role=([^;]+)'));
    if (roleMatch) setUserRole(decodeURIComponent(roleMatch[2]));

    const userMatch = document.cookie.match(new RegExp('(^| )username=([^;]+)'));
    if (userMatch) setUsername(decodeURIComponent(userMatch[2]));
  }, []);

  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [showNotifs, setShowNotifs] = React.useState(false);
  const [lastRead, setLastRead] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Khởi tạo cache dữ liệu ngầm để khi chuyển sang các tab khác hiển thị tức thì (0ms)
    fetchWorkersCached().catch(() => {});
    fetchDocumentsCached().catch(() => {});

    const fetchNotifs = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const data = await getNotificationsAction();
      setNotifications(data);
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    const savedTime = localStorage.getItem('last_read_notif');
    if (savedTime) setLastRead(savedTime);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(
    (n) => !lastRead || new Date(n.created_at) > new Date(lastRead)
  ).length;

  const handleOpenNotifs = () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs) {
      const now = new Date().toISOString();
      setLastRead(now);
      localStorage.setItem('last_read_notif', now);
    }
  };

  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  const getBreadcrumb = () => {
    if (pathname === '/') {
      return { group: 'Dự án', title: 'Khu DLND Mỹ Lâm – Tuyên Quang', showStatus: true };
    }
    if (pathname.startsWith('/workers')) {
      return { group: 'Nhân sự', title: 'Quản lý Công nhân công trường', showStatus: false };
    }
    if (pathname.startsWith('/cards')) {
      return { group: 'In ấn', title: 'Quản lý & In thẻ công trường', showStatus: false };
    }
    if (pathname.startsWith('/documents')) {
      return { group: 'Hồ sơ', title: 'Tình trạng Hồ sơ & Tài liệu', showStatus: false };
    }
    if (pathname.startsWith('/helmet-tags')) {
      return { group: 'Tiện ích in ấn', title: 'In Tem Mũ Bảo Hộ', showStatus: false };
    }
    if (pathname.startsWith('/meal-cards')) {
      return { group: 'Tiện ích in ấn', title: 'Quản lý & In Thẻ Cơm', showStatus: false };
    }
    if (pathname.startsWith('/vehicle-search')) {
      return { group: 'An ninh', title: 'Tra cứu phương tiện ra vào', showStatus: false };
    }
    if (pathname.startsWith('/import')) {
      return { group: 'Dữ liệu', title: 'Import Excel & Ảnh hàng loạt', showStatus: false };
    }
    if (pathname.startsWith('/audit-logs')) {
      return { group: 'Hệ thống', title: 'Lịch sử thao tác (Audit Log)', showStatus: false };
    }
    if (pathname.startsWith('/settings')) {
      return { group: 'Hệ thống', title: 'Cài đặt & Quản trị phân quyền', showStatus: false };
    }
    return { group: 'Dự án', title: 'Khu DLND Mỹ Lâm – Tuyên Quang', showStatus: true };
  };

  const breadcrumb = getBreadcrumb();
  const initials = username
    ? username
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AD';

  const isItemActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="flex h-screen font-sans overflow-hidden" style={{ backgroundColor: '#f3f5f9', color: '#0f1b33' }}>
      {/* ===== SIDEBAR (Desktop) ===== */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0"
        style={{
          width: '248px',
          background: '#16296a',
          borderRight: '1px solid #2a3f86',
        }}
      >
        {/* Brand Logos */}
        <div
          style={{
            height: '64px',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid #2a3f86',
          }}
        >
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div
              style={{
                background: '#ffffff',
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '13px',
                  color: '#1e3a8a',
                  letterSpacing: '-0.5px',
                }}
              >
                VINCONS
              </span>
            </div>
            <span style={{ color: '#657dbf', fontSize: '12px' }}>|</span>
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '13px' }}>SCMP</span>
          </Link>
        </div>

        {/* App Title Banner */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #2a3f86' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#fdef03',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Khu DLND Mỹ Lâm
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
            Quản Lý Công Nhân
          </div>
        </div>

        {/* Nav Items */}
        <nav
          style={{
            flex: 1,
            padding: '16px 12px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#b8c3e6',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '8px 12px 4px',
            }}
          >
            Quản lý
          </div>

          {managementMenuItems.map((item) => {
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#b8c3e6',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '14px 12px 4px',
            }}
          >
            Tiện ích in ấn
          </div>

          {utilityMenuItems.map((item) => {
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {userRole === 'admin' && (
            <Link
              href="/audit-logs"
              className={`sidebar-link ${isItemActive('/audit-logs') ? 'active' : ''}`}
              aria-current={isItemActive('/audit-logs') ? 'page' : undefined}
            >
              <ClipboardList className="w-[18px] h-[18px] shrink-0" />
              <span>Lịch sử thao tác</span>
            </Link>
          )}
        </nav>

        {/* Sidebar Bottom: Settings & Logout */}
        <div style={{ padding: '12px', borderTop: '1px solid #2a3f86' }} className="space-y-1">
          <Link
            href="/settings"
            className={`sidebar-link ${isItemActive('/settings') ? 'active' : ''}`}
            aria-current={isItemActive('/settings') ? 'page' : undefined}
          >
            <Settings className="w-[18px] h-[18px] shrink-0" />
            <span>Cài đặt hệ thống</span>
          </Link>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-left hover:!bg-red-500/15 hover:!text-red-200"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ===== MAIN BODY ===== */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 pb-[68px] md:pb-0 relative">
        {/* TOP HEADER (Mobile) */}
        <header
          className="md:hidden flex items-center justify-between px-4 shrink-0"
          style={{ height: '54px', background: '#16296a', color: '#ffffff' }}
        >
          <Link href="/" className="flex items-center gap-2 no-underline">
            <span style={{ fontWeight: 800, fontSize: '14px', color: '#fdef03' }}>VINCONS</span>
            <span style={{ color: '#657dbf', fontSize: '12px' }}>|</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>Mỹ Lâm</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNotifs}
              aria-label="Thông báo"
              style={{
                position: 'relative',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#243d93',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    background: '#e31c23',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #16296a',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#970731',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {initials}
            </div>
            <button
              onClick={handleLogout}
              aria-label="Đăng xuất"
              className="p-1.5 rounded-full text-white/70 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* TOP HEADER (Desktop) */}
        <header
          className="hidden md:flex items-center justify-between shrink-0"
          style={{
            height: '64px',
            background: '#ffffff',
            borderBottom: '1px solid #e3e8ef',
            padding: '0 28px',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span style={{ fontSize: '13px', color: '#5b6577' }}>{breadcrumb.group}</span>
            <span style={{ color: '#c5cedb' }}>/</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f1b33' }}>
              {breadcrumb.title}
            </span>
            {breadcrumb.showStatus && (
              <span
                className="vc-badge"
                style={{ background: '#e6f5ee', color: '#047857', marginLeft: '8px' }}
              >
                Đang thi công
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Button */}
            <div className="relative">
              <button
                onClick={handleOpenNotifs}
                aria-label="Thông báo"
                style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '1px solid #e3e8ef',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#334155',
                }}
                className="hover:bg-[#f7f9fc] transition-colors"
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      background: '#e31c23',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #fff',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                  <div
                    className="absolute top-full right-0 mt-2 w-80 bg-white overflow-hidden z-50"
                    style={{
                      borderRadius: '12px',
                      border: '1px solid #e3e8ef',
                      boxShadow: '0 8px 24px -8px rgba(15,27,51,0.18)',
                    }}
                  >
                    <div
                      className="px-4 py-3 flex justify-between items-center"
                      style={{ background: '#f7f9fc', borderBottom: '1px solid #e3e8ef' }}
                    >
                      <h3 className="font-bold text-sm text-[#0f1b33]">Thông báo hệ thống</h3>
                      {unreadCount > 0 && (
                        <span className="text-xs text-[#1e3a8a] font-bold">{unreadCount} mới</span>
                      )}
                    </div>
                    <div className="max-h-[350px] overflow-y-auto overscroll-contain">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-[#5b6577] text-sm">
                          Không có thông báo nào
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              setShowNotifs(false);
                              if (n.link) router.push(n.link);
                            }}
                            className="px-4 py-3 border-b border-[#e3e8ef] hover:bg-[#eef2fb] cursor-pointer transition-colors group"
                          >
                            <p className="font-bold text-sm text-[#0f1b33] group-hover:text-[#1e3a8a]">
                              {n.title}
                            </p>
                            <p className="text-xs text-[#334155] mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[11px] text-[#5b6577] mt-1">
                              {new Date(n.created_at).toLocaleString('vi-VN')}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ height: '24px', width: '1px', background: '#e3e8ef' }} />

            {/* User Profile Pill */}
            <div className="flex items-center gap-2.5">
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#1e3a8a',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {initials}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f1b33' }} className="capitalize">
                  {username}
                </div>
                <div style={{ fontSize: '11px', color: '#5b6577' }}>
                  {userRole === 'admin' ? 'Quản trị viên' : 'Cán bộ công trường'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* ===== MOBILE BOTTOM NAVIGATION (MobileApp.dc.html) ===== */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-1"
          style={{
            height: '68px',
            background: '#ffffff',
            borderTop: '1px solid #e3e8ef',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
          }}
        >
          {[
            { name: 'Tổng quan', href: '/', icon: Home },
            { name: 'Công nhân', href: '/workers', icon: Users },
            { name: 'Thẻ ra vào', href: '/cards', icon: CreditCard },
            { name: 'Tra cứu xe', href: '/vehicle-search', icon: Car },
            { name: 'Cài đặt', href: '/settings', icon: Settings },
          ].map((item) => {
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 no-underline"
                style={{
                  color: active ? '#1e3a8a' : '#5b6577',
                  fontWeight: active ? 700 : 600,
                  fontSize: '11px',
                }}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
