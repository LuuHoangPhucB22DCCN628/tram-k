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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { ParamMap } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { EscapeCloseDirective } from '@shared/directives/escape-close.directive';

import type {
  CharityProgramProposal,
  CharityProgramStatus,
  CharitySupportType,
} from '../../models/charity-program.models';
import type {
  CharityProgramRegistration,
  CharityProgramRegistrationStatus,
} from '../../services/charity-program-registration.service';
import { CharityProgramRegistrationService } from '../../services/charity-program-registration.service';
import { CharityProgramStorageService } from '../../services/charity-program-storage.service';

type RegistrationFilter = 'ALL' | CharityProgramRegistrationStatus;

@Component({
  selector: 'app-partner-program-management-page',
  standalone: true,
  imports: [DatePipe, RouterLink, EscapeCloseDirective],
  templateUrl: './partner-program-management-page.html',
  styleUrl: './partner-program-management-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerProgramManagementPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly storage = inject(CharityProgramStorageService);
  private readonly registrations = inject(CharityProgramRegistrationService);
  private readonly userId = this.auth.currentUser()?.id ?? '';

  protected readonly selected = signal<CharityProgramProposal | null>(null);
  protected readonly registrationFilter = signal<RegistrationFilter>('ALL');
  protected readonly rejectingUserId = signal<string | null>(null);
  protected readonly rejectionReason = signal('');
  protected readonly registrationFeedback = signal('');
  protected readonly highlightedRegistrationUserId = signal<string | null>(null);
  protected readonly feedback = signal(
    this.route.snapshot.queryParamMap.has('created') ? 'Đã gửi đề xuất để Trạm K xét duyệt.' : '',
  );
  protected readonly proposals = computed(() => this.storage.proposalsFor(this.userId));
  protected readonly selectedRegistrations = computed(() => {
    this.registrations.registrations();
    const proposal = this.selected();
    if (!proposal || proposal.ownerId !== this.userId || proposal.status !== 'PUBLISHED') return [];
    return this.registrations
      .registrationsForProgram(proposal.id)
      .filter(
        (registration) =>
          this.registrationFilter() === 'ALL' || registration.status === this.registrationFilter(),
      );
  });

  constructor() {
    this.storage.initializeMine(this.userId);
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.openRequestedProgram(params));
  }

  protected openDetails(proposal: CharityProgramProposal): void {
    this.registrations.loadForProgram(proposal.id);
    this.showDetails(proposal, null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { program: proposal.id, registration: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected closeDetails(): void {
    this.selected.set(null);
    this.highlightedRegistrationUserId.set(null);
    this.cancelReject();
    this.registrationFeedback.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { program: null, registration: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected cancel(proposal: CharityProgramProposal): void {
    if (!this.storage.cancelPending(this.userId, proposal.id)) {
      this.feedback.set('Chỉ có thể hủy đề xuất đang chờ duyệt.');
      return;
    }
    if (this.selected()?.id === proposal.id) this.closeDetails();
    this.feedback.set('Đã hủy đề xuất chương trình.');
  }

  protected statusLabel(status: CharityProgramStatus): string {
    return {
      PENDING: 'Chờ duyệt',
      PUBLISHED: 'Đã xuất bản',
      REJECTED: 'Cần chỉnh sửa',
    }[status];
  }

  protected supportTypeLabel(type: CharitySupportType): string {
    return {
      MEAL: 'Suất ăn',
      FINANCIAL: 'Hỗ trợ chi phí',
      TRANSPORT: 'Hỗ trợ di chuyển',
      OTHER: 'Hình thức khác',
    }[type];
  }

  protected registrationCount(programId: string): number {
    this.registrations.registrations();
    return this.registrations.countFor(programId);
  }

  protected remainingCapacity(proposal: CharityProgramProposal): number {
    return Math.max(0, proposal.capacity - this.registrationCount(proposal.id));
  }

  protected updateRegistrationFilter(event: Event): void {
    this.registrationFilter.set((event.target as HTMLSelectElement).value as RegistrationFilter);
    this.cancelReject();
  }

  protected registrationStatusLabel(status: CharityProgramRegistrationStatus): string {
    return {
      PENDING_CONFIRMATION: 'Chờ xác nhận',
      CONFIRMED: 'Đã xác nhận',
      REJECTED: 'Đã từ chối',
      COMPLETED: 'Đã hoàn thành',
    }[status];
  }

  protected confirmRegistration(registration: CharityProgramRegistration): void {
    const proposal = this.manageableSelectedProposal(registration.programId);
    if (!proposal) {
      this.registrationFeedback.set(
        'Không thể xác nhận đăng ký này. Vui lòng kiểm tra lại trạng thái.',
      );
      return;
    }
    this.registrations
      .reviewRemote(proposal.id, registration.userId, 'CONFIRMED')
      .subscribe((updated) => {
        if (!updated) {
          this.registrationFeedback.set(
            'Không thể xác nhận đăng ký này. Vui lòng kiểm tra lại trạng thái.',
          );
          return;
        }
        this.cancelReject();
        this.registrationFeedback.set(`Đã xác nhận đăng ký của ${registration.applicantName}.`);
      });
  }

  protected beginReject(registration: CharityProgramRegistration): void {
    if (!this.manageableSelectedProposal(registration.programId)) return;
    this.rejectingUserId.set(registration.userId);
    this.rejectionReason.set('');
  }

  protected updateRejectionReason(event: Event): void {
    this.rejectionReason.set((event.target as HTMLTextAreaElement).value);
  }

  protected rejectRegistration(registration: CharityProgramRegistration): void {
    const proposal = this.manageableSelectedProposal(registration.programId);
    if (!proposal) return;
    if (this.rejectionReason().trim().length < 10) {
      this.registrationFeedback.set('Lý do từ chối phải có ít nhất 10 ký tự.');
      return;
    }
    this.registrations
      .reviewRemote(proposal.id, registration.userId, 'REJECTED', this.rejectionReason())
      .subscribe((updated) => {
        if (!updated) {
          this.registrationFeedback.set(
            'Không thể từ chối đăng ký này. Vui lòng kiểm tra lại trạng thái.',
          );
          return;
        }
        this.cancelReject();
        this.registrationFeedback.set(`Đã từ chối đăng ký của ${registration.applicantName}.`);
      });
  }

  protected completeRegistration(registration: CharityProgramRegistration): void {
    const proposal = this.manageableSelectedProposal(registration.programId);
    if (!proposal) {
      this.registrationFeedback.set('Chỉ đăng ký đã xác nhận mới có thể đánh dấu hoàn thành.');
      return;
    }
    this.registrations.completeRemote(proposal.id, registration.userId).subscribe((updated) => {
      this.registrationFeedback.set(
        updated
          ? `Đã đánh dấu hoàn thành hỗ trợ cho ${registration.applicantName}.`
          : 'Chỉ đăng ký đã xác nhận mới có thể đánh dấu hoàn thành.',
      );
    });
  }

  protected cancelReject(): void {
    this.rejectingUserId.set(null);
    this.rejectionReason.set('');
  }

  private manageableSelectedProposal(programId: string): CharityProgramProposal | null {
    const proposal = this.selected();
    return proposal?.id === programId &&
      proposal.ownerId === this.userId &&
      proposal.status === 'PUBLISHED'
      ? proposal
      : null;
  }

  private openRequestedProgram(params: ParamMap): void {
    const programId = params.get('program');
    if (!programId) return;

    const proposal = this.storage.proposalFor(this.userId, programId);
    if (!proposal) {
      this.selected.set(null);
      this.highlightedRegistrationUserId.set(null);
      this.feedback.set(
        'Chương trình trong thông báo không còn tồn tại hoặc bạn không có quyền truy cập.',
      );
      return;
    }

    const registrationUserId = params.get('registration');
    this.showDetails(proposal, registrationUserId);
    if (
      registrationUserId &&
      !this.registrations
        .registrationsForProgram(programId)
        .some((registration) => registration.userId === registrationUserId)
    ) {
      this.highlightedRegistrationUserId.set(null);
      this.registrationFeedback.set('Đăng ký trong thông báo không còn tồn tại.');
    }
  }

  private showDetails(
    proposal: CharityProgramProposal,
    highlightedRegistrationUserId: string | null,
  ): void {
    this.registrations.loadForProgram(proposal.id);
    this.selected.set(proposal);
    this.registrationFilter.set('ALL');
    this.highlightedRegistrationUserId.set(highlightedRegistrationUserId);
    this.cancelReject();
    this.registrationFeedback.set('');
  }
}
