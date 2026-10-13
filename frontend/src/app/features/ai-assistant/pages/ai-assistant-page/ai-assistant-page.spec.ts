import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AiAssistantApiService } from '../../services/ai-assistant-api.service';
import { AiAssistantPage } from './ai-assistant-page';

describe('AiAssistantPage', () => {
  let fixture: ComponentFixture<AiAssistantPage>;
  const api = {
    ask: vi.fn(),
  };

  beforeEach(async () => {
    api.ask.mockReset();
    api.ask.mockReturnValue(
      of({
        answer: 'Bạn có thể chuẩn bị danh sách câu hỏi để trao đổi với bác sĩ.',
        mode: 'LOCAL',
        disclaimer: 'Không thay thế bác sĩ.',
        sources: [{ title: 'Cẩm nang đồng hành', link: '/cam-nang', type: 'GUIDE' }],
        suggestedQuestions: [],
      }),
    );

    await TestBed.configureTestingModule({
      imports: [AiAssistantPage],
      providers: [provideRouter([]), { provide: AiAssistantApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(AiAssistantPage);
    fixture.detectChanges();
  });

  it('renders the assistant, safety notice, and starter questions', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Một nơi để hỏi');
    expect(element.textContent).toContain('không thay thế chẩn đoán');
    expect(element.querySelectorAll('.ai-guide__suggestions button')).toHaveLength(4);
    expect(element.querySelectorAll('.chat-message')).toHaveLength(1);
  });

  it('fills the composer from a starter question', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const suggestion = element.querySelector<HTMLButtonElement>('.ai-guide__suggestions button')!;

    suggestion.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector<HTMLTextAreaElement>('#ai-message')?.value).toContain(
      'Tôi vừa nhận chẩn đoán',
    );
  });

  it('sends a question and renders the reply with its source', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const textarea = element.querySelector<HTMLTextAreaElement>('#ai-message')!;
    textarea.value = 'Tôi nên chuẩn bị gì?';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.ai-composer__box button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.ask).toHaveBeenCalledWith('Tôi nên chuẩn bị gì?', expect.any(Array));
    expect(element.textContent).toContain('chuẩn bị danh sách câu hỏi');
    expect(
      element.querySelector<HTMLAnchorElement>('.chat-message__sources a')?.getAttribute('href'),
    ).toBe('/cam-nang');
  });
});
