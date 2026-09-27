import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { CARD_SELECTION_NAVIGATION_DELAY_MS, DestinyStoryPage } from './destiny-story-page';

describe('DestinyStoryPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DestinyStoryPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the shared hero, article copy and one Figma card scene', () => {
    const fixture = TestBed.createComponent(DestinyStoryPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('app-destiny-story-hero')).toHaveLength(1);
    expect(
      element.querySelectorAll('img[src="/assets/images/stories/article-question-title.svg"]'),
    ).toHaveLength(1);
    expect(element.querySelector('.card-choice__title')?.textContent).toContain('Chọn một lá bài');
    const decorations = element.querySelectorAll<HTMLImageElement>('.story-card-decoration__item');
    expect(decorations).toHaveLength(11);
    expect(new Set([...decorations].map((image) => image.src)).size).toBe(11);
    expect(element.querySelectorAll('.card-choice__button')).toHaveLength(2);
    expect(element.querySelectorAll('.card-choice__button img')).toHaveLength(2);
  });

  it('announces the selected card and opens its Figma destination', () => {
    vi.useFakeTimers();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(DestinyStoryPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const buttons = element.querySelectorAll<HTMLButtonElement>('.card-choice__button');
    buttons[0].click();
    fixture.detectChanges();

    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
    expect(element.querySelectorAll('.card-choice__button--selected')).toHaveLength(1);
    expect(element.querySelectorAll('.card-choice__button--muted')).toHaveLength(1);
    expect(element.querySelectorAll('.card-choice__face')).toHaveLength(2);
    expect(element.querySelector('[aria-live="polite"]')?.textContent).toContain(
      'Chọn lá bài màu đen',
    );

    vi.advanceTimersByTime(CARD_SELECTION_NAVIGATION_DELAY_MS);
    expect(navigateSpy).toHaveBeenCalledWith('/cau-chuyen/bong-toi');
    vi.useRealTimers();
  });

  it('opens the white-card Figma destination', () => {
    vi.useFakeTimers();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(DestinyStoryPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const buttons = element.querySelectorAll<HTMLButtonElement>('.card-choice__button');
    buttons[1].click();
    vi.advanceTimersByTime(CARD_SELECTION_NAVIGATION_DELAY_MS);

    expect(navigateSpy).toHaveBeenCalledWith('/cau-chuyen/anh-sang');
    vi.useRealTimers();
  });
});
