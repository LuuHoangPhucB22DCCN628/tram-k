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

  it('should render the medical information notice', () => {
    expect(fixture.nativeElement.textContent).toContain('không thay thế tư vấn');
  });
});
