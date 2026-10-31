import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MemberAvatar } from '../../components/member-avatar/member-avatar';
import { ProfileApiService } from '../../profile-api.service';
import type { SharedMemberProfile } from '../../profile.models';

@Component({
  selector: 'app-shared-profile-page',
  standalone: true,
  imports: [MemberAvatar, RouterLink],
  templateUrl: './shared-profile-page.html',
  styleUrl: './shared-profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedProfilePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly profileApi = inject(ProfileApiService);
  protected readonly profile = signal<SharedMemberProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (!userId) {
      this.loading.set(false);
      this.error.set('Không tìm thấy hồ sơ.');
      return;
    }
    this.profileApi.getSharedProfile(userId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 403
            ? 'Thành viên chưa chia sẻ hồ sơ với bạn hoặc hồ sơ chỉ dành cho người đã đăng nhập.'
            : 'Không thể xem hồ sơ này. Vui lòng thử lại sau.',
        );
      },
    });
  }

  protected roleLabel(role: string): string {
    return (
      {
        PATIENT: 'Bệnh nhân',
        CARER: 'Người chăm sóc',
        PARTNER: 'Đối tác hỗ trợ',
      }[role] ?? 'Thành viên Trạm K'
    );
  }
}
