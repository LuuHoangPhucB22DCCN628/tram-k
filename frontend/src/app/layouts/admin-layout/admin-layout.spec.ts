import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminLayout } from './admin-layout';

describe('AdminLayout', () => {
  let fixture: ComponentFixture<AdminLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();
  });

  it('should render the administration navigation', () => {
    expect(fixture.nativeElement.textContent).toContain('Kiểm duyệt cộng đồng');
    expect(fixture.nativeElement.textContent).toContain('Điểm phát cơm');
  });
});
