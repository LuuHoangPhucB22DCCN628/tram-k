import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PublicFooter } from './public-footer';

describe('PublicFooter', () => {
  let fixture: ComponentFixture<PublicFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicFooter],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicFooter);
    fixture.detectChanges();
  });

  it('renders the Figma footer structure and unique navigation links', () => {
    const element = fixture.nativeElement as HTMLElement;
    const fund = element.querySelector<HTMLImageElement>('.public-footer__fund');
    const informationLinks = element.querySelectorAll('nav[aria-label="Liên kết thông tin"] a');
    const communityLinks = element.querySelectorAll('nav[aria-label="Liên kết cộng đồng"] a');

    expect(element.querySelectorAll('.public-footer')).toHaveLength(1);
    expect(fund?.getAttribute('src')).toBe('/assets/images/community/community-footer-fund.svg');
    expect(informationLinks).toHaveLength(7);
    expect(communityLinks).toHaveLength(3);
    expect(new Set([...informationLinks].map((link) => link.textContent?.trim())).size).toBe(7);
    expect(new Set([...communityLinks].map((link) => link.textContent?.trim())).size).toBe(3);
  });
});
