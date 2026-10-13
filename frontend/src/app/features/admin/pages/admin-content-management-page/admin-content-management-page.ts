import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { ManagedResourceSyncService } from '@core/data/managed-resource-sync.service';
import { MediaUploadApiService, type MediaUploadKind } from '@core/data/media-upload-api.service';

import { MOCK_CONTENT_ITEMS } from '@features/content/data/content.mock-data';
import type {
  ContentDetail,
  ContentImage,
  ContentKind,
  ContentPublicationStatus,
  ContentSection,
} from '@features/content/models/content.models';
import { ContentAdminStorageService } from '@features/content/services/content-admin-storage.service';
import {
  DEFAULT_EDITOR_COVER_IMAGE,
  isDefaultEditorCover,
} from '@features/content/services/content-cover.utils';
import { DEFAULT_PODCASTS } from '@features/mental-health/data/podcast.data';
import type {
  PodcastItem,
  PodcastPublicationStatus,
} from '@features/mental-health/models/podcast.models';
import { PodcastAdminStorageService } from '@features/mental-health/services/podcast-admin-storage.service';
import { EscapeCloseDirective } from '@shared/directives/escape-close.directive';

import { ArticleBlockEditorComponent } from './article-block-editor/article-block-editor.component';
import type {
  ArticleEditorBlock,
  EditableBlockField,
  EditorBlockType,
} from './article-block-editor/article-block-editor.types';
import { ArticlePreviewComponent } from './article-preview/article-preview.component';
import type { ArticlePreviewData } from './article-preview/article-preview.types';
import { AdminContentBootstrapService } from '../../services/admin-content-bootstrap.service';

type ContentFilter = ContentKind | 'ALL';
type ContentEditorValue = {
  kind: ContentKind;
  title: string;
  excerpt: string;
  categoryName: string;
  status: ContentPublicationStatus;
  imageAlt: string;
  imageCaption: string;
};

type ContentCategoryOption = ContentDetail['category'];
type ContentKindSetting = {
  label: string;
  destination: string;
  publicPath: string;
  categories: readonly ContentCategoryOption[];
};

const CONTENT_KIND_SETTINGS = {
  GUIDE: {
    label: 'Cẩm nang',
    destination: 'Cẩm nang đồng hành',
    publicPath: '/cam-nang',
    categories: [
      { id: 'CAT-NUTRITION', name: 'Chế độ dinh dưỡng', slug: 'dinh-duong' },
      { id: 'CAT-SIGNS', name: 'Dấu hiệu', slug: 'dau-hieu' },
      { id: 'CAT-TREATMENT', name: 'Điều trị', slug: 'dieu-tri' },
      { id: 'CAT-CARE', name: 'Chăm sóc', slug: 'cham-soc' },
    ],
  },
  STORY: {
    label: 'Câu chuyện',
    destination: 'Câu chuyện truyền cảm hứng',
    publicPath: '/cau-chuyen',
    categories: [
      { id: 'CAT-PATIENT-STORY', name: 'Hành trình người bệnh', slug: 'nguoi-benh' },
      { id: 'CAT-COMPANION', name: 'Người đồng hành', slug: 'nguoi-dong-hanh' },
    ],
  },
  CANCER_TYPE: {
    label: 'Loại ung thư',
    destination: 'Loại ung thư khác',
    publicPath: '/loai-ung-thu',
    categories: [{ id: 'CAT-CANCER-INFO', name: 'Thông tin bệnh', slug: 'thong-tin-benh' }],
  },
} as const satisfies Readonly<Record<ContentKind, ContentKindSetting>>;

const MAX_COVER_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_COVER_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PODCAST_AUDIO_BYTES = 30 * 1024 * 1024;
@Component({
  selector: 'app-admin-content-management-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    EscapeCloseDirective,
    ArticleBlockEditorComponent,
    ArticlePreviewComponent,
  ],
  templateUrl: './admin-content-management-page.html',
  styleUrl: './admin-content-management-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminContentManagementPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly storage = inject(ContentAdminStorageService);
  private readonly podcastStorage = inject(PodcastAdminStorageService);
  private readonly resourceSync = inject(ManagedResourceSyncService);
  private readonly mediaUpload = inject(MediaUploadApiService);
  private readonly contentBootstrap = inject(AdminContentBootstrapService);

  protected readonly searchTerm = signal('');
  protected readonly kindFilter = signal<ContentFilter>('ALL');
  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly feedback = signal('');
  protected readonly coverImage = signal<ContentImage | null>(null);
  protected readonly imageError = signal('');
  protected readonly imageDragActive = signal(false);
  protected readonly blocks = signal<readonly ArticleEditorBlock[]>([]);
  protected readonly blockErrors = signal<Readonly<Record<string, string>>>({});
  protected readonly editorError = signal('');
  protected readonly preview = signal<ArticlePreviewData | null>(null);
  protected readonly podcastEditorOpen = signal(false);
  protected readonly podcastEditingId = signal<string | null>(null);
  protected readonly podcastSubmitted = signal(false);
  protected readonly podcastCoverImage = signal<ContentImage | null>(null);
  protected readonly podcastAudioUrl = signal('');
  protected readonly podcastAudioName = signal('');
  protected readonly podcastError = signal('');
  protected readonly mediaUploadsPending = signal(0);
  protected readonly bootstrapLoading = this.contentBootstrap.loading;
  protected readonly bootstrapMessage = this.contentBootstrap.message;
  protected readonly syncError = this.resourceSync.lastError;
  protected readonly items = computed(() => {
    this.storage.changes();
    const search = this.normalize(this.searchTerm());
    const kind = this.kindFilter();
    return this.storage
      .resolve(MOCK_CONTENT_ITEMS)
      .filter((item) => kind === 'ALL' || item.kind === kind)
      .filter(
        (item) =>
          !search ||
          this.normalize(`${item.title} ${item.excerpt} ${item.category.name}`).includes(search),
      );
  });
  protected readonly podcastItems = computed(() => {
    this.podcastStorage.changes();
    const search = this.normalize(this.searchTerm());
    return this.podcastStorage
      .resolve(DEFAULT_PODCASTS)
      .filter(
        (item) =>
          !search ||
          this.normalize(`${item.title} ${item.description} ${item.source}`).includes(search),
      )
      .sort((first, second) => second.publishedAt.localeCompare(first.publishedAt));
  });
  protected readonly form = this.formBuilder.nonNullable.group({
    kind: ['GUIDE' as ContentKind, Validators.required],
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(160)]],
    excerpt: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
    categoryName: ['', [Validators.required, Validators.maxLength(80)]],
    status: ['DRAFT' as ContentPublicationStatus, Validators.required],
    imageAlt: ['', Validators.maxLength(160)],
    imageCaption: ['', Validators.maxLength(240)],
  });
  protected readonly podcastForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(160)]],
    description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
    source: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    status: ['DRAFT' as PodcastPublicationStatus, Validators.required],
    imageAlt: ['', [Validators.required, Validators.maxLength(160)]],
    audioUrl: ['', Validators.maxLength(2000)],
  });
  private originalSections: readonly ContentSection[] = [];
  private originalBlocksFingerprint = '';
  private blockSequence = 0;

  constructor() {
    this.contentBootstrap.initialize();
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateKind(event: Event): void {
    this.kindFilter.set((event.target as HTMLSelectElement).value as ContentFilter);
  }

  protected changeEditorKind(): void {
    this.form.controls.categoryName.reset('');
  }

  protected kindSetting(kind: ContentKind): ContentKindSetting {
    return CONTENT_KIND_SETTINGS[kind];
  }

  protected categoryPlaceholder(kind: ContentKind): string {
    return `Ví dụ: ${CONTENT_KIND_SETTINGS[kind].categories[0].name}`;
  }

  protected publicationStatusMessage(status: ContentPublicationStatus): string {
    return {
      DRAFT: 'Bản nháp chưa xuất hiện trên trang công khai.',
      PUBLISHED: 'Bài sẽ xuất hiện trên trang công khai sau khi lưu.',
      ARCHIVED: 'Bài đang được ẩn khỏi trang công khai.',
    }[status];
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      kind: 'GUIDE',
      title: '',
      excerpt: '',
      categoryName: '',
      status: 'DRAFT',
      imageAlt: '',
      imageCaption: '',
    });
    this.originalSections = [];
    const blocks = [this.createBlock('PARAGRAPH')];
    this.blocks.set(blocks);
    this.originalBlocksFingerprint = this.blocksFingerprint(blocks);
    this.blockErrors.set({});
    this.editorError.set('');
    this.coverImage.set(null);
    this.imageError.set('');
    this.editorOpen.set(true);
    this.feedback.set('');
  }

  protected openEdit(item: ContentDetail): void {
    const blocks = this.sectionsToBlocks(item.sections, item.excerpt);
    const coverImage = isDefaultEditorCover(item.coverImage) ? null : item.coverImage;
    this.editingId.set(item.id);
    this.form.setValue({
      kind: item.kind,
      title: item.title,
      excerpt: item.excerpt,
      categoryName: item.category.name,
      status: item.status,
      imageAlt: coverImage?.alt ?? '',
      imageCaption: coverImage?.caption ?? '',
    });
    this.originalSections = item.sections;
    this.blocks.set(blocks);
    this.originalBlocksFingerprint = this.blocksFingerprint(blocks);
    this.blockErrors.set({});
    this.editorError.set('');
    this.coverImage.set(coverImage);
    this.imageError.set('');
    this.editorOpen.set(true);
    this.feedback.set('');
  }

  protected closeEditor(): void {
    this.closePreview();
    this.editorOpen.set(false);
    this.editingId.set(null);
    this.submitted.set(false);
    this.imageDragActive.set(false);
    this.blockErrors.set({});
    this.editorError.set('');
  }

  protected openPodcastCreate(): void {
    this.podcastEditingId.set(null);
    this.podcastForm.reset({
      title: '',
      description: '',
      source: '',
      status: 'DRAFT',
      imageAlt: '',
      audioUrl: '',
    });
    this.podcastCoverImage.set(null);
    this.podcastAudioUrl.set('');
    this.podcastAudioName.set('');
    this.podcastError.set('');
    this.podcastSubmitted.set(false);
    this.podcastEditorOpen.set(true);
    this.feedback.set('');
  }

  protected openPodcastEdit(item: PodcastItem): void {
    this.podcastEditingId.set(item.id);
    this.podcastForm.setValue({
      title: item.title,
      description: item.description,
      source: item.source,
      status: item.status,
      imageAlt: item.imageAlt,
      audioUrl: item.audioUrl?.startsWith('data:') ? '' : (item.audioUrl ?? ''),
    });
    this.podcastCoverImage.set({
      url: item.image,
      alt: item.imageAlt,
      width: 800,
      height: 800,
    });
    this.podcastAudioUrl.set(item.audioUrl ?? '');
    this.podcastAudioName.set(item.audioUrl?.startsWith('data:') ? 'Tệp âm thanh đã tải lên' : '');
    this.podcastError.set('');
    this.podcastSubmitted.set(false);
    this.podcastEditorOpen.set(true);
    this.feedback.set('');
  }

  protected closePodcastEditor(): void {
    this.podcastEditorOpen.set(false);
    this.podcastEditingId.set(null);
    this.podcastSubmitted.set(false);
    this.podcastError.set('');
  }

  protected selectPodcastCover(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.readImageFile(
        file,
        (image, fallbackAlt) => {
          this.podcastCoverImage.set(image);
          this.podcastForm.controls.imageAlt.setValue(fallbackAlt);
          this.podcastError.set('');
          this.uploadMedia(
            file,
            'image',
            (url) => {
              const current = this.podcastCoverImage();
              if (current?.url === image.url) {
                this.podcastCoverImage.set({ ...current, url });
              }
            },
            (message) => this.podcastError.set(message),
          );
        },
        (message) => this.podcastError.set(message),
        this.podcastForm.controls.title.value.trim(),
      );
    }
    input.value = '';
  }

  protected removePodcastCover(): void {
    this.podcastCoverImage.set(null);
    this.podcastForm.controls.imageAlt.setValue('');
  }

  protected selectPodcastAudio(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      this.podcastError.set('Chỉ hỗ trợ tệp âm thanh MP3, M4A, AAC, OGG hoặc WAV.');
      input.value = '';
      return;
    }
    if (file.size > MAX_PODCAST_AUDIO_BYTES) {
      this.podcastError.set('Tệp âm thanh tải trực tiếp tối đa 30 MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => this.podcastError.set('Không thể đọc tệp âm thanh đã chọn.');
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      this.podcastAudioUrl.set(reader.result);
      this.podcastAudioName.set(file.name);
      this.podcastForm.controls.audioUrl.setValue('');
      this.podcastError.set('');
      this.uploadMedia(
        file,
        'audio',
        (url) => {
          if (this.podcastAudioUrl() === reader.result) this.podcastAudioUrl.set(url);
        },
        (message) => this.podcastError.set(message),
      );
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  protected removePodcastAudio(): void {
    this.podcastAudioUrl.set('');
    this.podcastAudioName.set('');
    this.podcastForm.controls.audioUrl.setValue('');
  }

  protected savePodcast(): void {
    this.podcastSubmitted.set(true);
    this.podcastError.set('');
    if (this.mediaUploadsPending() > 0) {
      this.podcastError.set('Tệp đang được tải lên máy chủ. Vui lòng chờ trong giây lát.');
      return;
    }
    if (this.podcastForm.invalid) {
      this.podcastForm.markAllAsTouched();
      return;
    }

    const value = this.podcastForm.getRawValue();
    const cover = this.podcastCoverImage();
    const audioUrl = value.audioUrl.trim() || this.podcastAudioUrl();
    const editingId = this.podcastEditingId();
    const currentPodcast = editingId
      ? this.podcastItems().find((podcast) => podcast.id === editingId)
      : undefined;
    const isDefaultPodcast = currentPodcast
      ? DEFAULT_PODCASTS.some((podcast) => podcast.id === currentPodcast.id)
      : false;
    if (!cover) {
      this.podcastError.set('Vui lòng thêm ảnh đại diện cho podcast.');
      return;
    }
    if (value.status === 'PUBLISHED' && !audioUrl && !isDefaultPodcast) {
      this.podcastError.set('Podcast công khai cần có tệp hoặc đường dẫn âm thanh.');
      return;
    }

    const now = new Date().toISOString();
    const values = {
      title: value.title.trim(),
      description: value.description.trim(),
      source: value.source.trim(),
      image: cover.url,
      imageAlt: value.imageAlt.trim(),
      audioUrl: audioUrl || undefined,
      status: value.status,
    };
    let savedPodcast: PodcastItem;
    if (editingId && currentPodcast) {
      const changes = {
        ...values,
        ...(value.status === 'PUBLISHED' && currentPodcast?.status !== 'PUBLISHED'
          ? { publishedAt: now }
          : {}),
      };
      this.podcastStorage.update(editingId, changes);
      savedPodcast = { ...currentPodcast, ...changes };
      this.feedback.set('Đã cập nhật podcast.');
    } else {
      savedPodcast = {
        id: `PODCAST-${Date.now()}`,
        ...values,
        publishedAt: now,
      };
      this.podcastStorage.create(savedPodcast);
      this.feedback.set('Đã tạo podcast mới.');
    }
    this.syncPodcast(savedPodcast);
    this.closePodcastEditor();
  }

  protected togglePodcastVisibility(item: PodcastItem): void {
    const nextStatus: PodcastPublicationStatus =
      item.status === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED';
    const isDefaultPodcast = DEFAULT_PODCASTS.some((podcast) => podcast.id === item.id);
    if (nextStatus === 'PUBLISHED' && !item.audioUrl && !isDefaultPodcast) {
      this.openPodcastEdit(item);
      this.podcastError.set('Podcast công khai cần có tệp hoặc đường dẫn âm thanh.');
      return;
    }
    const changes = {
      status: nextStatus,
      ...(nextStatus === 'PUBLISHED' ? { publishedAt: new Date().toISOString() } : {}),
    };
    this.podcastStorage.update(item.id, changes);
    this.syncPodcast({ ...item, ...changes });
    this.feedback.set(nextStatus === 'PUBLISHED' ? 'Đã công khai podcast.' : 'Đã ẩn podcast.');
  }

  protected openPreview(): void {
    const value = this.form.getRawValue();
    const currentCover = this.coverImage();
    const title = value.title.trim();
    const excerpt = value.excerpt.trim();
    const categoryName = value.categoryName.trim();
    this.preview.set({
      title: title || 'Tiêu đề bài viết chưa được nhập',
      excerpt: excerpt || 'Tóm tắt bài viết sẽ hiển thị tại đây.',
      categoryName: categoryName || 'Chưa phân loại',
      authorName: 'Ban biên tập Trạm K',
      readingMinutes: this.calculateReadingMinutes(this.blocksToPlainText(this.blocks())),
      coverImage: currentCover ? this.resolveCoverImage(currentCover, value) : null,
      blocks: this.blocks(),
    });
  }

  protected closePreview(): void {
    this.preview.set(null);
  }

  protected addBlock(type: EditorBlockType): void {
    this.blocks.update((blocks) => [...blocks, this.createBlock(type)]);
    this.editorError.set('');
  }

  protected updateBlockField(blockId: string, field: EditableBlockField, value: string): void {
    this.updateBlock(blockId, { [field]: value });
    this.clearBlockError(blockId);
  }

  protected moveBlock(blockId: string, direction: -1 | 1): void {
    this.blocks.update((blocks) => {
      const index = blocks.findIndex((block) => block.id === blockId);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= blocks.length) return blocks;
      const reordered = [...blocks];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      return reordered;
    });
  }

  protected removeBlock(blockId: string): void {
    this.blocks.update((blocks) => blocks.filter((block) => block.id !== blockId));
    this.clearBlockError(blockId);
  }

  protected selectInlineImage(blockId: string, file: File): void {
    this.readImageFile(
      file,
      (image, fallbackAlt) => {
        this.updateBlock(blockId, { image, imageAlt: fallbackAlt });
        this.clearBlockError(blockId);
        this.uploadMedia(
          file,
          'image',
          (url) => {
            const current = this.blocks().find((block) => block.id === blockId)?.image;
            if (current?.url === image.url) {
              this.updateBlock(blockId, { image: { ...current, url } });
            }
          },
          (message) => this.setBlockError(blockId, message),
        );
      },
      (message) => this.setBlockError(blockId, message),
    );
  }

  protected removeInlineImage(blockId: string): void {
    this.updateBlock(blockId, { image: null, imageAlt: '', imageCaption: '' });
    this.clearBlockError(blockId);
  }

  protected blockTypeLabel(type: EditorBlockType): string {
    return {
      HEADING: 'Tiêu đề phụ',
      PARAGRAPH: 'Đoạn văn',
      BULLETS: 'Danh sách',
      IMAGE: 'Hình ảnh',
    }[type];
  }

  protected selectCoverImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.loadCoverImage(file);
    input.value = '';
  }

  protected activateImageDropzone(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    this.imageDragActive.set(true);
  }

  protected deactivateImageDropzone(event: DragEvent): void {
    event.preventDefault();
    this.imageDragActive.set(false);
  }

  protected dropCoverImage(event: DragEvent): void {
    event.preventDefault();
    this.imageDragActive.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.loadCoverImage(file);
  }

  protected removeCoverImage(): void {
    this.coverImage.set(null);
    this.form.controls.imageAlt.setValue('');
    this.form.controls.imageCaption.setValue('');
    this.imageError.set('');
  }

  protected save(): void {
    this.submitted.set(true);
    this.editorError.set('');
    if (this.mediaUploadsPending() > 0) {
      this.editorError.set('Tệp đang được tải lên máy chủ. Vui lòng chờ trong giây lát.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const currentCover = this.coverImage();
    const imageAlt = value.imageAlt.trim();
    if (currentCover && !imageAlt) {
      this.imageError.set(
        'Vui lòng thêm mô tả ảnh để người dùng trình đọc màn hình hiểu nội dung.',
      );
      return;
    }
    if (value.status === 'PUBLISHED' && !currentCover) {
      this.imageError.set('Bài đăng công khai cần có ảnh đại diện.');
      return;
    }

    const blocks = this.blocks();
    const blockValidationMessage = this.validateBlocks(blocks);
    if (blockValidationMessage) {
      this.editorError.set(blockValidationMessage);
      return;
    }

    const coverImage = this.resolveCoverImage(currentCover, value);
    const sections =
      this.blocksFingerprint(blocks) === this.originalBlocksFingerprint
        ? this.originalSections
        : this.blocksToSections(blocks);
    const articleText = this.blocksToPlainText(blocks);
    const categoryName = value.categoryName.trim();
    const category = this.resolveCategory(value.kind, categoryName);
    const readingMinutes = this.calculateReadingMinutes(articleText);
    const editingId = this.editingId();
    let savedContent: ContentDetail;
    if (editingId) {
      const current = this.items().find((item) => item.id === editingId);
      if (!current) {
        this.editorError.set('Không tìm thấy nội dung cần cập nhật.');
        return;
      }
      const changes = {
        title: value.title.trim(),
        excerpt: value.excerpt.trim(),
        category,
        coverImage,
        sections,
        readingMinutes,
        status: value.status,
      };
      this.storage.update(editingId, changes);
      savedContent = { ...current, ...changes };
      this.feedback.set('Đã cập nhật nội dung.');
    } else {
      savedContent = this.createContent(value, category, coverImage, sections, readingMinutes);
      this.storage.create(savedContent);
      this.feedback.set('Đã tạo nội dung mới.');
    }
    this.syncContent(savedContent);
    this.closeEditor();
  }

  protected toggleVisibility(item: ContentDetail): void {
    if (item.status !== 'PUBLISHED' && isDefaultEditorCover(item.coverImage)) {
      this.openEdit(item);
      this.imageError.set('Vui lòng thêm ảnh đại diện trước khi công khai bài viết.');
      return;
    }
    const status = item.status === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED';
    this.storage.update(item.id, { status });
    this.syncContent({ ...item, status });
    this.feedback.set(item.status === 'PUBLISHED' ? 'Đã ẩn nội dung.' : 'Đã công khai nội dung.');
  }

  protected kindLabel(kind: ContentKind): string {
    return CONTENT_KIND_SETTINGS[kind].label;
  }

  protected statusLabel(status: ContentPublicationStatus): string {
    return {
      DRAFT: 'Bản nháp',
      PUBLISHED: 'Đang công khai',
      ARCHIVED: 'Đã ẩn',
    }[status];
  }

  private syncContent(item: ContentDetail): void {
    const basePath = {
      GUIDE: '/cam-nang',
      STORY: '/cau-chuyen/bai-viet',
      CANCER_TYPE: '/loai-ung-thu/bai-viet',
    }[item.kind];
    this.resourceSync.upsert({
      sourceId: item.id,
      type: item.kind,
      status: item.status,
      title: item.title,
      description: item.excerpt,
      eyebrow: this.kindLabel(item.kind),
      metadata: `${item.category.name} · ${item.readingMinutes} phút đọc`,
      imageUrl: item.coverImage.url,
      imageAlt: item.coverImage.alt,
      link: `${basePath}/${item.slug}`,
      publishedAt: item.publishedAt,
      payload: item as unknown as Readonly<Record<string, unknown>>,
    });
  }

  private syncPodcast(item: PodcastItem): void {
    this.resourceSync.upsert({
      sourceId: item.id,
      type: 'PODCAST',
      status: item.status,
      title: item.title,
      description: item.description,
      eyebrow: 'Podcast',
      metadata: item.source,
      imageUrl: item.image,
      imageAlt: item.imageAlt,
      link: '/goc-tam-ly',
      publishedAt: item.publishedAt,
      payload: item as unknown as Readonly<Record<string, unknown>>,
    });
  }

  private createContent(
    value: ContentEditorValue,
    category: ContentDetail['category'],
    coverImage: ContentImage,
    sections: readonly ContentSection[],
    readingMinutes: number,
  ): ContentDetail {
    const title = value.title.trim();
    const slug = `${this.slugify(title)}-${Date.now().toString(36)}`;
    return {
      id: `CONTENT-${Date.now()}`,
      kind: value.kind as ContentKind,
      slug,
      title,
      excerpt: value.excerpt.trim(),
      category,
      tags: [],
      coverImage,
      publishedAt: new Date().toISOString(),
      readingMinutes,
      featured: false,
      status: value.status,
      authorName: 'Ban biên tập Trạm K',
      sections,
      sources: [],
    };
  }

  private resolveCategory(kind: ContentKind, categoryName: string): ContentCategoryOption {
    const knownCategory = CONTENT_KIND_SETTINGS[kind].categories.find(
      (category) => this.normalize(category.name) === this.normalize(categoryName),
    );
    if (knownCategory) return knownCategory;

    const slug = this.slugify(categoryName);
    return { id: `CAT-${slug}`, name: categoryName, slug };
  }

  private loadCoverImage(file: File): void {
    this.imageError.set('');
    this.readImageFile(
      file,
      (image, fallbackAlt) => {
        this.form.controls.imageAlt.setValue(fallbackAlt);
        this.coverImage.set(image);
        this.uploadMedia(
          file,
          'image',
          (url) => {
            const current = this.coverImage();
            if (current?.url === image.url) this.coverImage.set({ ...current, url });
          },
          (message) => this.imageError.set(message),
        );
      },
      (message) => this.imageError.set(message),
    );
  }

  private resolveCoverImage(
    currentCover: ContentImage | null,
    value: ContentEditorValue,
  ): ContentImage {
    if (!currentCover) return DEFAULT_EDITOR_COVER_IMAGE;
    const caption = value.imageCaption.trim();
    return {
      ...currentCover,
      alt: value.imageAlt.trim(),
      ...(caption ? { caption } : { caption: undefined }),
    };
  }

  private sectionsToBlocks(
    sections: readonly ContentSection[],
    fallback: string,
  ): readonly ArticleEditorBlock[] {
    const blocks = sections.flatMap((section) => [
      ...(section.heading ? [this.createBlock('HEADING', { text: section.heading })] : []),
      ...section.paragraphs.map((paragraph) => this.createBlock('PARAGRAPH', { text: paragraph })),
      ...(section.bullets?.length
        ? [this.createBlock('BULLETS', { text: section.bullets.join('\n') })]
        : []),
      ...(section.image
        ? [
            this.createBlock('IMAGE', {
              image: section.image,
              imageAlt: section.image.alt,
              imageCaption: section.imageCaption ?? '',
            }),
          ]
        : []),
    ]);
    return blocks.length ? blocks : [this.createBlock('PARAGRAPH', { text: fallback })];
  }

  private blocksToSections(blocks: readonly ArticleEditorBlock[]): readonly ContentSection[] {
    return blocks.map((block) => {
      if (block.type === 'HEADING') return { heading: block.text.trim(), paragraphs: [] };
      if (block.type === 'BULLETS') {
        return {
          paragraphs: [],
          bullets: block.text
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
        };
      }
      if (block.type === 'IMAGE' && block.image) {
        return {
          paragraphs: [],
          image: { ...block.image, alt: block.imageAlt.trim() },
          ...(block.imageCaption.trim() ? { imageCaption: block.imageCaption.trim() } : {}),
        };
      }
      return { paragraphs: [block.text.trim()] };
    });
  }

  private blocksToPlainText(blocks: readonly ArticleEditorBlock[]): string {
    return blocks
      .filter((block) => block.type !== 'IMAGE')
      .map((block) => block.text.trim())
      .filter(Boolean)
      .join(' ');
  }

  private validateBlocks(blocks: readonly ArticleEditorBlock[]): string | null {
    if (!blocks.length) return 'Bài viết cần có ít nhất một khối nội dung.';
    const emptyTextBlock = blocks.find((block) => block.type !== 'IMAGE' && !block.text.trim());
    if (emptyTextBlock) return `Khối ${this.blockTypeLabel(emptyTextBlock.type)} chưa có nội dung.`;

    const invalidImageBlock = blocks.find(
      (block) => block.type === 'IMAGE' && (!block.image || !block.imageAlt.trim()),
    );
    if (invalidImageBlock) {
      this.setBlockError(invalidImageBlock.id, 'Vui lòng chọn ảnh và nhập mô tả ảnh.');
      return 'Một khối hình ảnh chưa hoàn thiện.';
    }
    return null;
  }

  private createBlock(
    type: EditorBlockType,
    values: Partial<ArticleEditorBlock> = {},
  ): ArticleEditorBlock {
    this.blockSequence += 1;
    return {
      id: `editor-block-${this.blockSequence}`,
      type,
      text: '',
      image: null,
      imageAlt: '',
      imageCaption: '',
      ...values,
    };
  }

  private updateBlock(blockId: string, values: Partial<ArticleEditorBlock>): void {
    this.blocks.update((blocks) =>
      blocks.map((block) => (block.id === blockId ? { ...block, ...values } : block)),
    );
  }

  private blocksFingerprint(blocks: readonly ArticleEditorBlock[]): string {
    return JSON.stringify(
      blocks.map(({ type, text, image, imageAlt, imageCaption }) => ({
        type,
        text,
        image,
        imageAlt,
        imageCaption,
      })),
    );
  }

  private setBlockError(blockId: string, message: string): void {
    this.blockErrors.update((errors) => ({ ...errors, [blockId]: message }));
  }

  private clearBlockError(blockId: string): void {
    this.blockErrors.update((errors) => {
      if (!errors[blockId]) return errors;
      const nextErrors = { ...errors };
      delete nextErrors[blockId];
      return nextErrors;
    });
  }

  private readImageFile(
    file: File,
    onSuccess: (image: ContentImage, fallbackAlt: string) => void,
    onError: (message: string) => void,
    fallbackAltValue = this.form.controls.title.value.trim(),
  ): void {
    if (!ACCEPTED_COVER_IMAGE_TYPES.includes(file.type)) {
      onError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > MAX_COVER_IMAGE_BYTES) {
      onError('Ảnh vượt quá 2 MB. Vui lòng nén ảnh trước khi tải lên.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => onError('Không thể đọc ảnh. Vui lòng chọn tệp khác.');
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        onError('Không thể đọc ảnh. Vui lòng chọn tệp khác.');
        return;
      }
      const imageElement = new Image();
      imageElement.onerror = () => onError('Tệp đã chọn không phải ảnh hợp lệ.');
      imageElement.onload = () => {
        const fallbackAlt = fallbackAltValue || this.fileNameToAlt(file.name);
        onSuccess(
          {
            url: reader.result as string,
            alt: fallbackAlt,
            width: imageElement.naturalWidth || 1200,
            height: imageElement.naturalHeight || 675,
          },
          fallbackAlt,
        );
      };
      imageElement.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  private uploadMedia(
    file: File,
    kind: MediaUploadKind,
    onSuccess: (url: string) => void,
    onError: (message: string) => void,
  ): void {
    this.mediaUploadsPending.update((count) => count + 1);
    this.mediaUpload
      .upload(file, kind)
      .pipe(finalize(() => this.mediaUploadsPending.update((count) => Math.max(0, count - 1))))
      .subscribe((uploaded) => {
        if (uploaded) onSuccess(uploaded.url);
        else onError(this.mediaUpload.lastError());
      });
  }

  private calculateReadingMinutes(body: string): number {
    const words = body.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  private fileNameToAlt(fileName: string): string {
    return (
      fileName
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim() || 'Ảnh đại diện bài viết'
    );
  }

  private slugify(value: string): string {
    return this.normalize(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }
}
