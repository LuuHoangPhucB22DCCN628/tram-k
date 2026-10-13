import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import type {
  CharityProgramProposal,
  CharitySupportType,
} from '@features/account/models/charity-program.models';
import { CharityProgramRegistrationService } from '@features/account/services/charity-program-registration.service';
import { CharityProgramStorageService } from '@features/account/services/charity-program-storage.service';
import { RevealDirective } from '@shared/directives/reveal.directive';
import { UiModal } from '@shared/ui/ui-modal/ui-modal';

import { CommunityMapBackground } from '../../components/community-map-background/community-map-background';
import { DONATION_MAP_REGIONS } from '../../data/donation-map-regions.data';

@Component({
  selector: 'app-community-support-programs-page',
  standalone: true,
  imports: [CommunityMapBackground, RevealDirective, RouterLink, UiModal],
  templateUrl: './community-support-programs-page.html',
  styleUrl: './community-support-programs-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunitySupportProgramsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly programStorage = inject(CharityProgramStorageService);
  private readonly programRegistrations = inject(CharityProgramRegistrationService);

  protected readonly programRegionFilter = signal('ALL');
  protected readonly publishedPrograms = computed(() =>
    this.programStorage
      .all()
      .filter((program) => program.status === 'PUBLISHED')
      .filter(
        (program) =>
          this.programRegionFilter() === 'ALL' || program.regionId === this.programRegionFilter(),
      ),
  );
  protected readonly programRegionOptions = computed(() => {
    const regionIds = new Set(
      this.programStorage
        .all()
        .filter((program) => program.status === 'PUBLISHED')
        .map((program) => program.regionId),
    );
    return DONATION_MAP_REGIONS.filter((region) => regionIds.has(region.id));
  });
  protected readonly selectedProgram = signal<CharityProgramProposal | null>(null);
  protected readonly programFeedback = signal('');
  protected readonly selectedProgramRegistered = computed(() => {
    this.programRegistrations.registrations();
    const program = this.selectedProgram();
    const user = this.auth.currentUser();
    return !!program && !!user && this.programRegistrations.isRegistered(program.id, user.id);
  });
  protected readonly selectedProgramFull = computed(() => {
    this.programRegistrations.registrations();
    const program = this.selectedProgram();
    return !!program && this.programRegistrations.countFor(program.id) >= program.capacity;
  });

  constructor() {
    this.programStorage.initializePublic();
    this.programRegistrations.loadMine();
    const requestedProgram = this.route.snapshot.queryParamMap.get('program');
    const program = this.programStorage
      .all()
      .find((item) => item.id === requestedProgram && item.status === 'PUBLISHED');
    if (program) this.selectedProgram.set(program);
  }

  protected updateProgramRegion(event: Event): void {
    this.programRegionFilter.set((event.target as HTMLSelectElement).value);
  }

  protected openProgramDetails(program: CharityProgramProposal): void {
    this.selectedProgram.set(program);
    this.programFeedback.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { program: program.id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected closeProgramDetails(): void {
    this.selectedProgram.set(null);
    this.programFeedback.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { program: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected registerForProgram(): void {
    const program = this.selectedProgram();
    if (!program) return;
    const user = this.auth.currentUser();
    if (!user) {
      const returnUrl = this.router
        .createUrlTree(['/cong-dong/chuong-trinh-ho-tro'], {
          queryParams: { program: program.id },
        })
        .toString();
      void this.router.navigate(['/dang-nhap'], { queryParams: { returnUrl } });
      return;
    }
    if (!this.auth.hasRole(['PATIENT', 'CARER'])) {
      this.programFeedback.set('Chỉ bệnh nhân và người nhà bệnh nhân có thể đăng ký chương trình.');
      return;
    }

    this.programRegistrations
      .registerRemote(program.id, user.id, program.capacity, user)
      .subscribe((result) => {
        this.programFeedback.set(
          result === 'CREATED'
            ? 'Đăng ký thành công. Trạm K sẽ liên hệ xác nhận với bạn.'
            : result === 'DUPLICATE'
              ? 'Bạn đã đăng ký chương trình này.'
              : result === 'FULL'
                ? 'Chương trình đã đủ số lượng đăng ký.'
                : 'Chưa thể gửi đăng ký. Vui lòng thử lại.',
        );
      });
  }

  protected programRegistrationLabel(): string {
    if (!this.auth.isAuthenticated()) return 'Đăng nhập để đăng ký';
    if (this.selectedProgramRegistered()) return 'Đã đăng ký';
    if (this.selectedProgramFull()) return 'Đã đủ số lượng';
    return 'Đăng ký tham gia';
  }

  protected supportTypeLabel(type: CharitySupportType): string {
    return {
      MEAL: 'Suất ăn',
      FINANCIAL: 'Hỗ trợ chi phí',
      TRANSPORT: 'Hỗ trợ di chuyển',
      OTHER: 'Hỗ trợ khác',
    }[type];
  }
}
