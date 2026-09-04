import { ChangeDetectionStrategy, Component } from '@angular/core';

interface ColorToken {
  readonly label: string;
  readonly variable: string;
}

@Component({
  selector: 'app-style-guide-page',
  standalone: true,
  templateUrl: './style-guide-page.html',
  styleUrl: './style-guide-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StyleGuidePage {
  // Danh sách này chỉ giúp trang mẫu lặp qua các token màu đã khai báo trong SCSS.
  protected readonly colors: readonly ColorToken[] = [
    { label: 'Thương hiệu', variable: '--color-brand-primary' },
    { label: 'Thương hiệu nhạt', variable: '--color-brand-soft' },
    { label: 'Tiêu đề', variable: '--color-text-heading' },
    { label: 'Nội dung', variable: '--color-text-body' },
    { label: 'Chữ phụ', variable: '--color-text-muted' },
    { label: 'Viền', variable: '--color-border' },
    { label: 'Thành công', variable: '--color-success' },
    { label: 'Cảnh báo', variable: '--color-warning' },
    { label: 'Lỗi', variable: '--color-danger' },
  ];

  protected readonly spacingTokens = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20] as const;
}
