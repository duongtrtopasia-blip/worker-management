# SCMP Vincons

Bộ nhận diện giao diện cho **SCMP Vincons**, hệ thống quản lý công nhân và thẻ ra vào công trường (Khu DLND Mỹ Lâm, Tuyên Quang). Bộ này rút từ code hiện có (`src/app/globals.css`, `tailwind.config.ts`, các trang trong `src/app/(dashboard)`) rồi chuẩn hóa lại. Nhận diện giữ nguyên: xanh navy Vincons, đỏ đô và đỏ Vingroup, vàng Vingroup, font UTM Avo.

## Nguyên tắc

1. **Dữ liệu trước, trang trí sau.** Người dùng là cán bộ hành chính và bảo vệ công trường, ngồi tra cứu và nhập liệu hàng giờ. Bảng dữ liệu, ô tìm kiếm và trạng thái phải đọc được ngay, không phải tìm.
2. **Một màu thương hiệu cho hành động.** `brand-blue` là màu duy nhất của nút chính, mục đang chọn và vòng focus. `brand-maroon` chỉ để nhấn phụ, không bao giờ dùng để báo lỗi.
3. **Màu trạng thái có ý nghĩa cố định.** Xanh lá `success` = đầy đủ/còn hạn, cam `warning` = sắp hết hạn (≤30 ngày), đỏ `danger` = hết hạn/thiếu hồ sơ. Badge luôn đi kèm chữ, không chỉ dựa vào màu.
4. **Phẳng và rõ.** Không dùng gradient. Thẻ (card) dùng nền `surface`, viền `line` 1px và `shadow-card`; chỉ thẻ bấm được mới nổi lên (`shadow-raised`) khi rê chuột.
5. **Đủ tương phản.** Chữ phụ dùng `ink-muted` (5.9:1), không dùng xám nhạt hơn. Placeholder dùng `ink-placeholder`, chỉ đặt trên nền `surface`.

## Màu

| Vai trò | Token | Dùng cho |
|---|---|---|
| Thương hiệu | `brand-blue` | Nút chính, link, tab đang chọn, focus ring |
| | `brand-blue-soft` + chữ `brand-blue` | Dòng đang chọn, nền tab active, callout thông tin |
| | `brand-maroon` | Avatar, chuỗi dữ liệu thứ hai trên biểu đồ, header thẻ in |
| | `brand-red` | Chấm thông báo, nút xóa dạng đặc |
| | `brand-yellow` | Chỉ trên nền sidebar: vạch đánh dấu mục đang chọn, dòng overline |
| Nền | `canvas` → `surface` → `surface-sunken` | Nền app → card/bảng → header bảng, thanh công cụ |
| Viền | `line`, `line-strong` | Viền card/bảng; viền ô nhập liệu |
| Chữ | `ink`, `ink-2`, `ink-muted` | Chính; phụ trong bảng; chú thích, thời gian |
| Sidebar | `sidebar`, `sidebar-active`, `sidebar-ink-muted` | Nền đặc navy, mục đang chọn, nhãn chưa chọn |
| Trạng thái | `success`/`warning`/`danger` + `-soft` | Badge, callout, ô lỗi |

Cặp chữ trên nền luôn là `<trạng thái>` trên `<trạng thái>-soft` (ví dụ `warning` trên `warning-soft`, 6.4:1).

## Chữ

Chỉ một họ chữ, **UTM Avo** (400 và 700), dự phòng bằng Be Vietnam Pro rồi đến system-ui. Có đủ dấu tiếng Việt.

- `page-title` 24/32 bold: mỗi trang một tiêu đề, đặt ở góc trên bên trái vùng nội dung.
- `section-title` 16/24 bold: tiêu đề card.
- `body` 14/22: mặc định cho bảng, form, đoạn văn.
- `small` 13/20 và `caption` 12/16: dòng phụ dưới tên, trục biểu đồ, badge.
- `overline` 11/16 bold, viết hoa, giãn chữ 0.08em: header cột bảng, nhãn nhóm trong sidebar.

Không dùng cỡ chữ dưới 11px (code cũ còn dùng `text-[9px]`, `text-[10px]`).

## Khoảng cách, bo góc, kích thước

- Lưới 4px: `space-1` … `space-12`. Padding trang `space-6`, padding card `space-5` (mobile `space-4`), khoảng cách giữa các khối `space-6`.
- Bo góc: `radius-sm` 6px cho badge, `radius-md` 8px cho nút/ô nhập, `radius-lg` 12px cho card/bảng/dialog.
- Chiều cao control: `control-md` 40px mặc định; `control-lg` 44px cho nút chính trên mobile và form đăng nhập; `control-sm` 32px cho nút thao tác trong bảng.

## Bố cục

- **Desktop ≥ 768px:** sidebar `sidebar-w` 248px, nền `sidebar` đặc. Header trắng cao `header-h` 64px. Nội dung tối đa 1280px, padding `space-6`.
- **Mobile:** ẩn sidebar, có thanh điều hướng dưới cùng gồm 5 mục, mỗi mục ít nhất 44px. Bảng chuyển thành danh sách thẻ.
- **Mỗi trang:** tiêu đề trang + mô tả ngắn bên trái, hành động chính (một nút `brand-blue`) bên phải; bên dưới là thanh lọc/tìm kiếm, rồi đến nội dung.

## Biểu tượng

Dùng [lucide-react](https://lucide.dev), nét 1.75–2px, cỡ 16px trong nút và bảng, 20px trong thẻ KPI. Biểu tượng luôn đi kèm chữ, trừ nút chỉ có icon (khi đó bắt buộc có `aria-label`). Không dùng emoji.

## Logo

`assets/Logos/`: Vingroup và Vincons. Trên sidebar đặt cạnh nhau, ngăn bằng một vạch `sidebar-line`, đổi sang màu trắng (`brightness-0 invert`). Trên nền trắng dùng bản màu gốc.

## Chưa đồng bộ

- Nguồn: code trong thư mục `worker-management` (không phải repo GitHub).
- Component: chưa build bundle sống. Các thẻ preview là **bản dựng tĩnh viết tay** theo `src/components/ui/*` (shadcn base-nova trên `@base-ui/react`, React 19). Thư viện này cần React 19 nên không chạy được trên React 18 của trang preview.
- Bỏ qua: gradient `sidebar-gradient`, `brand-header-gradient`, các màu Tailwind rời (`gray-*`, `slate-*`, `blue-*`, `amber-*`…), giờ được gom vào các token ở trên.
- Lỗi code cần sửa: `tailwind.config.ts` khai báo `oklch(var(--x) / <alpha-value>)` trong khi biến CSS đã chứa sẵn `oklch(...)`, nên các class `bg-primary`, `border-border`… không ra màu. Ngoài ra `--font-sans` bị khai báo hai lần.
