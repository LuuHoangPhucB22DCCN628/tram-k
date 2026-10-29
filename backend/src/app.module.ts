import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AdminUsersModule } from "./admin-users/admin-users.module";
import { AiAssistantModule } from "./ai-assistant/ai-assistant.module";
import { AuthModule } from "./auth/auth.module";
import { CommunityEngagementModule } from "./community-engagement/community-engagement.module";
import { validateEnvironment } from "./config/env.validation";
import { HairRegistrationsModule } from "./hair-registrations/hair-registrations.module";
import { HealthModule } from "./health/health.module";
import { ManagedResourcesModule } from "./managed-resources/managed-resources.module";
import { MediaModule } from "./media/media.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { PartnerApplicationsModule } from "./partner-applications/partner-applications.module";
import { SearchModule } from "./search/search.module";
import { SupportProgramRegistrationsModule } from "./support-program-registrations/support-program-registrations.module";
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxWorker } from "./outbox/outbox.worker";
import { PostsModule } from "./posts/posts.module";
import { ReportsModule } from "./reports/reports.module";
import { ProgramsModule } from "./programs/programs.module";
import { SupportPointsModule } from "./support-points/support-points.module";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { ExportsModule } from "./exports/exports.module";
import { ContentsModule } from "./contents/contents.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { IdempotencyService } from "./common/idempotency.service";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { IdempotencyInterceptor } from "./common/idempotency.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    AiAssistantModule,
    AdminUsersModule,
    AuthModule,
    HealthModule,
    HairRegistrationsModule,
    ManagedResourcesModule,
    MediaModule,
    PartnerApplicationsModule,
    CommunityEngagementModule,
    ProfilesModule,
    NotificationsModule,
    SearchModule,
    SupportProgramRegistrationsModule,
    ScheduleModule.forRoot(),
    PostsModule,
    ReportsModule,
    ProgramsModule,
    SupportPointsModule,
    AuditLogsModule,
    ExportsModule,
    ContentsModule,
    DashboardModule,
  ],
  providers: [
    OutboxWorker,
    IdempotencyService,
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule { }
