import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AiAssistantApiService } from '../../services/ai-assistant-api.service';
import { AiChatWidget } from './ai-chat-widget';

describe('AiChatWidget', () => {
  let fixture: ComponentFixture<AiChatWidget>;
  const api = { ask: vi.fn() };

  beforeEach(async () => {
    api.ask.mockReset();
    api.ask.mockReturnValue(
      of({
        answer: 'Bạn có thể xem cẩm nang phù hợp tại Trạm K.',
        mode: 'LOCAL',
        disclaimer: 'Không thay thế bác sĩ.',
        sources: [{ title: 'Cẩm nang Trạm K', link: '/cam-nang', type: 'GUIDE' }],
        suggestedQuestions: [],
      }),
    );
    await TestBed.configureTestingModule({
      imports: [AiChatWidget],
      providers: [provideRouter([]), { provide: AiAssistantApiService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(AiChatWidget);
    fixture.detectChanges();
  });

  it('opens as an accessible chat dialog and closes with Escape', async () => {
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.ai-widget__launcher')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('[role="dialog"]')).not.toBeNull();
    expect(element.textContent).toContain('Trợ lý Trạm K');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(element.querySelector('[role="dialog"]')).toBeNull();
  });

  it('uses a suggestion and renders the API reply with its source', async () => {
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.ai-widget__launcher')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.ai-widget__suggestions button')!.click();
    fixture.detectChanges();
    const textarea = element.querySelector<HTMLTextAreaElement>('#ai-widget-message')!;
    expect(textarea.value).toContain('Tôi vừa nhận chẩn đoán');

    element.querySelector<HTMLButtonElement>('.ai-widget__input-row > button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.ask).toHaveBeenCalledWith(expect.stringContaining('Tôi vừa'), expect.any(Array));
    expect(element.textContent).toContain('xem cẩm nang phù hợp');
    expect(element.querySelector<HTMLAnchorElement>('.widget-message__sources a')?.href).toContain(
      '/cam-nang',
    );
  });

  it('keeps program query parameters in clickable recommendation links', async () => {
    api.ask.mockReturnValue(
      of({
        answer: 'Có chương trình phù hợp.',
        mode: 'LOCAL',
        disclaimer: '',
        sources: [
          {
            title: 'Bữa cơm yêu thương',
            link: '/cong-dong/chuong-trinh-ho-tro?program=meal-1',
            type: 'SUPPORT_PROGRAM',
          },
        ],
        suggestedQuestions: [],
      }),
    );
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.ai-widget__launcher')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    const textarea = element.querySelector<HTMLTextAreaElement>('#ai-widget-message')!;
    textarea.value = 'Tìm chương trình hỗ trợ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.ai-widget__input-row > button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      element.querySelector<HTMLAnchorElement>('.widget-message__sources a')?.getAttribute('href'),
    ).toBe('/cong-dong/chuong-trinh-ho-tro?program=meal-1');
  });
});
