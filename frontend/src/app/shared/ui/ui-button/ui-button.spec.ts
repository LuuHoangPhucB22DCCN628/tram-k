import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiButton } from './ui-button';

describe('UiButton', () => {
  let fixture: ComponentFixture<UiButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UiButton] }).compileComponents();
    fixture = TestBed.createComponent(UiButton);
    fixture.detectChanges();
  });

  it('should emit buttonClick when enabled', () => {
    let clickCount = 0;
    fixture.componentInstance.buttonClick.subscribe(() => clickCount++);

    fixture.nativeElement.querySelector('button').click();

    expect(clickCount).toBe(1);
  });

  it('should disable the native button while loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
  });
});
