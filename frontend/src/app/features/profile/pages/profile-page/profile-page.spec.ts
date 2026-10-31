import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';

import { ProfileApiService } from '../../profile-api.service';
import type { MemberProfile } from '../../profile.models';
import { ProfilePage } from './profile-page';

describe('ProfilePage avatar', () => {
  const initialProfile: MemberProfile = {
    version: 1,
    displayName: 'Phúc Trạm K',
    phone: '',
    city: '',
    birthYear: '',
    bio: '',
    avatarDataUrl: null,
    visibility: 'MEMBERS',
    showEmail: false,
    allowComments: true,
  };
  let storedProfile: MemberProfile;
  const profileApi = {
    getOwnProfile: vi.fn(() => of(storedProfile)),
    updateOwnProfile: vi.fn((_user: unknown, _mode: unknown, profile: MemberProfile) => {
      storedProfile = { ...profile, version: profile.version + 1 };
      return of(storedProfile);
    }),
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    storedProfile = initialProfile;
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [provideRouter([]), { provide: ProfileApiService, useValue: profileApi }],
    });
    TestBed.inject(AuthService)
      .login({ email: 'phuc@tramk.vn', password: 'Matkhau123', rememberMe: false })
      .subscribe();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('previews a selected image and saves it from the avatar card', async () => {
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const input = page.querySelector<HTMLInputElement>('#profile-avatar-input')!;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File(['avatar'], 'avatar.png', { type: 'image/png' })],
    });

    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.querySelector('.profile-avatar__preview img')).not.toBeNull();
    expect(page.querySelector('.profile-avatar__feedback')?.textContent).toContain('chưa lưu');
    page.querySelector<HTMLButtonElement>('.profile-avatar__save')?.click();
    fixture.detectChanges();

    expect(profileApi.updateOwnProfile).toHaveBeenCalledOnce();
    expect(storedProfile.avatarDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(TestBed.inject(AuthService).currentUser()?.avatarUrl).toBe(storedProfile.avatarDataUrl);
    expect(page.querySelector('.profile-avatar__feedback')?.textContent).toContain('Đã lưu');
  });

  it('optimizes a phone photo larger than 1 MB before saving', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 2400, height: 1800, close })),
    );
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/webp;base64,YWJj',
    );

    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const input = page.querySelector<HTMLInputElement>('#profile-avatar-input')!;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File([new Uint8Array(2 * 1024 * 1024)], 'phone.jpg', { type: 'image/jpeg' })],
    });

    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(drawImage).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    page.querySelector<HTMLButtonElement>('.profile-avatar__save')?.click();
    expect(storedProfile.avatarDataUrl).toBe('data:image/webp;base64,YWJj');
  });

  it('shows an error beside the avatar when the original file exceeds 10 MB', async () => {
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const input = page.querySelector<HTMLInputElement>('#profile-avatar-input')!;
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })],
    });

    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.querySelector('.profile-avatar__feedback--error')?.textContent).toContain('10 MB');
    expect(page.querySelector('.profile-avatar__save')).toBeNull();
  });
});
