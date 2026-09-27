import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ContentListPage } from './content-list-page';

describe('ContentListPage', () => {
  let fixture: ComponentFixture<ContentListPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentListPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentListPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders the four Figma guide groups with published content only', () => {
    const cards = fixture.nativeElement.querySelectorAll('.content-card');

    expect(cards).toHaveLength(16);
    expect(fixture.nativeElement.querySelectorAll('.content-group')).toHaveLength(4);
    expect(fixture.nativeElement.querySelectorAll('.content-group__more')).toHaveLength(4);
    expect(fixture.nativeElement.textContent).toContain('Hiểu rõ hành trình điều trị');
    expect(fixture.nativeElement.textContent).not.toContain('Nội dung đang chờ kiểm duyệt');
  });

  it('reuses the existing filter flow from each Figma section button', async () => {
    const buttons = fixture.nativeElement.querySelectorAll(
      '.content-group__more',
    ) as NodeListOf<HTMLButtonElement>;

    buttons[1].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.content-card')).toHaveLength(4);
    expect(fixture.nativeElement.textContent).toContain('Kết quả phù hợp');
    expect(fixture.nativeElement.querySelectorAll('.content-group__more')).toHaveLength(0);
  });

  it('filters guides by search text without accents', async () => {
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'hoa tri';
    input.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.content-card')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Hóa trị là gì và diễn ra như thế nào?');
    expect(fixture.nativeElement.textContent).toContain(
      'Những lưu ý về dinh dưỡng trong thời gian hóa trị',
    );
  });
});
