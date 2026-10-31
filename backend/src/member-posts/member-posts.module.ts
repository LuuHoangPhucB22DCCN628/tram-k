import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { MemberPostsController } from "./member-posts.controller";
import { MemberPostsService } from "./member-posts.service";

@Module({
  imports: [NotificationsModule],
  controllers: [MemberPostsController],
  providers: [MemberPostsService],
  exports: [MemberPostsService],
})
export class MemberPostsModule {}
