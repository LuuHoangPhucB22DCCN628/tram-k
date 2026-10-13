import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth.service';
import { UiButton } from '@shared/ui';

type VerificationState = 'loading' | 'success' | 'error' | 'missing';

@Component({
  selector: 'app-verify-email-change-page',
  standalone: true,
  imports: [RouterLink, UiButton],
  templateUrl: './verify-email-change-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailChangePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly state = signal<VerificationState>('loading');
  protected readonly verifiedEmail = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim();
    if (!token) {
      this.state.set('missing');
      return;
    }

    this.auth.verifyEmailChange(token).subscribe({
      next: ({ email }) => {
        this.verifiedEmail.set(email);
        this.state.set('success');
      },
      error: () => this.state.set('error'),
    });
  }

  protected goToLogin(): void {
    void this.router.navigateByUrl('/dang-nhap');
  }
}
