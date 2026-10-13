import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router'; // Cung cấp Router cho PublicHeader và RouterOutlet
import { of } from 'rxjs';

import { AiAssistantApiService } from '@features/ai-assistant/services/ai-assistant-api.service';

import { PublicLayout } from './public-layout';

describe('PublicLayout', () => {
  let component: PublicLayout;
  let fixture: ComponentFixture<PublicLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicLayout],
      providers: [
        provideRouter([]), // Tạo Router rỗng cho môi trường kiểm thử
        { provide: AiAssistantApiService, useValue: { ask: vi.fn(() => of(null)) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should provide a skip link to the main content', () => {
    const skipLink = fixture.nativeElement.querySelector('.skip-link') as HTMLAnchorElement;

    expect(skipLink.textContent).toContain('Bỏ qua đến nội dung chính');
    expect(skipLink.getAttribute('href')).toBe('#main-content');
    expect(fixture.nativeElement.querySelector('main').classList).toContain('ui-route-content');
  });

  it('should provide the floating AI assistant on public pages', () => {
    const launcher = fixture.nativeElement.querySelector('.ai-widget__launcher') as HTMLElement;

    expect(launcher).not.toBeNull();
    expect(launcher.getAttribute('aria-label')).toContain('Trợ lý AI');
  });
});
