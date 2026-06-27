import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../auth/jwt-auth.guard';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // 1. 유저 본인의 알림 목록 조회 (최근 50개)
  async getNotifications(user: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // 2. 알림 단건 읽음 처리
  async readNotification(user: AuthenticatedUser, id: string) {
    const noti = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!noti || noti.userId !== user.id) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return { message: '알림을 읽음 처리했습니다.' };
  }

  // 3. 알림 일괄 읽음 처리
  async readAllNotifications(user: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return { message: '모든 알림을 읽음 처리했습니다.' };
  }
}
