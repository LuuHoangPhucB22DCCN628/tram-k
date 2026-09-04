# Design tokens Trạm K

Design tokens là bộ giá trị dùng chung để giao diện không bị mỗi trang một màu, một khoảng cách hoặc một kiểu focus khác nhau.

## Cấu trúc

- `src/styles/_tokens.scss`: màu, font, spacing, radius, shadow và breakpoint.
- `src/styles/_mixins.scss`: mixin `focus-ring` và `respond-from`.
- `src/styles/_base.scss`: thiết lập nền cho toàn bộ website.
- `src/styles.scss`: điểm nạp các file SCSS dùng chung.

## Dùng trong HTML với Tailwind

```html
<button class="bg-[var(--color-brand-primary)] text-white">Đăng ký</button>
```

## Dùng trong SCSS của component

```scss
@use 'styles/mixins';

.community-card {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);

  @include mixins.respond-from(md) {
    padding: var(--space-8);
  }
}
```

## Quy ước cho nhóm

1. Ưu tiên token ngữ nghĩa như `--color-text-muted`; không ghi lại mã màu trực tiếp trong component.
2. Khoảng cách chọn từ `--space-1` đến `--space-20`.
3. Responsive dùng các mốc `sm`, `md`, `lg`, `xl`, `2xl` giống Tailwind.
4. Không xóa viền focus; mọi thành phần tương tác phải nhìn thấy focus khi dùng bàn phím.
5. Chỉ bổ sung token mới khi giá trị đó được dùng lặp lại hoặc có ý nghĩa chung cho sản phẩm.
