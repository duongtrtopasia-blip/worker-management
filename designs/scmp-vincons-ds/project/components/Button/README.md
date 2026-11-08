# Button

Nút hành động. Mỗi vùng chỉ có một nút `primary`, các nút còn lại dùng `secondary` hoặc `ghost`.

- **primary** (`brand-blue`): hành động chính của trang hoặc dialog, ví dụ "Thêm công nhân", "Lưu".
- **secondary** (viền `line-strong`): hành động phụ như "Xuất Excel", "Import", "In".
- **ghost**: Hủy, Đóng, thao tác trong dòng bảng.
- **danger** (`brand-red`): chỉ dùng để xác nhận xóa trong dialog.
- Kích thước: mặc định 40px; `sm` 32px cho thao tác trong bảng; nút chính trên mobile 44px.
- Nút chỉ có icon bắt buộc có `aria-label`.

Viết tay theo `src/components/ui/button.tsx`.
