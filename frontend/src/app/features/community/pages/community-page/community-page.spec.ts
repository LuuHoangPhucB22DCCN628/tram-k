import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CommunityPage } from './community-page';

describe('CommunityPage', () => {
  it('renders each Figma community section and its data without duplicated markup', async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityPage],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CommunityPage);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const heroImage = element.querySelector<HTMLImageElement>('.community-hero__art');
    const cards = element.querySelectorAll('.hair-library-card');
    const stats = element.querySelectorAll('.donation-stat');
    const donationRows = element.querySelectorAll('.donation-table tbody tr');
    const qrImages = element.querySelectorAll<HTMLImageElement>('.donation-card__qr img');
    const brandCards = element.querySelectorAll('.brand-card');
    const brandImages = element.querySelectorAll<HTMLImageElement>('.brand-card__image img');
    const heroAction = element.querySelector<HTMLAnchorElement>(
      '.community-hero .community-button--filled',
    );
    const hairActions = element.querySelectorAll<HTMLAnchorElement>('.hair-library-card a');

    expect(element.querySelectorAll('.community-hero')).toHaveLength(1);
    expect(heroImage?.getAttribute('src')).toBe('/assets/images/community/community-hero.svg');
    expect(heroAction?.getAttribute('href')).toBe('/cong-dong/diem-quyen-gop');
    expect(element.querySelectorAll('.hair-library')).toHaveLength(1);
    expect(cards).toHaveLength(2);
    expect(new Set([...cards].map((card) => card.textContent?.trim())).size).toBe(2);
    expect([...hairActions].map((action) => action.getAttribute('href'))).toEqual([
      '/cong-dong/thu-vien-toc/nhan-toc',
      '/cong-dong/thu-vien-toc/hien-toc',
    ]);
    expect(element.querySelectorAll('.community-donations')).toHaveLength(1);
    expect(stats).toHaveLength(3);
    expect(donationRows).toHaveLength(8);
    expect(new Set([...donationRows].map((row) => row.querySelector('td')?.textContent)).size).toBe(
      8,
    );
    expect(qrImages).toHaveLength(1);
    expect(qrImages[0].getAttribute('src')).toBe(
      '/assets/images/community/community-donation-qr.svg',
    );
    expect(element.querySelectorAll('.direct-donations')).toHaveLength(1);
    expect(brandCards).toHaveLength(8);
    expect(brandImages).toHaveLength(8);
    expect(new Set([...brandImages].map((image) => image.getAttribute('src'))).size).toBe(8);
  });
});
