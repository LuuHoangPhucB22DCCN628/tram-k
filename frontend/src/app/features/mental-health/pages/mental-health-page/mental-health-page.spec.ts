import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { PodcastAdminStorageService } from '../../services/podcast-admin-storage.service';
import { MentalHealthPage } from './mental-health-page';

describe('MentalHealthPage', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() => localStorage.clear());

  it('renders the Figma podcast hero and all related podcast cards without repeated markup', async () => {
    await TestBed.configureTestingModule({ imports: [MentalHealthPage] }).compileComponents();
    const fixture = TestBed.createComponent(MentalHealthPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const cards = element.querySelectorAll('.podcast-card');

    expect(element.querySelector('h1')?.textContent).toContain(
      'Nếu hôm nay bạn vừa nhận kết quả ung thư',
    );
    expect(element.querySelectorAll('.audio-player')).toHaveLength(1);
    expect(cards).toHaveLength(3);
    expect(new Set([...cards].map((card) => card.querySelector('h3')?.textContent)).size).toBe(3);
    expect(element.querySelectorAll('.podcast-hero__art')).toHaveLength(1);
    expect(element.querySelectorAll('.podcast-contact a')).toHaveLength(5);
    expect(element.querySelector('.podcast-hero__content')?.classList).toContain('ui-reveal--left');
    expect([...cards].every((card) => card.classList.contains('ui-reveal'))).toBe(true);
    expect(element.querySelector('.podcast-contact')?.classList).toContain('ui-reveal');
    expect(element.querySelectorAll('.podcast-card[data-ui-card]')).toHaveLength(3);
  });

  it('updates the visible player state when playback is toggled', async () => {
    const speak = vi.fn();
    const pause = vi.fn();
    const cancel = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        paused: false,
        speaking: true,
        speak,
        pause,
        resume: vi.fn(),
        cancel,
        getVoices: () => [],
      },
    });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class {
        lang = '';
        rate = 1;
        pitch = 1;
        volume = 1;
        voice?: SpeechSynthesisVoice;
        onend?: () => void;
        onerror?: () => void;

        constructor(readonly text: string) {}
      },
    });

    await TestBed.configureTestingModule({ imports: [MentalHealthPage] }).compileComponents();
    const fixture = TestBed.createComponent(MentalHealthPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const button = element.querySelector<HTMLButtonElement>('.audio-player__toggle');
    button?.click();
    fixture.detectChanges();

    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(button?.getAttribute('aria-label')).toBe('Tạm dừng podcast');
    expect(speak).toHaveBeenCalledOnce();

    fixture.destroy();
    expect(cancel).toHaveBeenCalled();
  });

  it('opens a podcast detail once and plays its narration without duplicating cards', async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        paused: false,
        speaking: false,
        speak,
        pause: vi.fn(),
        resume: vi.fn(),
        cancel,
        getVoices: () => [],
      },
    });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class {
        lang = '';
        rate = 1;
        pitch = 1;
        volume = 1;
        onend?: () => void;
        onerror?: () => void;

        constructor(readonly text: string) {}
      },
    });

    await TestBed.configureTestingModule({ imports: [MentalHealthPage] }).compileComponents();
    const fixture = TestBed.createComponent(MentalHealthPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.podcast-card__trigger')?.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.ui-modal')).toHaveLength(1);
    expect(element.querySelector('.ui-modal h2')?.textContent).toContain(
      'Ung Thư Không Phải Là Bệnh',
    );
    expect(element.querySelectorAll('.podcast-card')).toHaveLength(3);

    element.querySelector<HTMLButtonElement>('.podcast-detail__play')?.click();
    fixture.detectChanges();

    expect(speak).toHaveBeenCalledOnce();
    expect(element.querySelector('.podcast-detail__play')?.textContent).toContain('Dừng nghe');
  });

  it('opens the requested podcast when arriving from a search result', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: {
          queryParamMap: convertToParamMap({ podcast: 'PODCAST-002' }),
        },
      },
    });
    await TestBed.configureTestingModule({ imports: [MentalHealthPage] }).compileComponents();
    const fixture = TestBed.createComponent(MentalHealthPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.ui-modal')).toHaveLength(1);
    expect(element.querySelector('.ui-modal h2')?.textContent).toContain('Tự bỏ đói mình');
  });

  it('places a newly published podcast first while preserving the three-card Figma layout', async () => {
    await TestBed.configureTestingModule({ imports: [MentalHealthPage] }).compileComponents();
    const storage = TestBed.inject(PodcastAdminStorageService);
    storage.create({
      id: 'PODCAST-NEWEST',
      title: 'Podcast mới nhất từ Trạm K',
      description: 'Một nội dung mới được thêm từ trang quản trị nhưng không làm đổi bố cục.',
      source: 'Trạm K',
      image: '/assets/images/mental-health/podcast-yoga.png',
      imageAlt: 'Ảnh minh họa podcast mới nhất',
      audioUrl: '/assets/audio/podcast-moi.mp3',
      publishedAt: '2099-01-01T00:00:00.000Z',
      status: 'PUBLISHED',
    });
    const fixture = TestBed.createComponent(MentalHealthPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const cards = [...element.querySelectorAll<HTMLElement>('.podcast-card')];

    expect(cards).toHaveLength(3);
    expect(cards[0].querySelector('h3')?.textContent).toContain('Podcast mới nhất từ Trạm K');
    expect(element.textContent).not.toContain('Lớp Yoga miễn phí');

    const sectionMore = element.querySelector<HTMLButtonElement>('app-ui-section-more button')!;
    expect(sectionMore.getAttribute('aria-label')).toBe('Xem thêm 3 nội dung');
    sectionMore.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.podcast-card')).toHaveLength(6);
    expect(element.textContent).toContain('Lớp Yoga miễn phí');
    expect(sectionMore.getAttribute('aria-expanded')).toBe('true');
  });

  it('paginates expanded podcasts with at most six cards per page', async () => {
    await TestBed.configureTestingModule({ imports: [MentalHealthPage] }).compileComponents();
    const storage = TestBed.inject(PodcastAdminStorageService);
    for (let index = 0; index < 3; index += 1) {
      storage.create({
        id: `PODCAST-PAGE-${index}`,
        title: `Podcast phân trang ${index + 1}`,
        description: 'Nội dung podcast dùng để kiểm tra danh sách có nhiều hơn sáu bài.',
        source: 'Trạm K',
        image: '/assets/images/mental-health/podcast-yoga.png',
        imageAlt: `Ảnh podcast phân trang ${index + 1}`,
        audioUrl: '/assets/audio/podcast-moi.mp3',
        publishedAt: `2099-01-0${3 - index}T00:00:00.000Z`,
        status: 'PUBLISHED',
      });
    }
    const fixture = TestBed.createComponent(MentalHealthPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.podcast-card')).toHaveLength(3);
    element.querySelector<HTMLButtonElement>('app-ui-section-more button')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.podcast-card')).toHaveLength(6);

    const pageTwo = element.querySelector<HTMLButtonElement>('button[aria-label="Trang 2"]')!;
    pageTwo.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.podcast-card')).toHaveLength(2);
    expect(pageTwo.getAttribute('aria-current')).toBe('page');
  });
});
