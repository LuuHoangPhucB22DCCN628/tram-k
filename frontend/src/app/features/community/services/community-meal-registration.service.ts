import { Injectable, signal } from '@angular/core';

export interface MealRegistration {
  readonly locationId: string;
  readonly userId: string;
  readonly registeredAt: string;
  readonly status: 'PENDING_CONFIRMATION';
}

@Injectable({ providedIn: 'root' })
export class CommunityMealRegistrationService {
  private readonly storageKey = 'tram-k.community-meal-registrations';
  private readonly registrations = signal<readonly MealRegistration[]>(this.read());

  registrationsFor(userId: string): readonly MealRegistration[] {
    return this.registrations()
      .filter((registration) => registration.userId === userId)
      .sort((left, right) => right.registeredAt.localeCompare(left.registeredAt));
  }

  isRegistered(locationId: string, userId: string): boolean {
    return this.registrations().some(
      (registration) => registration.locationId === locationId && registration.userId === userId,
    );
  }

  register(locationId: string, userId: string): boolean {
    if (this.isRegistered(locationId, userId)) return false;

    const registrations = [
      ...this.registrations(),
      {
        locationId,
        userId,
        registeredAt: new Date().toISOString(),
        status: 'PENDING_CONFIRMATION' as const,
      },
    ];
    this.persist(registrations);
    return true;
  }

  unregister(locationId: string, userId: string): boolean {
    if (!this.isRegistered(locationId, userId)) return false;
    this.persist(
      this.registrations().filter(
        (registration) => registration.locationId !== locationId || registration.userId !== userId,
      ),
    );
    return true;
  }

  private persist(registrations: readonly MealRegistration[]): void {
    this.registrations.set(registrations);
    localStorage.setItem(this.storageKey, JSON.stringify(registrations));
  }

  private read(): readonly MealRegistration[] {
    try {
      const value = localStorage.getItem(this.storageKey);
      if (!value) return [];

      const registrations: unknown = JSON.parse(value);
      if (!Array.isArray(registrations)) return [];
      return registrations.filter(this.isStoredRegistration).map((registration) => ({
        ...registration,
        status: 'PENDING_CONFIRMATION',
      }));
    } catch {
      return [];
    }
  }

  private readonly isStoredRegistration = (
    value: unknown,
  ): value is Omit<MealRegistration, 'status'> & Partial<Pick<MealRegistration, 'status'>> => {
    if (!value || typeof value !== 'object') return false;
    const registration = value as Partial<MealRegistration>;
    return (
      typeof registration.locationId === 'string' &&
      typeof registration.userId === 'string' &&
      typeof registration.registeredAt === 'string'
    );
  };
}
