import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiModal } from './ui-modal';

describe('UiModal', () => {
  let fixture: ComponentFixture<UiModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UiModal] }).compileComponents();
    fixture = TestBed.createComponent(UiModal);
    fixture.componentRef.setInput('title', 'Xác nhận');
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  });

  it('should emit closed when close button is clicked', () => {
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    fixture.nativeElement.querySelector('.ui-modal__header button').click();

    expect(closed).toBe(true);
  });
});
