# SidebarNav

Thanh điều hướng bên trái trên desktop, nền `sidebar` đặc (bỏ gradient xanh sang đỏ đô).

- Chia nhóm theo nhãn `overline`. **Quản lý**: Tổng quan, Công nhân, Thẻ ra vào, Hồ sơ tài liệu. **Công cụ in**: Thẻ cơm, Tem mũ. **Tiện ích**: Tra cứu xe, Import Excel. **Hệ thống**: Lịch sử thao tác (chỉ admin), Cài đặt.
- Mỗi mục cao 40px. Mục đang chọn có nền `sidebar-active`, chữ đậm và vạch `brand-yellow` 3px bên trái; dùng `aria-current="page"`. Bỏ mũi tên `ChevronRight`.
- Mục chưa chọn dùng `sidebar-ink-muted` (7.7:1), thay cho `text-white/60` cũ.

Thay cho phần `<aside>` trong `src/app/(dashboard)/layout.tsx`.
