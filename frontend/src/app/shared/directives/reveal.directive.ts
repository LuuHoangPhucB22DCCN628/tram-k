import {
  AfterViewInit,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';

import { RevealObserverService } from './reveal-observer.service';

type RevealVariant = 'up' | 'left' | 'right' | 'scale';

@Directive({
  selector: '[appReveal]',
  standalone: true,
  host: {
    class: 'ui-reveal',
    '[class.ui-reveal--left]': 'variant() === "left"',
    '[class.ui-reveal--right]': 'variant() === "right"',
    '[class.ui-reveal--scale]': 'variant() === "scale"',
    '[class.is-visible]': 'visible()',
    '[style.--ui-reveal-delay]': 'delayCss()',
  },
})
export class RevealDirective implements AfterViewInit, OnDestroy {
  readonly appReveal = input<RevealVariant>('up');
  readonly revealDelay = input(0, { transform: numberAttribute });

  protected readonly visible = signal(false);
  protected readonly variant = computed<RevealVariant>(() => {
    const value = this.appReveal();
    return ['left', 'right', 'scale'].includes(value) ? value : 'up';
  });
  protected readonly delayCss = computed(
    () => `${Math.min(Math.max(this.revealDelay(), 0), 600)}ms`,
  );

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly observer = inject(RevealObserverService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private stopObserving?: () => void;

  ngAfterViewInit(): void {
    this.stopObserving = this.observer.observe(this.element.nativeElement, () => {
      this.visible.set(true);
      this.changeDetector.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.stopObserving?.();
  }
}
