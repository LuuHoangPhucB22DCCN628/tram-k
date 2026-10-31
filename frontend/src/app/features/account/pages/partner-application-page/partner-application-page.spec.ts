import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { AuthApiError, type AuthUser } from '@core/auth/auth.models';
import { AuthService } from '@core/auth/auth.service';
import { PartnerApplicationStorageService } from '../../services/partner-application-storage.service';
import { PartnerApplicationPage } from './partner-application-page';

describe('PartnerApplicationPage', () => {
  let fixture: ComponentFixture<PartnerApplicationPage>;
  const authMode = signal<'LOCAL' | 'REMOTE'>('REMOTE');
  const currentUser = signal<AuthUser | null>(null);
  const resendVerification = vi.fn(() => of(undefined));
  const applicationStorage = {
    forApplicant: vi.fn(() => null),
    submitRemote: vi.fn(),
    initializeMine: vi.fn(),
    lastError: vi.fn(() => ''),
  };

  beforeEach(async () => {
    applicationStorage.forApplicant.mockReturnValue(null);
    applicationStorage.submitRemote.mockReset();
    applicationStorage.lastError.mockReturnValue('');
    authMode.set('REMOTE');
    currentUser.set({
      id: 'USER-1',
      displayName: 'Nguyễn An',
      email: 'an@example.com',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    resendVerification.mockReset();
    resendVerification.mockReturnValue(of(undefined));
    await TestBed.configureTestingModule({
      imports: [PartnerApplicationPage],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: currentUser.asReadonly(),
            authMode: authMode.asReadonly(),
            resendVerification,
          },
        },
        { provide: PartnerApplicationStorageService, useValue: applicationStorage },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PartnerApplicationPage);
    fixture.detectChanges();
  });

  it('shows specific validation messages for invalid submitted fields', () => {
    const page = fixture.componentInstance as unknown as {
      form: FormGroup;
      submit(): void;
    };
    page.form.patchValue({
      organizationName: '  ',
      representativeName: 'A',
      phone: '1234',
      email: 'sai-email',
      address: 'ngắn',
      introduction: 'Chưa đủ dài',
      consent: false,
    });
    page.submit();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Trường này không được để trống.');
    expect(text).toContain('Số điện thoại phải bắt đầu bằng 0 hoặc +84');
    expect(text).toContain('Email chưa đúng định dạng');
    expect(text).toContain('Vui lòng nhập ít nhất 10 ký tự.');
    expect(text).toContain('Vui lòng nhập ít nhất 30 ký tự.');
    expect(text).toContain('Vui lòng đính kèm ít nhất một hồ sơ minh chứng.');
    expect(applicationStorage.submitRemote).not.toHaveBeenCalled();
  });

  it('uploads a valid application through the server only once', () => {
    const page = fixture.componentInstance as unknown as {
      form: FormGroup;
      documentNames: WritableSignal<readonly string[]>;
      selectedDocumentFiles: WritableSignal<readonly File[]>;
      submit(): void;
    };
    page.form.setValue({
      organizationName: 'Nhóm thiện nguyện An Tâm',
      representativeName: 'Nguyễn An',
      phone: '0912345678',
      email: 'an@example.com',
      address: 'Số 10 Trần Phú, Hà Nội',
      introduction: 'Chúng tôi hỗ trợ suất ăn và phương tiện cho bệnh nhân khó khăn.',
      consent: true,
    });
    page.documentNames.set(['xac-minh.pdf']);
    const file = new File(['%PDF-'], 'xac-minh.pdf', { type: 'application/pdf' });
    page.selectedDocumentFiles.set([file]);
    applicationStorage.submitRemote.mockReturnValue(of({ status: 'PENDING' }));

    page.submit();

    expect(applicationStorage.submitRemote).toHaveBeenCalledWith(
      expect.objectContaining({ organizationName: 'Nhóm thiện nguyện An Tâm' }),
      [file],
    );
  });

  it('explains that a temporary login cannot submit a partner application', () => {
    const page = fixture.componentInstance as unknown as {
      form: FormGroup;
      documentNames: WritableSignal<readonly string[]>;
      selectedDocumentFiles: WritableSignal<readonly File[]>;
      submit(): void;
    };
    page.form.setValue({
      organizationName: 'Nhóm thiện nguyện An Tâm',
      representativeName: 'Nguyễn An',
      phone: '0912345678',
      email: 'an@example.com',
      address: 'Số 10 Trần Phú, Hà Nội',
      introduction: 'Chúng tôi hỗ trợ suất ăn và phương tiện cho bệnh nhân khó khăn.',
      consent: true,
    });
    page.documentNames.set(['xac-minh.pdf']);
    page.selectedDocumentFiles.set([new File(['%PDF-'], 'xac-minh.pdf')]);
    authMode.set('LOCAL');

    page.submit();
    fixture.detectChanges();

    expect(applicationStorage.submitRemote).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('đăng xuất và đăng nhập lại');
  });

  it('prompts a pending account to request verification before showing the partner form', () => {
    currentUser.update((user) => ({ ...user!, status: 'PENDING_VERIFY' }));
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('Tài khoản chưa xác minh email');
    expect(host.querySelector('form')).toBeNull();

    host.querySelector<HTMLButtonElement>('.partner-application__verification button')?.click();
    fixture.detectChanges();

    expect(resendVerification).toHaveBeenCalledWith('an@example.com');
    expect(host.textContent).toContain('Yêu cầu đã được ghi nhận');
  });

  it('shows the provider configuration error instead of claiming that email was sent', () => {
    currentUser.update((user) => ({ ...user!, status: 'PENDING_VERIFY' }));
    resendVerification.mockReturnValue(
      throwError(
        () =>
          new AuthApiError(
            'INVALID_VERIFICATION_TOKEN',
            'Dịch vụ gửi email xác minh chưa được cấu hình.',
          ),
      ),
    );
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    host.querySelector<HTMLButtonElement>('.partner-application__verification button')?.click();
    fixture.detectChanges();

    expect(host.textContent).toContain('Dịch vụ gửi email xác minh chưa được cấu hình.');
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  });
});
