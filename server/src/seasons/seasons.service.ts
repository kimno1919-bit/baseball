import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { AuthenticatedUser } from '../auth/jwt-auth.guard';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SeasonsService {
  constructor(private prisma: PrismaService) {}

  // 1. 시즌 목록 조회
  async getSeasons(user: AuthenticatedUser) {
    return this.prisma.season.findMany({
      where: { clubId: user.clubId },
      orderBy: { startDate: 'desc' },
    });
  }

  // 2. 새 시즌 개막 생성
  async createSeason(user: AuthenticatedUser, dto: CreateSeasonDto) {
    const { name, startDate, endDate, inningsPerGame, mercyRuleDiff, isActive } = dto;

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);

    if (sDate >= eDate) {
      throw new BadRequestException('시작일은 종료일보다 이전이어야 합니다.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 신규 시즌을 활성화하려면 기존 시즌들 일괄 비활성화
      if (isActive) {
        await tx.season.updateMany({
          where: { clubId: user.clubId, isActive: true },
          data: { isActive: false },
        });
      }

      return tx.season.create({
        data: {
          clubId: user.clubId,
          name,
          startDate: sDate,
          endDate: eDate,
          inningsPerGame,
          mercyRuleDiff,
          isActive: !!isActive,
        },
      });
    });

    return {
      message: '새 시즌이 성공적으로 등록되었습니다.',
      season: result,
    };
  }

  // 3. 시즌 수동 마감 및 백업 스냅샷 + 데이터 폐기
  async closeSeason(user: AuthenticatedUser, seasonId: string) {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season || season.clubId !== user.clubId) {
      throw new NotFoundException('해당 시즌을 찾을 수 없습니다.');
    }

    if (!season.isActive) {
      throw new BadRequestException('이미 마감된 시즌입니다.');
    }

    // 3-1. 스냅샷 데이터 취합
    const games = await this.prisma.game.findMany({
      where: { seasonId },
      include: {
        attendances: true,
        lineups: true,
        battingRecords: {
          include: { user: { select: { id: true, name: true, loginId: true, role: true } } },
        },
        pitchingRecords: {
          include: { user: { select: { id: true, name: true, loginId: true, role: true } } },
        },
      },
    });

    const activeUsers = await this.prisma.user.findMany({
      where: { clubId: user.clubId, status: 'ACTIVE' },
      select: { id: true, name: true, loginId: true, jerseyNumber: true },
    });

    const inactiveUsers = await this.prisma.user.findMany({
      where: { clubId: user.clubId, status: 'INACTIVE' },
      select: { id: true, name: true, loginId: true, jerseyNumber: true },
    });

    const snapshotData = {
      season: {
        id: season.id,
        name: season.name,
        startDate: season.startDate,
        endDate: season.endDate,
        inningsPerGame: season.inningsPerGame,
      },
      closedAt: new Date().toISOString(),
      closedBy: { id: user.id, name: user.name },
      members: {
        active: activeUsers,
        inactive: inactiveUsers,
      },
      games,
    };

    // 3-2. 로컬 디렉토리에 스냅샷 백업
    const snapshotDir = path.join(process.cwd(), 'prisma', 'snapshots');
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }
    const snapshotPath = path.join(snapshotDir, `season-${seasonId}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf8');

    // 3-3. 시즌 비활성화 및 비활성 부원 성적 데이터 영구 삭제 트랜잭션
    await this.prisma.$transaction(async (tx) => {
      // 시즌 비활성화
      await tx.season.update({
        where: { id: seasonId },
        data: { isActive: false },
      });

      // 비활성 부원 ID 추출
      const inactiveUserIds = (
        await tx.user.findMany({
          where: { clubId: user.clubId, status: 'INACTIVE' },
          select: { id: true },
        })
      ).map((u) => u.id);

      if (inactiveUserIds.length > 0) {
        // 비활성 부원들의 이번 시즌 데이터만 소거
        await tx.battingRecord.deleteMany({
          where: { userId: { in: inactiveUserIds }, game: { seasonId } },
        });

        await tx.pitchingRecord.deleteMany({
          where: { userId: { in: inactiveUserIds }, game: { seasonId } },
        });

        await tx.lineup.deleteMany({
          where: { userId: { in: inactiveUserIds }, game: { seasonId } },
        });

        await tx.attendance.deleteMany({
          where: { userId: { in: inactiveUserIds }, game: { seasonId } },
        });
      }
    });

    return {
      message: '시즌이 정상 마감되었습니다. 비활성 부원 기록이 폐기되었고 스냅샷이 저장되었습니다.',
      snapshotPath: `/prisma/snapshots/season-${seasonId}.json`,
    };
  }
}
