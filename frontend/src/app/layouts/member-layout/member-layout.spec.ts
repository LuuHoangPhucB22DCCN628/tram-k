import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MemberLayout } from './member-layout';

describe('MemberLayout', () => {
  let fixture: ComponentFixture<MemberLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberLayout],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberLayout);
    fixture.detectChanges();
  });

  it('should render member navigation', () => {
    expect(fixture.nativeElement.textContent).toContain('Khu vực thành viên');
    expect(fixture.nativeElement.textContent).toContain('Bài viết của tôi');
  });
});
