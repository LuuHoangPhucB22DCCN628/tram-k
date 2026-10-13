export type SearchResultType = 'GUIDE' | 'CANCER_TYPE' | 'STORY' | 'PODCAST' | 'SUPPORT_PROGRAM';

export interface SearchResultItem {
  readonly id: string;
  readonly type: SearchResultType;
  readonly title: string;
  readonly description: string;
  readonly eyebrow: string;
  readonly metadata: string;
  readonly image?: string;
  readonly imageAlt?: string;
  readonly link: string;
  readonly queryParams?: Readonly<Record<string, string>>;
  readonly publishedAt: string;
  readonly score: number;
}

export interface SearchTypeOption {
  readonly value: 'ALL' | SearchResultType;
  readonly label: string;
}

export const SEARCH_TYPE_OPTIONS: readonly SearchTypeOption[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'GUIDE', label: 'Cẩm nang' },
  { value: 'CANCER_TYPE', label: 'Loại ung thư' },
  { value: 'STORY', label: 'Câu chuyện' },
  { value: 'PODCAST', label: 'Podcast' },
  { value: 'SUPPORT_PROGRAM', label: 'Chương trình hỗ trợ' },
];

export function isSearchResultType(value: string | null): value is SearchResultType {
  return SEARCH_TYPE_OPTIONS.some((option) => option.value !== 'ALL' && option.value === value);
}
