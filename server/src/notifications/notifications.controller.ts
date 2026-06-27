import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard, AuthenticatedUser } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getNotifications(user);
  }

  @Patch(':id/read')
  async readNotification(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.readNotification(user, id);
  }

  @Patch('read-all')
  async readAllNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.readAllNotifications(user);
  }
}
// Note: JwtAuthGuard를 이용해 본인의 알림 제어
