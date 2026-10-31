import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { KitchenStoryPage } from './kitchen-story-page';

describe('KitchenStoryPage', () => {
  it('shows the complete Bếp An Yên story with local Figma photos and a way back', async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenStoryPage],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(KitchenStoryPage);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Nơi tình người sưởi ấm');
    expect(page.textContent).toContain('Niêu cơm Thạch Sanh');
    expect(page.textContent).toContain('Mái ấm An Yên');
    expect(page.textContent).toContain('tấm lòng vàng');
    expect(page.querySelectorAll('.kitchen-detail__gallery img')).toHaveLength(9);
    expect(page.querySelector('a[href="/cau-chuyen"]')).not.toBeNull();
    expect(page.querySelector('.kitchen-hero__button')).toBeNull();
  });
});
