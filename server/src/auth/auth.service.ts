import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import { hashPassword, encryptPhone } from '../lib/crypto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const {
      name,
      loginId,
      password,
      phone,
      jerseyNumber,
      primaryPosition,
      battingHand,
      throwingHand,
      inviteCode,
    } = dto;

    // 1. 초대 코드로 클럽 조회
    const club = await this.prisma.club.findUnique({
      where: { inviteCode },
    });

    if (!club) {
      throw new BadRequestException('유효하지 않은 초대 코드입니다.');
    }

    // 2. 중복 학번 확인
    const existingUser = await this.prisma.user.findUnique({
      where: { loginId },
    });

    if (existingUser) {
      throw new BadRequestException('이미 가입 신청 또는 가입이 완료된 학번입니다.');
    }

    // 3. 비밀번호 해싱 및 전화번호 암호화
    const passwordHash = await hashPassword(password);
    const encryptedPhone = encryptPhone(phone);

    // 4. 가입 신청 처리 트랜잭션
    const result = await this.prisma.$transaction(async (tx) => {
      // 대기중인 부원 생성
      const user = await tx.user.create({
        data: {
          clubId: club.id,
          loginId,
          passwordHash,
          name,
          phone: encryptedPhone,
          role: 'MEMBER',
          status: 'PENDING',
          jerseyNumber: jerseyNumber ? parseInt(jerseyNumber) : null,
          primaryPosition,
          battingHand,
          throwingHand,
        },
      });

      // 가입 신청서 기록 생성
      await tx.invitation.create({
        data: {
          clubId: club.id,
          applicantName: name,
          applicantLoginId: loginId,
          status: 'PENDING',
        },
      });

      // 교사(ADMIN)들에게 알림 생성
      const admins = await tx.user.findMany({
        where: {
          clubId: club.id,
          role: 'ADMIN',
        },
      });

      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            type: 'JOIN_REQUEST',
            title: '신규 가입 신청',
            body: `${name}(학번: ${loginId}) 부원의 가입 신청이 접수되었습니다.`,
            linkUrl: '/mypage',
            isRead: false,
          },
        });
      }

      return user;
    });

    return {
      message: '가입 신청이 성공적으로 접수되었습니다. 교사의 승인 후 로그인이 가능합니다.',
      userId: result.id,
    };
  }
}
