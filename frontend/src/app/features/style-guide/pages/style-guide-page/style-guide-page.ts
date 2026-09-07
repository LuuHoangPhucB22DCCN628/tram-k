import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import {
  UiBadge,
  UiButton,
  UiCard,
  UiEmptyState,
  UiErrorState,
  UiInput,
  UiLoading,
  UiModal,
  UiPagination,
} from '@shared/ui';

interface ColorToken {
  readonly label: string;
  readonly variable: string;
}

@Component({
  selector: 'app-style-guide-page',
  standalone: true,
  imports: [
    UiBadge,
    UiButton,
    UiCard,
    UiEmptyState,
    UiErrorState,
    UiInput,
    UiLoading,
    UiModal,
    UiPagination,
  ],
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
  protected readonly sampleName = signal('Nguyễn An');
  protected readonly currentPage = signal(3);
  protected readonly isModalOpen = signal(false);
  protected readonly retryCount = signal(0);
}
