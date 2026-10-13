import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevealDirective } from './reveal.directive';

@Component({
  standalone: true,
  imports: [RevealDirective],
  template: `<section appReveal="left" [revealDelay]="900">Nội dung</section>`,
})
class RevealHostComponent {}

describe('RevealDirective', () => {
  let fixture: ComponentFixture<RevealHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RevealHostComponent] }).compileComponents();
  });

  it('shows content immediately when IntersectionObserver is unavailable', () => {
    fixture = TestBed.createComponent(RevealHostComponent);
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('section') as HTMLElement;
    expect(section.classList).toContain('ui-reveal');
    expect(section.classList).toContain('ui-reveal--left');
    expect(section.classList).toContain('is-visible');
    expect(section.style.getPropertyValue('--ui-reveal-delay')).toBe('600ms');
  });
});
