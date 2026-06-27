import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { InvitationActionDto } from './dto/invitation-action.dto';
import { comparePassword, hashPassword, encryptPhone, decryptPhone, maskPhone } from '../lib/crypto';
import { AuthenticatedUser } from '../auth/jwt-auth.guard';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 1. 프로필 수정
  async updateProfile(user: AuthenticatedUser, dto: UpdateProfileDto) {
    const { jerseyNumber, primaryPosition, battingHand, throwingHand, phone, currentPassword, newPassword } = dto;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const updateData: any = {};
    if (jerseyNumber !== undefined) updateData.jerseyNumber = jerseyNumber;
    if (primaryPosition !== undefined) updateData.primaryPosition = primaryPosition;
    if (battingHand !== undefined) updateData.battingHand = battingHand;
    if (throwingHand !== undefined) updateData.throwingHand = throwingHand;
    if (phone) updateData.phone = encryptPhone(phone);

    if (newPassword) {
      if (!currentPassword) {
        throw new BadRequestException('비밀번호 변경을 위해 현재 비밀번호를 입력해주세요.');
      }
      const isMatch = await comparePassword(currentPassword, dbUser.passwordHash);
      if (!isMatch) {
        throw new BadRequestException('현재 비밀번호가 일치하지 않습니다.');
      }
      updateData.passwordHash = await hashPassword(newPassword);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return { message: '프로필 정보가 성공적으로 변경되었습니다.' };
  }

  // 2. [어드민] 전체 멤버 목록 조회 (교사 전용)
  async getMembers(user: AuthenticatedUser) {
    const members = await this.prisma.user.findMany({
      where: { clubId: user.clubId },
      orderBy: [
        { role: 'asc' }, // ADMIN -> MANAGER -> MEMBER 순서 정렬 유도
        { name: 'asc' },
      ],
    });

    return members.map((m) => {
      const decrypted = decryptPhone(m.phone);
      const masked = maskPhone(decrypted);
      return {
        id: m.id,
        loginId: m.loginId,
        name: m.name,
        phone: masked,
        role: m.role,
        status: m.status,
        jerseyNumber: m.jerseyNumber,
        primaryPosition: m.primaryPosition,
        battingHand: m.battingHand,
        throwingHand: m.throwingHand,
        joinedAt: m.joinedAt,
      };
    });
  }

  // 3. [어드민] 멤버 정보 수정
  async updateMember(user: AuthenticatedUser, dto: UpdateMemberDto) {
    const { targetUserId, role, status } = dto;

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser || targetUser.clubId !== user.clubId) {
      throw new NotFoundException('대상 부원을 찾을 수 없습니다.');
    }

    if (targetUser.id === user.id && role && role !== 'ADMIN') {
      throw new BadRequestException('자신의 관리자 역할을 해제할 수 없습니다.');
    }

    const updateData: any = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: updateData,
      });

      if (role && role !== targetUser.role) {
        await tx.notification.create({
          data: {
            userId: targetUserId,
            type: 'ROLE_CHANGED',
            title: '권한 변경 알림',
            body: `회원님의 역할이 ${targetUser.role}에서 ${role}(으)로 변경되었습니다.`,
            linkUrl: '/dashboard',
            isRead: false,
          },
        });
      }

      return updated;
    });

    return {
      message: '멤버 정보가 정상적으로 수정되었습니다.',
      user: { id: result.id, name: result.name, role: result.role, status: result.status },
    };
  }

  // 4. [어드민] 가입 신청 목록 조회
  async getInvitations(user: AuthenticatedUser) {
    return this.prisma.invitation.findMany({
      where: { clubId: user.clubId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 5. [어드민] 가입 신청 승인/거절 액션
  async handleInvitation(user: AuthenticatedUser, dto: InvitationActionDto) {
    const { invitationId, action } = dto;

    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.clubId !== user.clubId) {
      throw new NotFoundException('해당 가입 신청을 찾을 수 없습니다.');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('이미 처리가 완료된 가입 신청입니다.');
    }

    const applicant = await this.prisma.user.findUnique({
      where: { loginId: invitation.applicantLoginId },
    });

    if (!applicant) {
      throw new NotFoundException('신청자의 회원 정보를 찾을 수 없습니다.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (action === 'APPROVE') {
        await tx.invitation.update({
          where: { id: invitationId },
          data: { status: 'APPROVED', reviewedBy: user.id },
        });

        await tx.user.update({
          where: { id: applicant.id },
          data: { status: 'ACTIVE' },
        });

        await tx.notification.create({
          data: {
            userId: applicant.id,
            type: 'JOIN_APPROVED',
            title: '가입 승인 완료',
            body: '축하합니다! 클럽 가입 신청이 교사에 의해 승인되었습니다. 이제 서비스를 정상 이용하실 수 있습니다.',
            linkUrl: '/dashboard',
            isRead: false,
          },
        });

        return { message: '가입 신청을 승인하였습니다.' };
      } else {
        // REJECT
        await tx.invitation.update({
          where: { id: invitationId },
          data: { status: 'REJECTED', reviewedBy: user.id },
        });

        await tx.user.update({
          where: { id: applicant.id },
          data: { status: 'INACTIVE' },
        });

        await tx.notification.create({
          data: {
            userId: applicant.id,
            type: 'JOIN_REJECTED',
            title: '가입 승인 거절',
            body: '안타깝게도 클럽 가입 신청이 거절되었습니다. 사유는 교사에게 문의하세요.',
            isRead: false,
          },
        });

        return { message: '가입 신청을 거절하였습니다.' };
      }
    });

    return result;
  }
}
