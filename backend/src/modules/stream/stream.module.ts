import { Module } from '@nestjs/common';
import { NotificationStreamController } from './notification-stream.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

/** v33: live in-app notifications only (in-app calling was removed). */
@Module({
  imports: [NotificationsModule, AuthModule],
  controllers: [NotificationStreamController],
})
export class StreamModule {}
