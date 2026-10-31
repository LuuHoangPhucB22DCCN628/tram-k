import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AdminUsersModule } from "./admin-users/admin-users.module";
import { AiAssistantModule } from "./ai-assistant/ai-assistant.module";
import { AuthModule } from "./auth/auth.module";
import { CommunityEngagementModule } from "./community-engagement/community-engagement.module";
import { DonationsModule } from "./donations/donations.module";
import { validateEnvironment } from "./config/env.validation";
import { HairRegistrationsModule } from "./hair-registrations/hair-registrations.module";
import { HealthModule } from "./health/health.module";
import { ManagedResourcesModule } from "./managed-resources/managed-resources.module";
import { MediaModule } from "./media/media.module";
import { MemberPostsModule } from "./member-posts/member-posts.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { PartnerApplicationsModule } from "./partner-applications/partner-applications.module";
import { SearchModule } from "./search/search.module";
import { SupportProgramRegistrationsModule } from "./support-program-registrations/support-program-registrations.module";

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
    MemberPostsModule,
    PartnerApplicationsModule,
    CommunityEngagementModule,
    DonationsModule,
    ProfilesModule,
    NotificationsModule,
    SearchModule,
    SupportProgramRegistrationsModule,
  ],
})
export class AppModule {}
