# StatCard

Thẻ chỉ số (KPI) trên Dashboard: nhãn, icon trong ô màu soft, con số lớn và một dòng mô tả.

- Bấm vào thẻ sẽ mở danh sách đã lọc tương ứng (ví dụ "Thẻ sắp hết hạn" mở `/workers?filter=expiring`), nên toàn bộ thẻ là một `<a>`.
- Màu icon theo nghĩa: `brand-blue` cho tổng số, `warning` cho sắp hết hạn, `danger` cho thiếu hoặc quá hạn.
- Con số dùng `stat-value` kèm `tabular-nums`. Không còn icon `TrendingUp` trang trí như code cũ.

Thay cho component `StatCard` trong `src/app/(dashboard)/page.tsx`.
