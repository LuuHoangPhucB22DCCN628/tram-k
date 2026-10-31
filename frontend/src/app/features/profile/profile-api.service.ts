import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';

import type { AuthMode, AuthUser } from '@core/auth/auth.models';
import { API_BASE_URL } from '@core/config/api-base-url.token';

import { ProfileApiError, type MemberProfile, type SharedMemberProfile } from './profile.models';
import { ProfileStorageService } from './profile-storage.service';

interface ApiSuccessResponse<T> {
  readonly success: true;
  readonly data: T;
}

interface ApiErrorResponse {
  readonly error?: { readonly message?: string | readonly string[] };
}

interface RemoteProfile extends Omit<MemberProfile, 'birthYear'> {
  readonly birthYear: number | null;
}

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL).replace(/\/$/, '');
  private readonly storage = inject(ProfileStorageService);

  getOwnProfile(user: AuthUser, mode: AuthMode): Observable<MemberProfile> {
    if (mode === 'LOCAL') return of(this.storage.read(user));
    return this.http.get<ApiSuccessResponse<RemoteProfile>>(`${this.apiBaseUrl}/profile/me`).pipe(
      map(({ data }) => this.fromRemote(data)),
      catchError((error: HttpErrorResponse) => throwError(() => this.mapError(error))),
    );
  }

  getSharedProfile(userId: string): Observable<SharedMemberProfile> {
    return this.http
      .get<ApiSuccessResponse<SharedMemberProfile>>(
        `${this.apiBaseUrl}/profile/public/${encodeURIComponent(userId)}`,
      )
      .pipe(map(({ data }) => data));
  }

  updateOwnProfile(
    user: AuthUser,
    mode: AuthMode,
    profile: MemberProfile,
  ): Observable<MemberProfile> {
    if (mode === 'LOCAL') {
      const saved = { ...profile, version: profile.version + 1 };
      this.storage.write(user.id, saved);
      return of(saved);
    }
    return this.http
      .patch<ApiSuccessResponse<RemoteProfile>>(`${this.apiBaseUrl}/profile/me`, {
        expectedVersion: profile.version,
        displayName: profile.displayName,
        phone: profile.phone,
        city: profile.city,
        birthYear: profile.birthYear ? Number(profile.birthYear) : null,
        bio: profile.bio,
        avatarDataUrl: profile.avatarDataUrl,
        visibility: profile.visibility,
        showEmail: profile.showEmail,
        allowComments: profile.allowComments,
      })
      .pipe(
        map(({ data }) => this.fromRemote(data)),
        catchError((error: HttpErrorResponse) => throwError(() => this.mapError(error))),
      );
  }

  private fromRemote(profile: RemoteProfile): MemberProfile {
    return {
      ...profile,
      birthYear: profile.birthYear === null ? '' : String(profile.birthYear),
    };
  }

  private mapError(error: HttpErrorResponse): ProfileApiError {
    if (error.status === 413) {
      return new ProfileApiError(
        'VALIDATION',
        'Ảnh sau khi xử lý vẫn quá lớn để gửi. Vui lòng chọn ảnh khác.',
      );
    }
    const rawMessage = (error.error as ApiErrorResponse | null)?.error?.message;
    const message =
      typeof rawMessage === 'string'
        ? rawMessage
        : Array.isArray(rawMessage)
          ? Array.from(rawMessage).join(' ')
          : 'Không thể cập nhật hồ sơ. Vui lòng thử lại.';
    const code =
      error.status === 409
        ? 'CONFLICT'
        : error.status === 401
          ? 'SESSION_EXPIRED'
          : error.status === 400
            ? 'VALIDATION'
            : 'UNKNOWN';
    return new ProfileApiError(code, message);
  }
}
