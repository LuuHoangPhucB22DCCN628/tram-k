import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevealDirective } from './reveal.directive';

@Component({
  standalone: true,
  imports: [RevealDirective],
  template: `<section appReveal="left" [revealDelay]="900">Nội dung</section>`,
})
class RevealHostComponent {}

describe('RevealDirective', () => {
  let fixture: ComponentFixture<RevealHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RevealHostComponent] }).compileComponents();
  });

  it('shows content immediately when IntersectionObserver is unavailable', () => {
    fixture = TestBed.createComponent(RevealHostComponent);
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(section.classList).toContain('ui-reveal');
    expect(section.classList).toContain('ui-reveal--left');
    expect(section.classList).toContain('is-visible');
    expect(section.style.getPropertyValue('--ui-reveal-delay')).toBe('600ms');
  });

  it('reveals tall sections as soon as they enter the viewport', () => {
    let observerOptions: IntersectionObserverInit | undefined;
    let notify: IntersectionObserverCallback | undefined;
    class FakeIntersectionObserver {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        notify = callback;
        observerOptions = options;
      }
      observe(): void {}
      unobserve(): void {}
    }
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

    try {
      fixture = TestBed.createComponent(RevealHostComponent);
      fixture.detectChanges();
      const section = fixture.nativeElement.querySelector('section') as HTMLElement;

      expect(observerOptions?.threshold).toBe(0);
      expect(section.classList).not.toContain('is-visible');
      notify?.(
        [{ isIntersecting: true, target: section } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      fixture.detectChanges();
      expect(section.classList).toContain('is-visible');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
