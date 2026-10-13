import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';

import { AuthService } from '@core/auth/auth.service';
import { PartnerApplicationStorageService } from '../../services/partner-application-storage.service';
import { PartnerApplicationPage } from './partner-application-page';

describe('PartnerApplicationPage', () => {
  let fixture: ComponentFixture<PartnerApplicationPage>;
  const applicationStorage = {
    forApplicant: vi.fn(() => null),
    submit: vi.fn(),
    initializeMine: vi.fn(),
  };

  beforeEach(async () => {
    applicationStorage.forApplicant.mockReturnValue(null);
    applicationStorage.submit.mockReset();
    await TestBed.configureTestingModule({
      imports: [PartnerApplicationPage],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({
              id: 'USER-1',
              displayName: 'Nguyễn An',
              email: 'an@example.com',
              role: 'PATIENT',
            }).asReadonly(),
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
    expect(applicationStorage.submit).not.toHaveBeenCalled();
  });

  it('submits a normalized valid application', () => {
    const page = fixture.componentInstance as unknown as {
      form: FormGroup;
      documentNames: WritableSignal<readonly string[]>;
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
    applicationStorage.submit.mockReturnValue({ status: 'PENDING' });

    page.submit();

    expect(applicationStorage.submit).toHaveBeenCalledWith(
      'USER-1',
      'Nguyễn An',
      expect.objectContaining({ documentNames: ['xac-minh.pdf'] }),
    );
  });
});
