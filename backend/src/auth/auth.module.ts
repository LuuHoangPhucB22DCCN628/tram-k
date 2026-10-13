import { Global, Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { AuthOutboxCryptoService } from "./auth-outbox-crypto.service";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthOutboxWorker } from "./jobs/auth-outbox.worker";
import { UnverifiedAccountCleanupService } from "./jobs/unverified-account-cleanup.service";
import { VerificationEmailDeliveryService } from "./jobs/verification-email-delivery.service";

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthOutboxCryptoService,
    AuthService,
    JwtAuthGuard,
    VerificationEmailDeliveryService,
    AuthOutboxWorker,
    UnverifiedAccountCleanupService,
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
