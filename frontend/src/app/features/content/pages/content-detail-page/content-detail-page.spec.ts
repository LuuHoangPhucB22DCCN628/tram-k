import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ContentDetailPage } from './content-detail-page';

describe('ContentDetailPage', () => {
  let fixture: ComponentFixture<ContentDetailPage>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ContentDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(
              convertToParamMap({
                slug: 'dau-hieu-am-tham-khi-ngu',
              }),
            ),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContentDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders a published guide by slug', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain(
      'Các dấu hiệu âm thầm khi ngủ cảnh báo ung thư',
    );
    expect(element.querySelector('#related-title')?.textContent).toContain('Bài viết liên quan');
    expect(element.querySelector('.detail-category')?.textContent).toContain('Dấu hiệu');
    expect(element.querySelector('.detail-lead')?.textContent).toContain(
      'thay đổi xuất hiện khi ngủ',
    );
    expect(element.querySelectorAll('.detail-section figure > img')).toHaveLength(5);
    expect(element.querySelectorAll('.detail-icon-button')).toHaveLength(2);
  });

  it('toggles the article favorite state', () => {
    const button = fixture.nativeElement.querySelector(
      'button[aria-label="Thêm vào yêu thích"]',
    ) as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Bỏ khỏi danh sách yêu thích');
  });
});
