import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';

import { API_BASE_URL } from '@core/config/api-base-url.token';
import { AccountNotificationStorageService } from './account-notification-storage.service';
import { CharityProgramStorageService } from './charity-program-storage.service';

export type CharityProgramRegistrationStatus =
  'PENDING_CONFIRMATION' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED';

export interface CharityProgramRegistration {
  readonly programId: string;
  readonly userId: string;
  readonly applicantName: string;
  readonly applicantEmail: string;
  readonly registeredAt: string;
  readonly updatedAt: string;
  readonly status: CharityProgramRegistrationStatus;
  readonly decisionReason?: string;
}

export type CharityProgramRegistrationResult = 'CREATED' | 'DUPLICATE' | 'FULL' | 'ERROR';

interface ApiResponse<T> {
  readonly success: true;
  readonly data: T;
}

@Injectable({ providedIn: 'root' })
export class CharityProgramRegistrationService {
  private readonly storageKey = 'tram-k.charity-program-registrations';
  private readonly notifications = inject(AccountNotificationStorageService);
  private readonly programs = inject(CharityProgramStorageService);
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiBaseUrl = (inject(API_BASE_URL, { optional: true }) ?? '').replace(/\/$/, '');
  private readonly registrationsState = signal<readonly CharityProgramRegistration[]>(this.read());
  private mineLoaded = false;
  private readonly loadedPrograms = new Set<string>();

  readonly registrations = this.registrationsState.asReadonly();

  loadMine(): void {
    if (this.mineLoaded || !this.http || !this.apiBaseUrl) return;
    this.mineLoaded = true;
    this.http
      .get<ApiResponse<readonly CharityProgramRegistration[]>>(
        `${this.apiBaseUrl}/support-program-registrations/mine`,
      )
      .pipe(catchError(() => of(null)))
      .subscribe((response) => {
        if (!response) return;
        const otherUsers = this.registrationsState().filter(
          (item) => !response.data.some((remote) => remote.userId === item.userId),
        );
        this.registrationsState.set([...otherUsers, ...response.data]);
      });
  }

  loadForProgram(programId: string): void {
    if (this.loadedPrograms.has(programId) || !this.http || !this.apiBaseUrl) return;
    this.loadedPrograms.add(programId);
    this.http
      .get<ApiResponse<readonly CharityProgramRegistration[]>>(
        `${this.apiBaseUrl}/support-program-registrations/program/${encodeURIComponent(programId)}`,
      )
      .pipe(catchError(() => of(null)))
      .subscribe((response) => {
        if (!response) return;
        this.registrationsState.set([
          ...this.registrationsState().filter((item) => item.programId !== programId),
          ...response.data,
        ]);
      });
  }

  registerRemote(
    programId: string,
    userId: string,
    capacity: number,
    applicant?: { readonly displayName: string; readonly email: string },
  ): Observable<CharityProgramRegistrationResult> {
    const optimisticResult = this.register(programId, userId, capacity, applicant);
    if (optimisticResult !== 'CREATED' || !this.http || !this.apiBaseUrl) {
      return of(optimisticResult);
    }
    return this.http
      .post<ApiResponse<CharityProgramRegistration>>(
        `${this.apiBaseUrl}/support-program-registrations/program/${encodeURIComponent(programId)}`,
        {},
      )
      .pipe(
        tap((response) => this.upsertRegistration(response.data)),
        map(() => 'CREATED' as const),
        catchError((error: HttpErrorResponse): Observable<CharityProgramRegistrationResult> => {
          this.removeRegistration(programId, userId);
          const message = this.errorMessage(error);
          const result: CharityProgramRegistrationResult = message.includes('đủ số lượng')
            ? 'FULL'
            : message.includes('đã đăng ký')
              ? 'DUPLICATE'
              : 'ERROR';
          return of(result);
        }),
      );
  }

  unregisterRemote(programId: string, userId: string): Observable<boolean> {
    if (!this.http || !this.apiBaseUrl) return of(this.unregister(programId, userId));
    return this.http
      .delete<ApiResponse<{ readonly cancelled: boolean }>>(
        `${this.apiBaseUrl}/support-program-registrations/program/${encodeURIComponent(programId)}`,
      )
      .pipe(
        tap(() => this.removeRegistration(programId, userId)),
        map(() => true),
        catchError(() => of(false)),
      );
  }

  reviewRemote(
    programId: string,
    userId: string,
    decision: Extract<CharityProgramRegistrationStatus, 'CONFIRMED' | 'REJECTED'>,
    reason = '',
  ): Observable<boolean> {
    return this.updateRemote(programId, userId, decision, reason);
  }

  completeRemote(programId: string, userId: string): Observable<boolean> {
    return this.updateRemote(programId, userId, 'COMPLETED');
  }

  registrationsFor(userId: string): readonly CharityProgramRegistration[] {
    return this.registrationsState()
      .filter((registration) => registration.userId === userId)
      .sort((left, right) => right.registeredAt.localeCompare(left.registeredAt));
  }

  registrationsForProgram(programId: string): readonly CharityProgramRegistration[] {
    return this.registrationsState()
      .filter((registration) => registration.programId === programId)
      .sort((left, right) => right.registeredAt.localeCompare(left.registeredAt));
  }

  countFor(programId: string): number {
    return this.registrationsState().filter(
      (item) => item.programId === programId && item.status !== 'REJECTED',
    ).length;
  }

  isRegistered(programId: string, userId: string): boolean {
    return this.registrationsState().some(
      (registration) => registration.programId === programId && registration.userId === userId,
    );
  }

  register(
    programId: string,
    userId: string,
    capacity: number,
    applicant?: { readonly displayName: string; readonly email: string },
  ): CharityProgramRegistrationResult {
    if (this.isRegistered(programId, userId)) return 'DUPLICATE';
    if (this.countFor(programId) >= capacity) return 'FULL';

    const now = new Date().toISOString();
    const registration: CharityProgramRegistration = {
      programId,
      userId,
      applicantName: applicant?.displayName.trim() || 'Thành viên Trạm K',
      applicantEmail: applicant?.email.trim().toLowerCase() || '',
      registeredAt: now,
      updatedAt: now,
      status: 'PENDING_CONFIRMATION',
    };
    this.persist([...this.registrationsState(), registration]);

    const program = this.programs.all().find((item) => item.id === programId);
    const programTitle = program?.title ?? 'chương trình hỗ trợ';
    this.notifications.create({
      recipientUserId: userId,
      kind: 'PROGRAM_REGISTRATION_SENT',
      title: 'Đã gửi đăng ký hỗ trợ',
      message: `Đăng ký chương trình “${programTitle}” đang chờ nhà hảo tâm xác nhận.`,
      link: `/thanh-vien/chuong-trinh-da-dang-ky?program=${encodeURIComponent(programId)}`,
      dedupeKey: `program-registration:${programId}:${userId}:sent`,
    });
    if (program?.ownerId) {
      this.notifications.create({
        recipientUserId: program.ownerId,
        kind: 'PROGRAM_REGISTRATION_RECEIVED',
        title: 'Có đăng ký hỗ trợ mới',
        message: `${registration.applicantName} vừa đăng ký chương trình “${programTitle}”.`,
        link: `/doi-tac/quan-ly-chuong-trinh?program=${encodeURIComponent(programId)}&registration=${encodeURIComponent(userId)}`,
        dedupeKey: `program-registration:${programId}:${userId}:received`,
      });
    }
    return 'CREATED';
  }

  unregister(programId: string, userId: string): boolean {
    const registration = this.registrationsState().find(
      (item) => item.programId === programId && item.userId === userId,
    );
    if (!registration || registration.status === 'COMPLETED') return false;
    this.persist(
      this.registrationsState().filter(
        (registration) => registration.programId !== programId || registration.userId !== userId,
      ),
    );
    return true;
  }

  review(
    programId: string,
    userId: string,
    decision: Extract<CharityProgramRegistrationStatus, 'CONFIRMED' | 'REJECTED'>,
    reason = '',
  ): boolean {
    const normalizedReason = reason.trim();
    if (decision === 'REJECTED' && normalizedReason.length < 10) return false;
    const updated = this.updateStatus(
      programId,
      userId,
      'PENDING_CONFIRMATION',
      decision,
      normalizedReason,
    );
    if (!updated) return false;

    const programTitle = this.programTitle(programId);
    this.notifications.create({
      recipientUserId: userId,
      kind:
        decision === 'CONFIRMED'
          ? 'PROGRAM_REGISTRATION_CONFIRMED'
          : 'PROGRAM_REGISTRATION_REJECTED',
      title: decision === 'CONFIRMED' ? 'Đăng ký đã được xác nhận' : 'Đăng ký chưa được chấp thuận',
      message:
        decision === 'CONFIRMED'
          ? `Bạn đã được xác nhận tham gia chương trình “${programTitle}”.`
          : `Chương trình “${programTitle}” chưa thể tiếp nhận đăng ký của bạn. Lý do: ${normalizedReason}`,
      link: `/thanh-vien/chuong-trinh-da-dang-ky?program=${encodeURIComponent(programId)}`,
      dedupeKey: `program-registration:${programId}:${userId}:${decision.toLowerCase()}`,
    });
    return true;
  }

  complete(programId: string, userId: string): boolean {
    const updated = this.updateStatus(programId, userId, 'CONFIRMED', 'COMPLETED');
    if (!updated) return false;
    this.notifications.create({
      recipientUserId: userId,
      kind: 'PROGRAM_REGISTRATION_COMPLETED',
      title: 'Chương trình hỗ trợ đã hoàn thành',
      message: `Trạng thái tham gia chương trình “${this.programTitle(programId)}” đã được cập nhật hoàn thành.`,
      link: `/thanh-vien/chuong-trinh-da-dang-ky?program=${encodeURIComponent(programId)}`,
      dedupeKey: `program-registration:${programId}:${userId}:completed`,
    });
    return true;
  }

  private programTitle(programId: string): string {
    return (
      this.programs.all().find((program) => program.id === programId)?.title ??
      'chương trình hỗ trợ'
    );
  }

  private persist(registrations: readonly CharityProgramRegistration[]): void {
    this.registrationsState.set(registrations);
  }

  private updateRemote(
    programId: string,
    userId: string,
    status: Extract<CharityProgramRegistrationStatus, 'CONFIRMED' | 'REJECTED' | 'COMPLETED'>,
    decisionReason = '',
  ): Observable<boolean> {
    if (!this.http || !this.apiBaseUrl) {
      return of(
        status === 'COMPLETED'
          ? this.complete(programId, userId)
          : this.review(programId, userId, status, decisionReason),
      );
    }
    return this.http
      .patch<ApiResponse<CharityProgramRegistration>>(
        `${this.apiBaseUrl}/support-program-registrations/program/${encodeURIComponent(programId)}/member/${encodeURIComponent(userId)}`,
        { status, decisionReason: decisionReason || undefined },
      )
      .pipe(
        tap((response) => this.upsertRegistration(response.data)),
        map(() => true),
        catchError(() => of(false)),
      );
  }

  private upsertRegistration(registration: CharityProgramRegistration): void {
    this.registrationsState.set([
      ...this.registrationsState().filter(
        (item) => item.programId !== registration.programId || item.userId !== registration.userId,
      ),
      registration,
    ]);
  }

  private removeRegistration(programId: string, userId: string): void {
    this.registrationsState.set(
      this.registrationsState().filter(
        (item) => item.programId !== programId || item.userId !== userId,
      ),
    );
  }

  private errorMessage(error: HttpErrorResponse): string {
    const body = error.error as { readonly message?: string | readonly string[] } | null;
    const message = body?.message;
    return typeof message === 'string' ? message : (message?.join(' ') ?? '');
  }

  private read(): readonly CharityProgramRegistration[] {
    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) return [];
      const value: unknown = JSON.parse(rawValue);
      if (!Array.isArray(value)) return [];
      return value.filter(this.isRegistration).map((registration) => {
        const status = ['PENDING_CONFIRMATION', 'CONFIRMED', 'REJECTED', 'COMPLETED'].includes(
          registration.status,
        )
          ? registration.status
          : 'PENDING_CONFIRMATION';
        return {
          ...registration,
          applicantName: registration.applicantName || 'Thành viên Trạm K',
          applicantEmail: registration.applicantEmail || '',
          updatedAt: registration.updatedAt || registration.registeredAt,
          status,
        };
      });
    } catch {
      return [];
    }
  }

  private readonly isRegistration = (value: unknown): value is CharityProgramRegistration => {
    if (!value || typeof value !== 'object') return false;
    const registration = value as Partial<CharityProgramRegistration>;
    return (
      typeof registration.programId === 'string' &&
      typeof registration.userId === 'string' &&
      typeof registration.registeredAt === 'string' &&
      (registration.applicantName === undefined ||
        typeof registration.applicantName === 'string') &&
      (registration.applicantEmail === undefined ||
        typeof registration.applicantEmail === 'string') &&
      (registration.updatedAt === undefined || typeof registration.updatedAt === 'string') &&
      (registration.status === undefined || typeof registration.status === 'string')
    );
  };

  private updateStatus(
    programId: string,
    userId: string,
    expectedStatus: CharityProgramRegistrationStatus,
    status: CharityProgramRegistrationStatus,
    decisionReason = '',
  ): boolean {
    let updated = false;
    const now = new Date().toISOString();
    const registrations = this.registrationsState().map((registration) => {
      if (
        registration.programId !== programId ||
        registration.userId !== userId ||
        registration.status !== expectedStatus
      ) {
        return registration;
      }
      updated = true;
      return {
        ...registration,
        status,
        updatedAt: now,
        decisionReason: status === 'REJECTED' ? decisionReason : undefined,
      };
    });
    if (updated) this.persist(registrations);
    return updated;
  }
}
