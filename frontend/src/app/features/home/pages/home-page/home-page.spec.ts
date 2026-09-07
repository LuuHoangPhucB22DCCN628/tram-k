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
  });

  it('opens and closes an FAQ answer', () => {
    const element = fixture.nativeElement as HTMLElement;
    const secondButton = element.querySelectorAll<HTMLButtonElement>('.faq-item button')[1];

    secondButton.click();
    fixture.detectChanges();

    expect(secondButton.getAttribute('aria-expanded')).toBe('true');
    expect(element.textContent).toContain('Sau khi đăng nhập, thành viên có thể gửi bài chia sẻ');

    secondButton.click();
    fixture.detectChanges();

    expect(secondButton.getAttribute('aria-expanded')).toBe('false');
  });
});
