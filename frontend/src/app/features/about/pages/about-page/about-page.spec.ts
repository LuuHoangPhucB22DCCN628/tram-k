import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AboutPage } from './about-page';

describe('AboutPage', () => {
  it('introduces Trạm K and links to the existing public sections', async () => {
    await TestBed.configureTestingModule({
      imports: [AboutPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(AboutPage);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Trạm K');
    expect(
      [...page.querySelectorAll<HTMLAnchorElement>('.about-link')].map((link) =>
        link.getAttribute('href'),
      ),
    ).toEqual(['/cam-nang', '/cau-chuyen', '/cong-dong/chuong-trinh-ho-tro']);
    expect(page.textContent).not.toContain('Trang đang được xây dựng');
  });
});
