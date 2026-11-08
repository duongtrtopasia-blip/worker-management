# DataTable

Bảng dữ liệu đặt trong một card, dùng cho danh sách công nhân, nhật ký thao tác và tài liệu.

- Header nền `surface-sunken`, chữ `overline` màu `ink-muted`. Mỗi dòng có padding 12px 16px, ngăn nhau bằng viền `line`.
- Cột đầu là người (avatar 36px, tên `body-strong`, MNV `caption`). Cột trạng thái dùng Badge. Cột thao tác căn phải, dùng nút `ghost sm`.
- Dòng đang chọn: nền `brand-blue-soft` kèm `aria-selected`.
- Dưới 768px bảng chuyển thành danh sách card, mỗi công nhân một card (xem mockup trên canvas).

Viết tay theo `src/components/ui/table.tsx`.
