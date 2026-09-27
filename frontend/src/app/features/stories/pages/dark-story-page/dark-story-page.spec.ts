import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DarkStoryPage } from './dark-story-page';

describe('DarkStoryPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DarkStoryPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the Figma story once with all chapter imagery', () => {
    const fixture = TestBed.createComponent(DarkStoryPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.dark-story__hero')).toHaveLength(1);
    expect(element.querySelector('h1')?.textContent).toContain('Bóng tối');
    expect(element.querySelectorAll('.story-chapter')).toHaveLength(4);
    expect(element.querySelectorAll('.story-gallery__item')).toHaveLength(4);
    expect(element.querySelectorAll('.dark-story__continuation')).toHaveLength(1);
    expect(
      element.querySelectorAll('.dark-story__continuation .story-card-decoration__item'),
    ).toHaveLength(11);
    const continuationLink = element.querySelector<HTMLAnchorElement>(
      '.dark-story__continuation-link',
    );
    expect(continuationLink?.getAttribute('href')).toBe('/cau-chuyen/anh-sang');
    expect(continuationLink?.querySelector('img')?.getAttribute('alt')).toBe('Lá bài màu trắng');
  });
});
