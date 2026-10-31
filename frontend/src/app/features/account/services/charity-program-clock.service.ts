import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, NgZone, PLATFORM_ID, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CharityProgramClockService {
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  readonly now = signal(new Date());

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    this.zone.runOutsideAngular(() => {
      const refresh = () => this.zone.run(() => this.now.set(new Date()));
      const interval = window.setInterval(refresh, 15_000);
      document.addEventListener('visibilitychange', refresh);
      this.destroyRef.onDestroy(() => {
        window.clearInterval(interval);
        document.removeEventListener('visibilitychange', refresh);
      });
    });
  }
}
