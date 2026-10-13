import { TestBed } from '@angular/core/testing';

import { MOCK_CONTENT_ITEMS } from '@features/content/data/content.mock-data';
import { ContentAdminStorageService } from '@features/content/services/content-admin-storage.service';

import { AdminContentManagementPage } from './admin-content-management-page';

describe('AdminContentManagementPage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('updates category suggestions and publication destination for each content kind', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminContentManagementPage],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminContentManagementPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.admin-content > header button')?.click();
    fixture.detectChanges();

    const categoryInput = element.querySelector<HTMLInputElement>(
      'input[formcontrolname="categoryName"]',
    )!;
    expect(categoryInput.placeholder).toBe('Ví dụ: Chế độ dinh dưỡng');
    expect(categoryOptions(element)).toEqual([
      'Chế độ dinh dưỡng',
      'Dấu hiệu',
      'Điều trị',
      'Chăm sóc',
    ]);

    categoryInput.value = 'Dấu hiệu';
    categoryInput.dispatchEvent(new Event('input'));
    changeSelect(element, 'kind', 'STORY');
    fixture.detectChanges();

    expect(categoryInput.value).toBe('');
    expect(categoryOptions(element)).toEqual(['Hành trình người bệnh', 'Người đồng hành']);
    expect(element.querySelector('.content-editor__destination')?.textContent).toContain(
      'Câu chuyện truyền cảm hứng',
    );
    expect(element.querySelector('.content-editor__destination')?.textContent).toContain(
      '/cau-chuyen',
    );
  });

  it('stores a suggested category with its canonical slug', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminContentManagementPage],
    }).compileComponents();
    const storage = TestBed.inject(ContentAdminStorageService);
    const fixture = TestBed.createComponent(AdminContentManagementPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.admin-content > header button')?.click();
    fixture.detectChanges();

    setInput(element, 'input[formcontrolname="title"]', 'Dinh dưỡng trong điều trị');
    setInput(
      element,
      'textarea[formcontrolname="excerpt"]',
      'Những lưu ý dinh dưỡng cần thiết trong quá trình điều trị ung thư.',
    );
    setInput(element, 'input[formcontrolname="categoryName"]', 'Chế độ dinh dưỡng');
    setInput(
      element,
      '.article-block textarea',
      'Nội dung hướng dẫn dinh dưỡng dành cho người bệnh trong quá trình điều trị.',
    );
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('form.content-editor button[type="submit"]')?.click();
    fixture.detectChanges();

    const createdItem = storage
      .resolve(MOCK_CONTENT_ITEMS)
      .find((item) => item.title === 'Dinh dưỡng trong điều trị');
    expect(createdItem?.category).toEqual({
      id: 'CAT-NUTRITION',
      name: 'Chế độ dinh dưỡng',
      slug: 'dinh-duong',
    });

    const row = [...element.querySelectorAll<HTMLTableRowElement>('tbody tr')].find((candidate) =>
      candidate.textContent?.includes('Dinh dưỡng trong điều trị'),
    );
    row?.querySelectorAll<HTMLButtonElement>('button')[1]?.click();
    fixture.detectChanges();

    expect(element.querySelector('.content-editor__error')?.textContent).toContain(
      'thêm ảnh đại diện',
    );
    expect(
      storage.resolve(MOCK_CONTENT_ITEMS).find((item) => item.title === 'Dinh dưỡng trong điều trị')
        ?.status,
    ).toBe('DRAFT');
  });

  it('opens a dedicated podcast editor without changing the article editor', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminContentManagementPage],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminContentManagementPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const podcastButton = [
      ...element.querySelectorAll<HTMLButtonElement>('.admin-content > header button'),
    ].find((button) => button.textContent?.includes('Thêm podcast'))!;

    podcastButton.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('form.podcast-editor')).toHaveLength(1);
    expect(element.querySelectorAll('form.content-editor:not(.podcast-editor)')).toHaveLength(0);
    expect(element.querySelector('input[formcontrolname="audioUrl"]')).not.toBeNull();
    expect(element.querySelector('input[type="file"][accept="audio/*"]')).not.toBeNull();
    expect(element.textContent).toContain('Tải trực tiếp tối đa 30 MB');
  });

  it('rejects podcast audio larger than 30 MB', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminContentManagementPage],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminContentManagementPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const podcastButton = [
      ...element.querySelectorAll<HTMLButtonElement>('.admin-content > header button'),
    ].find((button) => button.textContent?.includes('Thêm podcast'))!;

    podcastButton.click();
    fixture.detectChanges();

    const audioInput = element.querySelector<HTMLInputElement>(
      'input[type="file"][accept="audio/*"]',
    )!;
    Object.defineProperty(audioInput, 'files', {
      configurable: true,
      value: [
        {
          name: 'podcast-qua-lon.mp3',
          size: 30 * 1024 * 1024 + 1,
          type: 'audio/mpeg',
        },
      ],
    });
    audioInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(element.querySelector('.content-editor__error')?.textContent).toContain('tối đa 30 MB');
  });
});

function categoryOptions(element: HTMLElement): string[] {
  return Array.from(
    element.querySelectorAll<HTMLOptionElement>('#content-category-suggestions option'),
  ).map((option) => option.value);
}

function changeSelect(element: HTMLElement, controlName: string, value: string): void {
  const select = element.querySelector<HTMLSelectElement>(
    `select[formcontrolname="${controlName}"]`,
  )!;
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

function setInput(element: HTMLElement, selector: string, value: string): void {
  const input = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}
