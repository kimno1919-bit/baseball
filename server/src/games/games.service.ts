import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { SubmitAttendanceDto } from './dto/submit-attendance.dto';
import { ActualAttendanceDto } from './dto/actual-attendance.dto';
import { RegisterLineupDto } from './dto/register-lineup.dto';
import { SaveRecordsDto } from './dto/save-records.dto';
import { AuthenticatedUser } from '../auth/jwt-auth.guard';
import { convertIpToValue } from '../lib/stats';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  // 1. 경기 일정 목록 조회 (본인 출결 조인)
  async getGames(user: AuthenticatedUser) {
    const games = await this.prisma.game.findMany({
      where: { season: { clubId: user.clubId } },
      include: {
        season: { select: { name: true } },
        attendances: {
          where: { userId: user.id },
          select: { response: true, absentReason: true, actualAttended: true },
        },
      },
      orderBy: { gameDate: 'asc' },
    });

    return games.map((g) => ({
      id: g.id,
      seasonName: g.season.name,
      gameDate: g.gameDate,
      location: g.location,
      opponentName: g.opponentName,
      gameType: g.gameType,
      attendanceDeadline: g.attendanceDeadline,
      status: g.status,
      ourScore: g.ourScore,
      opponentScore: g.opponentScore,
      result: g.result,
      myAttendance: g.attendances[0] || { response: 'UNDECIDED', absentReason: null, actualAttended: false },
    }));
  }

  // 2. 경기 상세 정보 조회 (출결, 라인업, 기록 등 일괄)
  async getGameDetail(user: AuthenticatedUser, id: string) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        season: true,
        attendances: {
          include: {
            user: { select: { id: true, name: true, jerseyNumber: true, primaryPosition: true } },
          },
        },
        lineups: {
          include: {
            user: { select: { id: true, name: true, jerseyNumber: true, primaryPosition: true } },
          },
          orderBy: { battingOrder: 'asc' },
        },
        battingRecords: {
          include: { user: { select: { id: true, name: true, jerseyNumber: true } } },
          orderBy: { user: { name: 'asc' } },
        },
        pitchingRecords: {
          include: { user: { select: { id: true, name: true, jerseyNumber: true } } },
          orderBy: { user: { name: 'asc' } },
        },
      },
    });

    if (!game || game.season.clubId !== user.clubId) {
      throw new NotFoundException('경기를 찾을 수 없습니다.');
    }

    return game;
  }

  // 3. 경기 일정 등록
  async createGame(user: AuthenticatedUser, dto: CreateGameDto) {
    const { seasonId, gameDate, location, opponentName, gameType, attendanceDeadline } = dto;

    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season || season.clubId !== user.clubId) {
      throw new BadRequestException('유효하지 않은 시즌입니다.');
    }

    const gDate = new Date(gameDate);
    const dDate = new Date(attendanceDeadline);

    if (dDate >= gDate) {
      throw new BadRequestException('출결 응답 마감일시는 경기 시작 이전이어야 합니다.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 경기 등록
      const game = await tx.game.create({
        data: {
          seasonId,
          gameDate: gDate,
          location,
          opponentName,
          gameType,
          attendanceDeadline: dDate,
          createdBy: user.id,
          status: 'SCHEDULED',
        },
      });

      // 클럽의 모든 활성 부원(ACTIVE)에 대한 사전출결 일괄 생성
      const activeMembers = await tx.user.findMany({
        where: { clubId: user.clubId, status: 'ACTIVE' },
        select: { id: true },
      });

      const attendanceData = activeMembers.map((member) => ({
        gameId: game.id,
        userId: member.id,
        response: 'UNDECIDED',
        actualAttended: false,
      }));

      await tx.attendance.createMany({
        data: attendanceData,
      });

      // 전원 알림 전송
      for (const m of activeMembers) {
        await tx.notification.create({
          data: {
            userId: m.id,
            type: 'GAME_CREATED',
            title: '새 경기 일정 등록',
            body: `${opponentName}팀과의 경기가 등록되었습니다. 사전 출결을 입력해주세요!`,
            linkUrl: '/games',
            isRead: false,
          },
        });
      }

      return game;
    });

    return {
      message: '경기가 성공적으로 등록되었습니다. 부원들에게 알림이 전송되었습니다.',
      game: result,
    };
  }

  // 4. 경기 수정
  async updateGame(user: AuthenticatedUser, id: string, dto: UpdateGameDto) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: { season: true },
    });

    if (!game || game.season.clubId !== user.clubId) {
      throw new NotFoundException('경기를 찾을 수 없습니다.');
    }

    // 경기 수정 권한 (교사/매니저)
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw new ForbiddenException('경기 관리 권한이 없습니다.');
    }

    const { gameDate, location, opponentName, gameType, attendanceDeadline } = dto;

    // 이미 최종 확정된 경기인 경우 일시, 장소 외 변경 불가
    if (game.status === 'CONFIRMED') {
      if (opponentName || gameType || attendanceDeadline) {
        throw new BadRequestException('최종 기록이 확정된 경기는 상대팀명, 유형, 마감기한을 수정할 수 없습니다.');
      }
    }

    const updateData: any = {};
    if (gameDate) updateData.gameDate = new Date(gameDate);
    if (location) updateData.location = location;
    if (opponentName) updateData.opponentName = opponentName;
    if (gameType) updateData.gameType = gameType;
    if (attendanceDeadline) updateData.attendanceDeadline = new Date(attendanceDeadline);

    if (updateData.gameDate && updateData.attendanceDeadline) {
      if (updateData.attendanceDeadline >= updateData.gameDate) {
        throw new BadRequestException('출결 응답 마감일시는 경기 시작 이전이어야 합니다.');
      }
    }

    await this.prisma.game.update({
      where: { id },
      data: updateData,
    });

    return { message: '경기 정보가 성공적으로 수정되었습니다.' };
  }

  // 5. 경기 삭제
  async deleteGame(user: AuthenticatedUser, id: string) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: { season: true },
    });

    if (!game || game.season.clubId !== user.clubId) {
      throw new NotFoundException('경기를 찾을 수 없습니다.');
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw new ForbiddenException('경기 삭제 권한이 없습니다.');
    }

    await this.prisma.game.delete({
      where: { id },
    });

    return { message: '경기가 성공적으로 삭제되었습니다.' };
  }

  // 6. 사전 출결 응답 제출
  async submitAttendance(user: AuthenticatedUser, gameId: string, dto: SubmitAttendanceDto) {
    const { response, absentReason } = dto;

    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!game) {
      throw new NotFoundException('경기를 찾을 수 없습니다.');
    }

    // 마감 기한 검증
    if (new Date() > new Date(game.attendanceDeadline)) {
      throw new BadRequestException('출결 제출 기한이 마감되었습니다.');
    }

    await this.prisma.attendance.upsert({
      where: { gameId_userId: { gameId, userId: user.id } },
      create: {
        gameId,
        userId: user.id,
        response,
        absentReason: response === 'ABSENT' ? absentReason : null,
      },
      update: {
        response,
        absentReason: response === 'ABSENT' ? absentReason : null,
      },
    });

    return { message: '출결 응답이 성공적으로 반영되었습니다.' };
  }

  // 7. 교사의 당일 실제 출석체크 저장
  async saveActualAttendance(user: AuthenticatedUser, gameId: string, dto: ActualAttendanceDto) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { season: true },
    });

    if (!game || game.season.clubId !== user.clubId) {
      throw new NotFoundException('경기를 찾을 수 없습니다.');
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw new ForbiddenException('출석 체크 권한이 없습니다.');
    }

    // 일괄 업데이트 트랜잭션
    await this.prisma.$transaction(
      dto.attendances.map((att) =>
        this.prisma.attendance.update({
          where: { gameId_userId: { gameId, userId: att.userId } },
          data: { actualAttended: att.actualAttended },
        }),
      ),
    );

    return { message: '당일 실제 출석 정보가 저장되었습니다.' };
  }

  // 8. 라인업 등록 및 검증
  async registerLineup(user: AuthenticatedUser, gameId: string, dto: RegisterLineupDto) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { season: true },
    });

    if (!game || game.season.clubId !== user.clubId) {
      throw new NotFoundException('경기를 찾을 수 없습니다.');
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw new ForbiddenException('라인업 등록 권한이 없습니다.');
    }

    const { lineups } = dto;

    // 야구 유효성 검증 규칙
    // 8-1. 선발 명단 필터
    const starters = lineups.filter((l) => l.isStarter);

    // 8-2. 선발 투수는 반드시 1명이어야 한다.
    const pitchers = starters.filter((l) => l.isStartingPitcher);
    if (pitchers.length !== 1) {
      throw new BadRequestException('선발투수는 반드시 딱 1명 지정해야 합니다.');
    }

    // 8-3. 선발 명단은 정확히 9명이어야 한다 (지명타자 룰 포함)
    if (starters.length !== 9) {
      throw new BadRequestException(`선발 명단은 정확히 9명이어야 합니다. (현재: ${starters.length}명)`);
    }

    // 8-4. 선발진의 수비 포지션(position)은 중복되어서는 안 된다.
    const positions = starters.map((l) => l.position);
    const uniquePositions = new Set(positions);
    if (uniquePositions.size !== 9) {
      throw new BadRequestException('선발 수비 포지션이 서로 중복되었습니다.');
    }

    // 8-5. 선발진의 타순(battingOrder)은 1~9번까지 모두 채워져야 한다.
    const orders = starters.map((l) => l.battingOrder);
    const validOrders = orders.filter((o): o is number => o !== null && o >= 1 && o <= 9);
    const uniqueOrders = new Set(validOrders);
    if (uniqueOrders.size !== 9) {
      throw new BadRequestException('타순(1~9번) 설정이 유효하지 않거나 중복되었습니다.');
    }

    // 8-6. 당일 출석 체크(actualAttended: true)가 된 부원만 라인업에 등재할 수 있다.
    const attendees = await this.prisma.attendance.findMany({
      where: { gameId, actualAttended: true },
      select: { userId: true },
    });
    const attendeeIds = new Set(attendees.map((a) => a.userId));

    for (const item of lineups) {
      if (!attendeeIds.has(item.userId)) {
        throw new BadRequestException('당일 미출석 부원은 라인업에 등재할 수 없습니다.');
      }
    }

    // 라인업 일괄 갱신 트랜잭션
    await this.prisma.$transaction(async (tx) => {
      // 기존 라인업 제거
      await tx.lineup.deleteMany({ where: { gameId } });

      // 새 라인업 생성
      await tx.lineup.createMany({
        data: lineups.map((l) => ({
          gameId,
          userId: l.userId,
          battingOrder: l.isStarter ? l.battingOrder : null,
          position: l.position,
          isStarter: l.isStarter,
          isStartingPitcher: l.isStarter && l.isStartingPitcher,
        })),
      });
    });

    return { message: '라인업이 유효성 검증을 거쳐 성공적으로 저장되었습니다.' };
  }

  // 9. 경기 기록 저장 및 최종 확정
  async saveRecords(user: AuthenticatedUser, gameId: string, dto: SaveRecordsDto) {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { season: true },
    });

    if (!game || game.season.clubId !== user.clubId) {
      throw new NotFoundException('경기를 찾을 수 없습니다.');
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw new ForbiddenException('기록 작성 권한이 없습니다.');
    }

    if (game.status === 'CONFIRMED') {
      throw new BadRequestException('이미 최종 확정된 경기 기록은 수정할 수 없습니다.');
    }

    const { action, score, battingRecords, pitchingRecords } = dto;

    // 9-1. 임시저장(SAVE) 또는 최종확정(CONFIRM) 연산
    const result = await this.prisma.$transaction(async (tx) => {
      // 이닝 점수 저장
      if (score) {
        // 합산 점수 연산
        let totalOur = 0;
        let totalOpp = 0;
        if (score.inningScores) {
          score.inningScores.forEach((s) => {
            totalOur += s.our;
            totalOpp += s.opp;
          });
        }

        await tx.game.update({
          where: { id: gameId },
          data: {
            inningScores: JSON.stringify(score.inningScores || []),
            ourScore: totalOur,
            opponentScore: totalOpp,
          },
        });
      }

      // 타격 성적 저장
      if (battingRecords) {
        // 유효성 체크: 안타 <= 타수 등 검증
        for (const r of battingRecords) {
          if (r.hits > r.atBats) {
            throw new BadRequestException('안타 수는 타수보다 많을 수 없습니다.');
          }
          if (r.doubles + r.triples + r.homeRuns > r.hits) {
            throw new BadRequestException('2루타, 3루타, 홈런의 합은 총 안타 수를 초과할 수 없습니다.');
          }
          if (r.atBats > r.plateAppearances) {
            throw new BadRequestException('타수는 총 타석을 초과할 수 없습니다.');
          }

          // Upsert
          await tx.battingRecord.upsert({
            where: { gameId_userId: { gameId, userId: r.userId } },
            create: { gameId, userId: r.userId, ...r },
            update: { ...r },
          });
        }
      }

      // 투구 성적 저장
      if (pitchingRecords) {
        // 유효성 체크
        for (const r of pitchingRecords) {
          // 이닝 소수점 유효성 (소수점 뒤가 0, 1, 2 중 하나여야 함)
          const integerPart = Math.floor(r.inningsPitched);
          const fractionPart = Math.round((r.inningsPitched - integerPart) * 10);
          if (fractionPart !== 0 && fractionPart !== 1 && fractionPart !== 2) {
            throw new BadRequestException('투구 이닝의 소수점은 .0(아웃 0), .1(아웃 1), .2(아웃 2)만 가능합니다.');
          }

          // Upsert
          await tx.pitchingRecord.upsert({
            where: { gameId_userId: { gameId, userId: r.userId } },
            create: { gameId, userId: r.userId, ...r },
            update: { ...r },
          });
        }
      }

      // 최종 확정(`CONFIRMED`) 처리 시 승패 판정 및 알림 발송
      if (action === 'CONFIRM') {
        const freshGame = await tx.game.findUnique({
          where: { id: gameId },
        });

        if (!freshGame) throw new NotFoundException('경기를 찾을 수 없습니다.');

        let gameResult = 'DRAW';
        if (freshGame.ourScore > freshGame.opponentScore) gameResult = 'WIN';
        if (freshGame.ourScore < freshGame.opponentScore) gameResult = 'LOSS';

        // 투수 승패 의무 체크
        // 승리 또는 패배 판정인데 승패 투수(WIN, LOSS) 지정이 누락되었는지 확인
        const pitchersList = await tx.pitchingRecord.findMany({ where: { gameId } });
        if (gameResult === 'WIN') {
          const hasWinPitcher = pitchersList.some((p) => p.decision === 'WIN');
          const hasLossPitcher = pitchersList.some((p) => p.decision === 'LOSS');
          if (pitchersList.length > 0 && (!hasWinPitcher || !hasLossPitcher)) {
            throw new BadRequestException('경기 결과가 승리일 시, 투구 기록에서 반드시 승리투수(WIN)와 패배투수(LOSS)를 매칭 지정해주어야 합니다.');
          }
        } else if (gameResult === 'LOSS') {
          const hasWinPitcher = pitchersList.some((p) => p.decision === 'WIN');
          const hasLossPitcher = pitchersList.some((p) => p.decision === 'LOSS');
          if (pitchersList.length > 0 && (!hasWinPitcher || !hasLossPitcher)) {
            throw new BadRequestException('경기 결과가 패배일 시, 투구 기록에서 반드시 승리투수(WIN)와 패배투수(LOSS)를 매칭 지정해주어야 합니다.');
          }
        }

        // 경기 결과 및 상태 업데이트
        await tx.game.update({
          where: { id: gameId },
          data: {
            status: 'CONFIRMED',
            result: gameResult,
            confirmedBy: user.id,
          },
        });

        // 클럽 회원 전원에게 알림 생성
        const activeMembers = await tx.user.findMany({
          where: { clubId: user.clubId, status: 'ACTIVE' },
        });

        for (const m of activeMembers) {
          await tx.notification.create({
            data: {
              userId: m.id,
              type: 'RECORD_CONFIRMED',
              title: '경기 기록 확정 알림',
              body: `${freshGame.opponentName}팀과의 경기 기록이 최종 승인되었습니다. 개인 스탯을 확인해보세요!`,
              linkUrl: `/games/${gameId}`,
              isRead: false,
            },
          });
        }
      } else {
        // 임시 저장 시
        await tx.game.update({
          where: { id: gameId },
          data: { status: 'RECORD_PENDING' },
        });
      }

      return { action };
    });

    return {
      message: result.action === 'CONFIRM' ? '경기 기록이 성공적으로 최종 확정되었습니다.' : '경기 기록이 임시저장되었습니다.',
      status: result.action === 'CONFIRM' ? 'CONFIRMED' : 'RECORD_PENDING',
    };
  }
}
