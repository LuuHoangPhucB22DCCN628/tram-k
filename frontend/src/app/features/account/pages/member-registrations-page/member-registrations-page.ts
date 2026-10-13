import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { ParamMap } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import type { CharityProgramRegistrationStatus } from '@features/account/services/charity-program-registration.service';
import { CharityProgramRegistrationService } from '@features/account/services/charity-program-registration.service';
import { CharityProgramStorageService } from '@features/account/services/charity-program-storage.service';
import { HANOI_DONATION_LOCATIONS } from '@features/community/data/hanoi-donation-locations.data';
import { CommunityLocationAdminStorageService } from '@features/community/services/community-location-admin-storage.service';
import { CommunityMealRegistrationService } from '@features/community/services/community-meal-registration.service';

@Component({
  selector: 'app-member-registrations-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './member-registrations-page.html',
  styleUrl: './member-registrations-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberRegistrationsPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly registrationService = inject(CommunityMealRegistrationService);
  private readonly programRegistrationService = inject(CharityProgramRegistrationService);
  private readonly programStorage = inject(CharityProgramStorageService);
  private readonly locationStorage = inject(CommunityLocationAdminStorageService);
  private readonly userId = this.auth.currentUser()?.id ?? '';

  protected readonly feedback = signal('');
  protected readonly highlightedProgramId = signal<string | null>(null);
  protected readonly registrations = computed(() => {
    this.locationStorage.changes();
    const locations = this.locationStorage.resolve(HANOI_DONATION_LOCATIONS);
    return this.registrationService.registrationsFor(this.userId).flatMap((registration) => {
      const location = locations.find((item) => item.id === registration.locationId);
      return location ? [{ registration, location }] : [];
    });
  });
  protected readonly programRegistrations = computed(() => {
    this.programStorage.proposals();
    this.programRegistrationService.registrations();
    const programs = this.programStorage.all();
    return this.programRegistrationService.registrationsFor(this.userId).flatMap((registration) => {
      const program = programs.find(
        (item) => item.id === registration.programId && item.status === 'PUBLISHED',
      );
      return program ? [{ registration, program }] : [];
    });
  });

  protected readonly hasRegistrations = computed(
    () => this.registrations().length > 0 || this.programRegistrations().length > 0,
  );

  constructor() {
    this.programStorage.initializePublic();
    this.programRegistrationService.loadMine();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.highlightRequestedProgram(params));
  }

  protected cancel(locationId: string): void {
    const removed = this.registrationService.unregister(locationId, this.userId);
    this.feedback.set(removed ? 'Đã hủy đăng ký chương trình.' : 'Không thể hủy đăng ký này.');
  }

  protected cancelProgram(programId: string): void {
    this.programRegistrationService
      .unregisterRemote(programId, this.userId)
      .subscribe((removed) =>
        this.feedback.set(
          removed
            ? 'Đã hủy đăng ký chương trình.'
            : 'Không thể hủy chương trình đã hoàn thành hoặc đăng ký không còn tồn tại.',
        ),
      );
  }

  protected programStatusLabel(status: CharityProgramRegistrationStatus): string {
    return {
      PENDING_CONFIRMATION: 'Chờ xác nhận',
      CONFIRMED: 'Đã xác nhận',
      REJECTED: 'Đã từ chối',
      COMPLETED: 'Đã hoàn thành',
    }[status];
  }

  private highlightRequestedProgram(params: ParamMap): void {
    const programId = params.get('program');
    this.highlightedProgramId.set(programId);
    if (!programId) return;
    if (!this.programRegistrations().some((item) => item.program.id === programId)) {
      this.highlightedProgramId.set(null);
      this.feedback.set('Chương trình trong thông báo không còn tồn tại hoặc đăng ký đã được hủy.');
    }
  }
}
