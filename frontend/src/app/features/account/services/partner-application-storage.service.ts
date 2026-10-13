import { inject, Injectable, signal } from '@angular/core';
import { Observable, of, switchMap, tap } from 'rxjs';

import type {
  PartnerApplication,
  PartnerApplicationInput,
  PartnerApplicationStatus,
} from '../models/partner-application.models';
import { PartnerApplicationApiService } from './partner-application-api.service';

@Injectable({ providedIn: 'root' })
export class PartnerApplicationStorageService {
  private readonly storageKey = 'tram-k.partner-applications';
  private readonly api = inject(PartnerApplicationApiService);
  private readonly applicationsState = signal<readonly PartnerApplication[]>(this.read());
  private mineInitialized = false;
  private adminInitialized = false;

  readonly applications = this.applicationsState.asReadonly();

  all(): readonly PartnerApplication[] {
    return [...this.applicationsState()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  forApplicant(applicantId: string): PartnerApplication | null {
    return this.all().find((item) => item.applicantId === applicantId) ?? null;
  }

  initializeMine(applicantId: string): void {
    if (!applicantId || this.mineInitialized) return;
    this.mineInitialized = true;
    this.api.mine().subscribe((application) => {
      if (application === undefined) return;
      const others = this.applicationsState().filter((item) => item.applicantId !== applicantId);
      this.applicationsState.set(application ? [application, ...others] : others);
      if (application) localStorage.removeItem(this.storageKey);
    });
  }

  initializeAdmin(): void {
    if (this.adminInitialized) return;
    this.adminInitialized = true;
    this.api.list().subscribe((applications) => {
      if (applications) this.applicationsState.set(applications);
    });
  }

  submitRemote(
    input: Omit<PartnerApplicationInput, 'documentNames'>,
    files: readonly File[],
  ): Observable<PartnerApplication | null> {
    if (!files.length) return of(null);
    return this.api.upload(files).pipe(
      switchMap((documents) =>
        documents
          ? this.api.submit(
              input,
              documents.map((document) => document.storageKey),
            )
          : of(null),
      ),
      tap((application) => {
        if (!application) return;
        this.upsert(application);
        localStorage.removeItem(this.storageKey);
      }),
    );
  }

  reviewRemote(
    applicationId: string,
    decision: Extract<PartnerApplicationStatus, 'APPROVED' | 'REJECTED'>,
    reason = '',
  ): Observable<PartnerApplication | null> {
    return this.api.review(applicationId, decision, reason).pipe(
      tap((application) => {
        if (application) this.upsert(application);
      }),
    );
  }

  downloadDocument(storageKey: string, originalName: string): void {
    this.api.download(storageKey, originalName);
  }

  submit(
    applicantId: string,
    applicantName: string,
    input: PartnerApplicationInput,
  ): PartnerApplication | null {
    const current = this.forApplicant(applicantId);
    if (current && current.status !== 'REJECTED') return null;

    const now = new Date().toISOString();
    const application: PartnerApplication = {
      ...input,
      id:
        current?.id ??
        `PARTNER-APPLICATION-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      applicantId,
      applicantName: applicantName.trim(),
      organizationName: input.organizationName.trim(),
      representativeName: input.representativeName.trim(),
      phone: input.phone.trim(),
      email: input.email.trim().toLowerCase(),
      address: input.address.trim(),
      introduction: input.introduction.trim(),
      documentNames: input.documentNames.map((name) => name.trim()),
      status: 'PENDING',
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    const others = this.applicationsState().filter((item) => item.applicantId !== applicantId);
    return this.persist([application, ...others]) ? application : null;
  }

  review(
    applicationId: string,
    decision: Extract<PartnerApplicationStatus, 'APPROVED' | 'REJECTED'>,
    reviewerName: string,
    reason = '',
  ): PartnerApplication | null {
    const normalizedReason = reason.trim();
    if (decision === 'REJECTED' && normalizedReason.length < 10) return null;
    let result: PartnerApplication | null = null;
    const now = new Date().toISOString();
    const applications = this.applicationsState().map((item) => {
      if (item.id !== applicationId || item.status !== 'PENDING') return item;
      result = {
        ...item,
        status: decision,
        reviewReason: decision === 'REJECTED' ? normalizedReason : undefined,
        reviewedBy: reviewerName.trim(),
        reviewedAt: now,
        updatedAt: now,
      };
      return result;
    });
    if (!result) return null;
    return this.persist(applications) ? result : null;
  }

  private persist(applications: readonly PartnerApplication[]): boolean {
    this.applicationsState.set(applications);
    return true;
  }

  private upsert(application: PartnerApplication): void {
    this.applicationsState.set([
      application,
      ...this.applicationsState().filter((item) => item.id !== application.id),
    ]);
  }

  private read(): readonly PartnerApplication[] {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]');
      return Array.isArray(value) ? value.filter(this.isApplication) : [];
    } catch {
      return [];
    }
  }

  private isApplication(value: unknown): value is PartnerApplication {
    if (!value || typeof value !== 'object') return false;
    const item = value as Partial<PartnerApplication>;
    return (
      typeof item.id === 'string' &&
      typeof item.applicantId === 'string' &&
      typeof item.organizationName === 'string' &&
      Array.isArray(item.documentNames) &&
      ['PENDING', 'APPROVED', 'REJECTED'].includes(item.status ?? '')
    );
  }
}
