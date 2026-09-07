import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiPagination } from './ui-pagination';

describe('UiPagination', () => {
  let fixture: ComponentFixture<UiPagination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UiPagination] }).compileComponents();
    fixture = TestBed.createComponent(UiPagination);
    fixture.componentRef.setInput('page', 3);
    fixture.componentRef.setInput('totalPages', 8);
    fixture.detectChanges();
  });

  it('should emit the selected page', () => {
    let selectedPage = 0;
    fixture.componentInstance.pageChange.subscribe((page) => (selectedPage = page));

    fixture.nativeElement.querySelector('[aria-label="Trang 4"]').click();

    expect(selectedPage).toBe(4);
  });
});
