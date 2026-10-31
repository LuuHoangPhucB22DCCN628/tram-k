import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CountUpDirective } from './count-up.directive';

@Component({
  standalone: true,
  imports: [CountUpDirective],
  template: `<strong [appCountUp]="value" [attr.aria-label]="value"></strong>`,
})
class CountUpHostComponent {
  value = '180.480';
}

describe('CountUpDirective', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CountUpHostComponent] }).compileComponents();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('shows the final number immediately if scroll observation is unavailable', () => {
    const fixture = TestBed.createComponent(CountUpHostComponent);
    fixture.detectChanges();
    const number = fixture.nativeElement.querySelector('strong') as HTMLElement;
    expect(number.textContent).toBe('180.480');
    expect(number.getAttribute('aria-label')).toBe('180.480');
  });

  it('counts once from zero after entering the viewport', () => {
    let notify: IntersectionObserverCallback | undefined;
    const frames: FrameRequestCallback[] = [];
    class FakeIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) { notify = callback; }
      observe(): void {}
      unobserve(): void {}
    }
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);

    const fixture = TestBed.createComponent(CountUpHostComponent);
    fixture.detectChanges();
    const number = fixture.nativeElement.querySelector('strong') as HTMLElement;
    expect(number.textContent).toBe('0');

    notify?.([{ isIntersecting: true, target: number } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    frames.shift()?.(0);
    frames.shift()?.(750);
    expect(number.textContent).not.toBe('0');
    expect(number.textContent).not.toBe('180.480');
    frames.shift()?.(1500);
    expect(number.textContent).toBe('180.480');
    expect(frames).toHaveLength(0);
  });

  it('skips animation when reduced motion is requested', () => {
    vi.stubGlobal('IntersectionObserver', class { observe(): void {} unobserve(): void {} });
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const fixture = TestBed.createComponent(CountUpHostComponent);
    fixture.componentInstance.value = '51,6%';
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('strong') as HTMLElement).textContent).toBe('51,6%');
  });
});
