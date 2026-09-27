import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home-page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders every main homepage section', () => {
    const element = fixture.nativeElement as HTMLElement;
    const headings = Array.from(element.querySelectorAll('h1, h2')).map((heading) =>
      heading.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(headings).toContain('we cancerSurvive');
    expect(headings).toContain('Hành trình');
    expect(headings).toContain('Khám phá');
    expect(headings).toContain('Cẩm nang đồng hành');
    expect(headings).toContain('Những câu hỏi thường gặp');
    expect(headings).toContain('Đối tác của Trạm');
    expect(element.querySelectorAll('h1 img, h2 img').length).toBe(0);
  });

  it('opens and closes an FAQ answer', () => {
    const element = fixture.nativeElement as HTMLElement;
    const secondButton = element.querySelectorAll<HTMLButtonElement>('.faq-item button')[1];

    secondButton.click();
    fixture.detectChanges();

    expect(secondButton.getAttribute('aria-expanded')).toBe('true');
    const answer = element.querySelector<HTMLElement>(
      `#${secondButton.getAttribute('aria-controls')}`,
    )!;
    expect(answer.hidden).toBe(false);
    expect(element.querySelector('.faq-item button')?.getAttribute('aria-expanded')).toBe('false');

    secondButton.click();
    fixture.detectChanges();

    expect(secondButton.getAttribute('aria-expanded')).toBe('false');
    expect(answer.hidden).toBe(true);
  });
  it('renders five separate SVG contact links with safe new-tab navigation', () => {
    const element = fixture.nativeElement as HTMLElement;
    const links = element.querySelectorAll<HTMLAnchorElement>('.faq__social a');
    expect(links.length).toBe(5);
    for (const link of links) {
      expect(link.getAttribute('href')).toBe('https://www.facebook.com/phuccluu271');
      expect(link.target).toBe('_blank');
      expect(link.rel).toContain('noopener');
      expect(link.rel).toContain('noreferrer');
      expect(link.querySelector('img')?.getAttribute('src')).toMatch(/\.svg$/);
      expect(link.getAttribute('aria-label')).toContain('Facebook');
    }
    expect(element.querySelector('img[src$="faq-social.png"]')).toBeNull();
  });

  it('uses SVG assets for illustrations and high-resolution sources for photos', () => {
    const element = fixture.nativeElement as HTMLElement;
    const vectorIllustrations = element.querySelectorAll<HTMLImageElement>(
      '.feature-card--guide img, .feature-card--story > img, .feature-card--chat img, .feature-card--cancer img',
    );

    expect(vectorIllustrations.length).toBe(4);
    for (const illustration of vectorIllustrations) {
      expect(illustration.getAttribute('src')).toMatch(/\.svg$/);
    }

    const kids = element.querySelectorAll<HTMLImageElement>('.feature-card__kids img');
    expect(kids.length).toBe(3);
    expect(element.querySelector('img[src$="explore-donation.png"]')).toBeNull();
    expect(element.querySelector('img[src$="donation-shadow.svg"]')).not.toBeNull();
  });
});
