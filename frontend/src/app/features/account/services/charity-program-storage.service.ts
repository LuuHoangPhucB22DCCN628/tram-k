import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ManagedResourceAdminApiService } from '@core/data/managed-resource-admin-api.service';
import { ManagedResourcePublicApiService } from '@core/data/managed-resource-public-api.service';
import { ManagedResourceSyncService } from '@core/data/managed-resource-sync.service';

import type {
  CharityProgramProposal,
  CharityProgramStatus,
  CharityEligibleAudience,
  CreateCharityProgramInput,
} from '../models/charity-program.models';
import { charityProgramAddressIsUsable } from '../models/charity-program.models';
import { programHasUpcomingOccurrence, programScheduleHasUpcomingOccurrence, validProgramSchedule,
  type StructuredProgramSchedule } from '../models/charity-program-schedule';
import {
  donationRegionIdFromName,
  DONATION_MAP_REGIONS,
} from '@features/community/data/donation-map-regions.data';

@Injectable({ providedIn: 'root' })
export class CharityProgramStorageService {
  private readonly storageKey = 'tram-k.charity-program-proposals';
  private readonly resourceSync = inject(ManagedResourceSyncService);
  private readonly adminApi = inject(ManagedResourceAdminApiService);
  private readonly publicApi = inject(ManagedResourcePublicApiService);
  private legacyPresent = localStorage.getItem(this.storageKey) !== null;
  private readonly proposalsState = signal<readonly CharityProgramProposal[]>(this.read());
  private readonly initializedModes = new Set<'public' | 'mine' | 'admin'>();

  readonly proposals = this.proposalsState.asReadonly();

  all(): readonly CharityProgramProposal[] {
    return [...this.proposalsState()].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  initializePublic(): void {
    if (this.initializedModes.has('public')) return;
    this.initializedModes.add('public');
    this.publicApi
      .state('SUPPORT_PROGRAM', (value): value is CharityProgramProposal => this.isProposal(value))
      .subscribe((state) => {
        if (!state || !state.initialized) return;
        const privateItems = this.proposalsState().filter((item) => item.status !== 'PUBLISHED');
        this.replaceMerged([...privateItems, ...state.items]);
      });
  }

  initializeMine(ownerId: string): void {
    if (!ownerId || this.initializedModes.has('mine')) return;
    this.initializedModes.add('mine');
    this.adminApi.mine('SUPPORT_PROGRAM').subscribe((state) => {
      if (!state) return;
      const remote = state.items
        .map((item) => item.payload)
        .filter((value) => this.isProposal(value));
      void this.hydrateAndMigrate(remote, ownerId, false);
    });
  }

  initializeAdmin(): void {
    if (this.initializedModes.has('admin')) return;
    this.initializedModes.add('admin');
    this.adminApi.state('SUPPORT_PROGRAM').subscribe((state) => {
      if (!state) return;
      const remote = state.items
        .map((item) => item.payload)
        .filter((value) => this.isProposal(value));
      void this.hydrateAndMigrate(remote, null, true);
    });
  }

  syncAll(): void {
    for (const proposal of this.proposalsState()) this.syncProposal(proposal);
  }

  proposalsFor(ownerId: string): readonly CharityProgramProposal[] {
    return this.proposalsState()
      .filter((proposal) => proposal.ownerId === ownerId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  proposalFor(ownerId: string, proposalId: string): CharityProgramProposal | null {
    return (
      this.proposalsState().find(
        (proposal) => proposal.ownerId === ownerId && proposal.id === proposalId,
      ) ?? null
    );
  }

  create(
    ownerId: string,
    ownerName: string,
    input: CreateCharityProgramInput,
  ): CharityProgramProposal {
    const now = new Date().toISOString();
    const proposal: CharityProgramProposal = {
      ...input,
      id: `PROGRAM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ownerId,
      ownerName: ownerName.trim(),
      title: input.title.trim(),
      description: input.description.trim(),
      eligibilityNote: input.eligibilityNote?.trim() ?? '',
      city: input.city.trim(),
      address: input.address.trim(),
      schedule: input.schedule.trim(),
      contactName: input.contactName.trim(),
      phone: input.phone.trim(),
      email: input.email.trim().toLowerCase(),
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };
    this.persist([proposal, ...this.proposalsState()]);
    this.syncProposal(proposal);
    return proposal;
  }

  resubmitRejected(
    ownerId: string,
    proposalId: string,
    input: CreateCharityProgramInput,
  ): CharityProgramProposal | null {
    let updatedProposal: CharityProgramProposal | null = null;
    const proposals = this.proposalsState().map((proposal) => {
      if (
        proposal.ownerId !== ownerId ||
        proposal.id !== proposalId ||
        proposal.status !== 'REJECTED'
      ) {
        return proposal;
      }

      updatedProposal = {
        ...proposal,
        ...input,
        title: input.title.trim(),
        description: input.description.trim(),
        eligibilityNote: input.eligibilityNote?.trim() ?? '',
        city: input.city.trim(),
        address: input.address.trim(),
        schedule: input.schedule.trim(),
        contactName: input.contactName.trim(),
        phone: input.phone.trim(),
        email: input.email.trim().toLowerCase(),
        status: 'PENDING',
        reviewReason: undefined,
        reviewedAt: undefined,
        updatedAt: new Date().toISOString(),
      };
      return updatedProposal;
    });

    if (updatedProposal) {
      this.persist(proposals);
      this.syncProposal(updatedProposal);
    }
    return updatedProposal;
  }

  async review(
    proposalId: string,
    decision: Extract<CharityProgramStatus, 'PUBLISHED' | 'REJECTED'>,
    reason = '',
    eligibility?: {
      readonly eligibleAudience: CharityEligibleAudience;
      readonly financialNeedRequired: boolean;
      readonly eligibilityNote: string;
    },
  ): Promise<CharityProgramProposal | null> {
    const normalizedReason = reason.trim();
    if (decision === 'REJECTED' && normalizedReason.length < 10) return null;

    let reviewedProposal: CharityProgramProposal | null = null;
    const now = new Date().toISOString();
    const proposals = this.proposalsState().map((proposal) => {
      if (proposal.id !== proposalId || proposal.status !== 'PENDING') return proposal;
      reviewedProposal = {
        ...proposal,
        ...(decision === 'PUBLISHED' && eligibility
          ? { ...eligibility, eligibilityNote: eligibility.eligibilityNote.trim().slice(0, 500) }
          : {}),
        status: decision,
        reviewReason: decision === 'REJECTED' ? normalizedReason : undefined,
        reviewedAt: now,
        updatedAt: now,
      };
      return reviewedProposal;
    });
    const notificationProposal = proposals.find(
      (proposal) => proposal.id === proposalId && proposal.status === decision,
    );
    if (reviewedProposal && notificationProposal) {
      try {
        if (!(await firstValueFrom(this.syncProposalResult(notificationProposal)))) return null;
      } catch {
        return null;
      }
      this.persist(proposals);
    }
    return reviewedProposal;
  }

  async updatePublishedDetails(
    proposalId: string,
    changes: {
      readonly address: string;
      readonly schedule: string;
      readonly structuredSchedule?: StructuredProgramSchedule;
      readonly eligibleAudience?: CharityEligibleAudience;
      readonly financialNeedRequired: boolean;
      readonly eligibilityNote: string;
    },
  ): Promise<CharityProgramProposal | null> {
    const proposal = this.proposalsState().find((item) => item.id === proposalId);
    const address = changes.address.trim().replace(/\s+/g, ' ');
    const schedule = changes.schedule.trim();
    if (!proposal || proposal.status !== 'PUBLISHED' || !charityProgramAddressIsUsable(address) ||
      schedule.length < 5 || schedule.length > 200 ||
      ((schedule !== proposal.schedule || !programHasUpcomingOccurrence(proposal)) &&
        !changes.structuredSchedule) ||
      (changes.structuredSchedule && (!validProgramSchedule(changes.structuredSchedule) ||
        !programScheduleHasUpcomingOccurrence(changes.structuredSchedule)))) return null;

    const updated: CharityProgramProposal = {
      ...proposal,
      address,
      googlePlaceId: address === proposal.address ? proposal.googlePlaceId : undefined,
      schedule,
      ...(changes.structuredSchedule ?? {}),
      eligibleAudience: changes.eligibleAudience,
      financialNeedRequired: changes.financialNeedRequired,
      eligibilityNote: changes.eligibilityNote.trim().slice(0, 500),
      updatedAt: new Date().toISOString(),
    };
    if (!(await firstValueFrom(this.syncProposalResult(updated)))) return null;
    this.persist(this.proposalsState().map((item) => item.id === proposalId ? updated : item));
    return updated;
  }

  cancelPending(ownerId: string, proposalId: string): boolean {
    const proposals = this.proposalsState();
    const canCancel = proposals.some(
      (proposal) =>
        proposal.ownerId === ownerId && proposal.id === proposalId && proposal.status === 'PENDING',
    );
    if (!canCancel) return false;

    this.persist(
      proposals.filter((proposal) => proposal.id !== proposalId || proposal.ownerId !== ownerId),
    );
    this.resourceSync.remove('SUPPORT_PROGRAM', proposalId);
    return true;
  }

  async deleteByAdmin(proposalId: string): Promise<number | null> {
    const proposal = this.proposalsState().find((item) => item.id === proposalId);
    if (!proposal) return null;
    const deletedRegistrations = await firstValueFrom(this.resourceSync.removeResult('SUPPORT_PROGRAM', proposalId));
    if (deletedRegistrations === null) return null;
    this.persist(this.proposalsState().filter((item) => item.id !== proposalId));
    this.removeLegacyProposal(proposalId);
    return deletedRegistrations;
  }

  private removeLegacyProposal(proposalId: string): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const value: unknown = JSON.parse(raw);
      if (!Array.isArray(value)) return;
      localStorage.setItem(this.storageKey, JSON.stringify(value.filter((item) =>
        !item || typeof item !== 'object' || (item as Record<string, unknown>)['id'] !== proposalId)));
    } catch {
      // The remote deletion succeeded; invalid old browser cache must not restore the item.
      localStorage.removeItem(this.storageKey);
    }
  }

  private syncProposal(proposal: CharityProgramProposal): void {
    this.syncProposalResult(proposal).subscribe();
  }

  private syncProposalResult(proposal: CharityProgramProposal) {
    return this.resourceSync.upsertResult({
      sourceId: proposal.id,
      type: 'SUPPORT_PROGRAM',
      status: proposal.status,
      title: proposal.title,
      description: proposal.description,
      eyebrow: 'Chương trình hỗ trợ',
      metadata: `${proposal.city} · ${proposal.capacity} suất`,
      link: `/cong-dong/chuong-trinh-ho-tro?program=${encodeURIComponent(proposal.id)}`,
      publishedAt: proposal.reviewedAt ?? proposal.updatedAt,
      payload: proposal as unknown as Readonly<Record<string, unknown>>,
    });
  }

  private persist(proposals: readonly CharityProgramProposal[]): void {
    this.proposalsState.set(proposals);
  }

  private async hydrateAndMigrate(
    remote: readonly CharityProgramProposal[],
    ownerId: string | null,
    canClearAll: boolean,
  ): Promise<void> {
    const current = this.proposalsState();
    // Published server data is authoritative: an old browser cache must never recreate a deleted program.
    const legacy = current.filter((item) =>
      (!ownerId || item.ownerId === ownerId) && item.status !== 'PUBLISHED');
    const remoteIds = new Set(remote.map((item) => item.id));
    try {
      for (const proposal of legacy) {
        if (remoteIds.has(proposal.id)) continue;
        if (!(await firstValueFrom(this.syncProposalResult(proposal)))) throw new Error('sync');
      }
      this.replaceMerged([...remote, ...legacy]);
      if (this.legacyPresent && (canClearAll || legacy.length === current.length)) {
        localStorage.removeItem(this.storageKey);
        this.legacyPresent = false;
      }
    } catch {
      this.replaceMerged([...remote, ...legacy]);
    }
  }

  private replaceMerged(items: readonly CharityProgramProposal[]): void {
    this.proposalsState.set([...new Map(items.map((item) => [item.id, item])).values()]);
  }

  private read(): readonly CharityProgramProposal[] {
    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) return [];
      const value: unknown = JSON.parse(rawValue);
      if (!Array.isArray(value)) return [];
      return value
        .map((entry: unknown) => {
          if (!entry || typeof entry !== 'object') return entry;
          const proposal = entry as Record<string, unknown>;
          const status = proposal['status'];
          const city = typeof proposal['city'] === 'string' ? proposal['city'] : '';
          return {
            ...proposal,
            regionId:
              typeof proposal['regionId'] === 'string'
                ? proposal['regionId']
                : (donationRegionIdFromName(city) ?? 'ha-noi'),
            status:
              status === 'PENDING_REVIEW'
                ? 'PENDING'
                : status === 'APPROVED'
                  ? 'PUBLISHED'
                  : status,
          };
        })
        .filter(this.isProposal);
    } catch {
      return [];
    }
  }

  private isProposal(value: unknown): value is CharityProgramProposal {
    if (!value || typeof value !== 'object') return false;
    const proposal = value as Partial<CharityProgramProposal>;
    return (
      typeof proposal.id === 'string' &&
      typeof proposal.ownerId === 'string' &&
      typeof proposal.ownerName === 'string' &&
      typeof proposal.title === 'string' &&
      ['MEAL', 'FINANCIAL', 'TRANSPORT', 'OTHER'].includes(proposal.supportType ?? '') &&
      typeof proposal.description === 'string' &&
      typeof proposal.regionId === 'string' &&
      DONATION_MAP_REGIONS.some((region) => region.id === proposal.regionId) &&
      typeof proposal.city === 'string' &&
      typeof proposal.address === 'string' &&
      typeof proposal.schedule === 'string' &&
      typeof proposal.capacity === 'number' &&
      typeof proposal.contactName === 'string' &&
      typeof proposal.phone === 'string' &&
      typeof proposal.email === 'string' &&
      ['PENDING', 'PUBLISHED', 'REJECTED'].includes(proposal.status ?? '') &&
      typeof proposal.createdAt === 'string' &&
      typeof proposal.updatedAt === 'string'
    );
  }
}
