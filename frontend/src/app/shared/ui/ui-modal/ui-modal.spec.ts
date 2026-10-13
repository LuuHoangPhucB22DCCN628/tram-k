import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UiModal } from './ui-modal';

@Component({
  standalone: true,
  imports: [UiModal],
  template: `
    <button class="opener" type="button" (click)="open = true">Mở hộp thoại</button>
    <app-ui-modal title="Xác nhận" [open]="open" (closed)="open = false">
      <p>Nội dung xác nhận</p>
      <button uiModalFooter class="confirm" type="button">Xác nhận</button>
    </app-ui-modal>
  `,
})
class ModalHost {
  open = false;
}

describe('UiModal', () => {
  let fixture: ComponentFixture<UiModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UiModal, ModalHost] }).compileComponents();
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

  it('renders one animated backdrop and one accessible dialog', () => {
    expect(fixture.nativeElement.querySelectorAll('.ui-modal__backdrop')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  });

  it('traps keyboard focus and restores it to the opener after Escape', async () => {
    fixture.destroy();
    const hostFixture = TestBed.createComponent(ModalHost);
    hostFixture.detectChanges();
    const element = hostFixture.nativeElement as HTMLElement;
    const opener = element.querySelector<HTMLButtonElement>('.opener')!;

    opener.focus();
    opener.click();
    hostFixture.detectChanges();
    await hostFixture.whenStable();

    const closeButton = element.querySelector<HTMLButtonElement>('[aria-label="Đóng hộp thoại"]')!;
    const confirmButton = element.querySelector<HTMLButtonElement>('.confirm')!;
    expect(document.activeElement).toBe(closeButton);

    closeButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    );
    expect(document.activeElement).toBe(confirmButton);

    confirmButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(closeButton);

    closeButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    hostFixture.detectChanges();
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
