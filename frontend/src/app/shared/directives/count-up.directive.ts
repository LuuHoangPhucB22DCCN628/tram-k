import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, OnDestroy, PLATFORM_ID, inject, input } from '@angular/core';

import { RevealObserverService } from './reveal-observer.service';

const DURATION_MS = 1500;

@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective implements AfterViewInit, OnDestroy {
  readonly appCountUp = input.required<string>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly observer = inject(RevealObserverService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly formatter = new Intl.NumberFormat('vi-VN');
  private stopObserving?: () => void;
  private frameId?: number;
  private started = false;

  ngAfterViewInit(): void {
    const target = this.appCountUp();
    if (
      !this.isBrowser ||
      !globalThis.IntersectionObserver ||
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      this.element.textContent = target;
      return;
    }

    this.element.textContent = this.format(0, target);
    this.stopObserving = this.observer.observe(this.element, () => this.animate(target));
  }

  ngOnDestroy(): void {
    this.stopObserving?.();
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
  }

  private animate(target: string): void {
    if (this.started) return;
    this.started = true;
    const targetNumber = Number(target.replaceAll('.', '').replace(',', '.').replace('%', ''));
    if (!Number.isFinite(targetNumber) || targetNumber < 0) {
      this.element.textContent = target;
      return;
    }

    let startedAt: number | undefined;
    const tick = (time: number): void => {
      startedAt ??= time;
      const progress = Math.min((time - startedAt) / DURATION_MS, 1);
      const eased = 1 - (1 - progress) ** 3;
      this.element.textContent = progress === 1
        ? target
        : this.format(targetNumber * eased, target);
      if (progress < 1) this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private format(value: number, target: string): string {
    const decimalPlaces = target.includes(',') ? target.split(',')[1].replace('%', '').length : 0;
    const formatted = this.formatter.format(Number(value.toFixed(decimalPlaces)));
    return `${formatted}${target.endsWith('%') ? '%' : ''}`;
  }
}
