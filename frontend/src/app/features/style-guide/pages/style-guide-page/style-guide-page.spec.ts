import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StyleGuidePage } from './style-guide-page';

describe('StyleGuidePage', () => {
  let fixture: ComponentFixture<StyleGuidePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StyleGuidePage],
    }).compileComponents();

    fixture = TestBed.createComponent(StyleGuidePage);
    fixture.detectChanges();
  });

  it('should render the Trạm K style guide heading', () => {
    const heading = fixture.nativeElement.querySelector('h1') as HTMLHeadingElement | null;

    expect(heading?.textContent).toContain('Style Guide Trạm K');
  });
});
