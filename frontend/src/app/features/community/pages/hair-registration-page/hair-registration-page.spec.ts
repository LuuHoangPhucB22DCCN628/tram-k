import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';

import { HairRegistrationApiError } from '../../models/hair-registration.models';
import { HairRegistrationService } from '../../services/hair-registration.service';
import { HairRegistrationPage } from './hair-registration-page';

describe('HairRegistrationPage', () => {
  async function createPage(mode: 'receive' | 'donate') {
    await TestBed.configureTestingModule({
      imports: [HairRegistrationPage],
      providers: [
        provideHttpClient(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000' },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { mode } } } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(HairRegistrationPage);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function enterValue(element: HTMLElement, selector: string, value: string): void {
    const control = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
    if (!control) throw new Error(`Missing test control: ${selector}`);
    control.value = value;
    control.dispatchEvent(new Event('input'));
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders the receive-hair form with the Figma registration fields once', async () => {
    const { element } = await createPage('receive');

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Đăng ký tham gia nhận tóc');
    expect(element.querySelectorAll('.hair-form')).toHaveLength(1);
    expect(element.querySelectorAll('.hair-form__section--registration')).toHaveLength(1);
    expect(element.querySelectorAll('.hair-form__commitments')).toHaveLength(0);
  });

  it('renders the donate-hair commitments without duplicating the form shell', async () => {
    const { element } = await createPage('donate');

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Đăng ký tham gia hiến tóc');
    expect(element.querySelectorAll('.hair-form')).toHaveLength(1);
    expect(element.querySelectorAll('.hair-commitment')).toHaveLength(5);
    expect(element.querySelectorAll('.hair-form__section--registration')).toHaveLength(0);
  });

  it('reports the invalid values shown in the receive-hair form instead of submitting them', async () => {
    const { fixture, element } = await createPage('receive');

    enterValue(element, '#hair-full-name', 'ljssa');
    enterValue(element, '#hair-phone', '64456654');
    enterValue(element, '#hair-district', '2212');
    element
      .querySelector<HTMLFormElement>('.hair-form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(element.querySelector('#hair-full-name-error')?.textContent).toContain('tối thiểu 2 từ');
    expect(element.querySelector('#hair-phone-error')?.textContent).toContain('phải có 10 số');
    expect(element.querySelector('#hair-district-error')?.textContent).toContain(
      'không được chỉ nhập số',
    );
    expect(element.querySelector('#hair-province-error')?.textContent).toContain('Vui lòng nhập');
    expect(element.querySelector('.hair-form__status')).toBeNull();
  });

  it('does not apply hidden donor commitments to the receive-hair form', async () => {
    const { fixture, element } = await createPage('receive');
    const component = fixture.componentInstance as unknown as { form: FormGroup };
    const registrationService = TestBed.inject(HairRegistrationService);
    const submitSpy = vi.spyOn(registrationService, 'submit').mockReturnValue(
      of({
        id: 'TK-TEST-0001',
        status: 'PENDING',
        submittedAt: '2026-09-26T00:00:00.000Z',
      }),
    );

    component.form.patchValue({
      fullName: 'Nguyễn Văn An',
      phone: '0912345678',
      province: 'Hà Nội',
      district: 'Ba Đình',
      address: '12 Phố Huế',
      gender: 'male',
      relativePhone: '0987654321',
      relativeName: 'Nguyễn Thị Mai',
      duration: '3 tháng',
      hospital: 'Bệnh viện K',
      diagnosis: 'Ung thư tuyến giáp',
      borrowDate: '2099-01-01',
      transparency: 'Tôi cam kết thông tin đã điền là đúng.',
    });

    expect(component.form.valid).toBe(true);

    element
      .querySelector<HTMLFormElement>('.hair-form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(submitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'receive',
        fullName: 'Nguyễn Văn An',
        diagnosis: 'Ung thư tuyến giáp',
      }),
    );
    expect(element.querySelector('[role="status"]')?.textContent).toContain('TK-TEST-0001');
  });

  it('requires every visible commitment on the donate-hair form', async () => {
    const { fixture, element } = await createPage('donate');

    element
      .querySelector<HTMLFormElement>('.hair-form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(element.querySelectorAll('.hair-form__commitments .hair-field__error')).toHaveLength(5);
    expect(element.querySelectorAll('.hair-commitment input:checked')).toHaveLength(0);
  });

  it('shows a recoverable message when submission fails', async () => {
    const { fixture, element } = await createPage('receive');
    const component = fixture.componentInstance as unknown as { form: FormGroup };
    vi.spyOn(TestBed.inject(HairRegistrationService), 'submit').mockReturnValue(
      throwError(
        () => new HairRegistrationApiError('SUBMISSION_FAILED', 'Máy chủ đang bận, hãy thử lại.'),
      ),
    );
    component.form.patchValue({
      fullName: 'Nguyễn Văn An',
      phone: '0912345678',
      province: 'Hà Nội',
      district: 'Ba Đình',
      address: '12 Phố Huế',
      gender: 'male',
      relativePhone: '0987654321',
      relativeName: 'Nguyễn Thị Mai',
      duration: '3 tháng',
      hospital: 'Bệnh viện K',
      diagnosis: 'Ung thư tuyến giáp',
      borrowDate: '2099-01-01',
      transparency: 'Tôi cam kết thông tin đã điền là đúng.',
    });

    element
      .querySelector<HTMLFormElement>('.hair-form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Máy chủ đang bận');
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });
});
