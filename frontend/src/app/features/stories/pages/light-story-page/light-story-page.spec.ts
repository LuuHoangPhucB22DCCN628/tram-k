import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LightStoryPage } from './light-story-page';

describe('LightStoryPage', () => {
  it('renders every Figma section once in the original order', async () => {
    await TestBed.configureTestingModule({
      imports: [LightStoryPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(LightStoryPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const article = element.querySelector<HTMLElement>('.light-story');
    const sections = element.querySelectorAll<HTMLElement>('.light-story__section');
    const images = element.querySelectorAll<HTMLImageElement>('.light-story__image');
    const continueLinks = element.querySelectorAll<HTMLAnchorElement>(
      '.light-story__continue-link',
    );
    expect(article?.getAttribute('aria-label')).toBe('Ánh sáng - Học cách sống sau lời tuyên án');
    expect(element.querySelector('.visually-hidden')).toBeNull();
    expect(sections).toHaveLength(9);
    expect(images).toHaveLength(9);
    expect(new Set([...images].map((image) => image.src)).size).toBe(9);
    expect([...images].every((image) => image.src.endsWith('.svg'))).toBe(true);
    expect(continueLinks).toHaveLength(1);
    expect(continueLinks[0].getAttribute('href')).toBe('/cau-chuyen/bong-toi');
  });
});
