import { inject, Injectable } from '@angular/core';

import type { HairRegistrationRequest } from '../models/hair-registration.models';
import { HairRegistrationApiService } from './hair-registration-api.service';

@Injectable({ providedIn: 'root' })
export class HairRegistrationService {
  private readonly api = inject(HairRegistrationApiService);

  submit(request: HairRegistrationRequest) {
    return this.api.submit(request);
  }
}
