import { TestBed } from '@angular/core/testing';

import { CommunityHanoiDonationMapPage } from './community-hanoi-donation-map-page';

describe('CommunityHanoiDonationMapPage', () => {
  it('renders one Hanoi SVG map and the three Figma location markers', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityHanoiDonationMapPage],
    }).compileComponents();
    const fixture = TestBed.createComponent(CommunityHanoiDonationMapPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const map = element.querySelector<HTMLImageElement>('.hanoi-map-hero__map');
    const markers = element.querySelectorAll('.hanoi-map-hero__marker');

    expect(element.querySelectorAll('.hanoi-map-hero')).toHaveLength(1);
    expect(element.querySelectorAll('app-community-map-background')).toHaveLength(1);
    expect(map?.getAttribute('src')).toBe('/assets/images/community/community-hanoi-map.svg');
    expect(markers).toHaveLength(3);
    expect(element.querySelectorAll('app-community-location-pin')).toHaveLength(3);
  });
});
