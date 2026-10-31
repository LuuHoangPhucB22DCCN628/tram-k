import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';
import { HairRegistrationLookupApiService } from '../../services/hair-registration-lookup-api.service';
import { HairRegistrationLookupPage } from './hair-registration-lookup-page';

describe('HairRegistrationLookupPage', () => {
  const authMode = signal<'LOCAL' | 'REMOTE'>('REMOTE');
  const api = { lookup: vi.fn() };
  const auth = { authMode: authMode.asReadonly(), logout: vi.fn() };

  beforeEach(async () => {
    authMode.set('REMOTE');
    api.lookup.mockReset();
    auth.logout.mockReset();
    await TestBed.configureTestingModule({
      imports: [HairRegistrationLookupPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: HairRegistrationLookupApiService, useValue: api },
      ],
    }).compileComponents();
  });

  function submitCode(): HTMLElement {
    const fixture = TestBed.createComponent(HairRegistrationLookupPage);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('#hair-reference')!;
    input.value = 'tk-20261016-e7ebd768';
    input.dispatchEvent(new Event('input'));
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
    return root;
  }

  it('shows the owner registration status returned by the server', () => {
    api.lookup.mockReturnValue(
      of({
        reference: 'TK-20261016-E7EBD768',
        mode: 'RECEIVE',
        status: 'PENDING',
        submittedAt: '2026-10-16T10:00:00.000Z',
        updatedAt: '2026-10-16T10:00:00.000Z',
        rejectionReason: null,
      }),
    );
    const root = submitCode();
    expect(api.lookup).toHaveBeenCalledWith('TK-20261016-E7EBD768');
    expect(root.textContent).toContain('Đang chờ xét duyệt');
  });

  it('explains why an offline test account cannot query the backend', () => {
    authMode.set('LOCAL');
    const root = submitCode();
    expect(api.lookup).not.toHaveBeenCalled();
    expect(root.textContent).toContain('chế độ thử ngoại tuyến');
    expect(root.textContent).toContain('Đăng nhập lại để tra cứu');
  });

  it('distinguishes a connection failure from an unknown registration code', () => {
    api.lookup.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );
    const root = submitCode();
    expect(root.textContent).toContain('Không kết nối được máy chủ Trạm K');
    expect(root.textContent).not.toContain('Không tìm thấy mã đăng ký');
  });

  it('offers re-login after an expired session', () => {
    api.lookup.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );
    const root = submitCode();
    expect(root.textContent).toContain('Phiên đăng nhập đã hết hạn');
    expect(root.querySelector('.hair-lookup__reconnect')).not.toBeNull();
  });
});
