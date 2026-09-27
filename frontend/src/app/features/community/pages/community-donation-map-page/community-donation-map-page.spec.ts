import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CommunityDonationMapPage } from './community-donation-map-page';

describe('CommunityDonationMapPage', () => {
  it('renders the Figma map composition once with SVG assets', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityDonationMapPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CommunityDonationMapPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const map = element.querySelector<HTMLImageElement>('.donation-map-hero__map');
    const hanoiLink = element.querySelector<HTMLAnchorElement>('.donation-map-hero__hanoi-link');

    expect(element.querySelectorAll('.donation-map-hero')).toHaveLength(1);
    expect(element.querySelectorAll('app-community-love-title')).toHaveLength(1);
    expect(element.querySelectorAll('app-community-map-background')).toHaveLength(1);
    expect(map?.getAttribute('src')).toBe('/assets/images/community/community-donation-map.svg');
    expect(hanoiLink?.getAttribute('href')).toBe('/cong-dong/diem-quyen-gop/ha-noi');
  });
});
