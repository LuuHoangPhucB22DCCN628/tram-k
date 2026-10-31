import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type RevealCallback = () => void;

@Injectable({ providedIn: 'root' })
export class RevealObserverService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly callbacks = new Map<Element, RevealCallback>();
  private observer?: IntersectionObserver;

  observe(element: Element, reveal: RevealCallback): () => void {
    if (!this.isBrowser || !globalThis.IntersectionObserver) {
      reveal();
      return () => undefined;
    }

    this.callbacks.set(element, reveal);
    this.getObserver().observe(element);

    return () => {
      this.callbacks.delete(element);
      this.observer?.unobserve(element);
    };
  }

  private getObserver(): IntersectionObserver {
    this.observer ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          this.callbacks.get(entry.target)?.();
          this.callbacks.delete(entry.target);
          this.observer?.unobserve(entry.target);
        }
      },
      // A tall section may never occupy 14% of the viewport at once; reveal as soon as it enters.
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    );
    return this.observer;
  }
}
