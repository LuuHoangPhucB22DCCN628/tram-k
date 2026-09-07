import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiInput } from './ui-input';

describe('UiInput', () => {
  let fixture: ComponentFixture<UiInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UiInput] }).compileComponents();
    fixture = TestBed.createComponent(UiInput);
    fixture.componentRef.setInput('label', 'Họ và tên');
    fixture.detectChanges();
  });

  it('should update value when the user types', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'Nguyễn An';
    input.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.value()).toBe('Nguyễn An');
  });
});
