import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../auth/jwt-auth.guard';
import {
  calculateAvg,
  calculateObp,
  calculateSlg,
  calculateOps,
  calculateEra,
  calculateWhip,
  convertIpToValue,
} from '../lib/stats';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getStats(user: AuthenticatedUser, userIdParam?: string) {
    const targetUserId = userIdParam || user.id;

    // 1. 타겟 유저 정보 조회
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        loginId: true,
        jerseyNumber: true,
        primaryPosition: true,
        battingHand: true,
        throwingHand: true,
        status: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 2. 현재 활성화된 시즌 조회
    const activeSeason = await this.prisma.season.findFirst({
      where: { clubId: user.clubId, isActive: true },
    });

    if (!activeSeason) {
      // 시즌이 없을 시 기본 빈 통계 반환
      return {
        user: targetUser,
        teamSummary: { wins: 0, losses: 0, draws: 0, wpct: 0, teamAvg: 0, teamEra: 0 },
        recentGames: [],
        topRankers: { avg: [], homeRuns: [], rbis: [], era: [], strikeouts: [] },
        personalStats: {
          batting: {
            plateAppearances: 0,
            atBats: 0,
            hits: 0,
            doubles: 0,
            triples: 0,
            homeRuns: 0,
            runs: 0,
            rbis: 0,
            walks: 0,
            strikeouts: 0,
            stolenBases: 0,
            hitByPitch: 0,
            sacrifice: 0,
            avg: 0,
            obp: 0,
            slg: 0,
            ops: 0,
            trend: [],
          },
          pitching: {
            inningsPitched: 0,
            hitsAllowed: 0,
            runsAllowed: 0,
            earnedRuns: 0,
            walksAllowed: 0,
            strikeouts: 0,
            homeRunsAllowed: 0,
            pitchCount: 0,
            wins: 0,
            losses: 0,
            saves: 0,
            holds: 0,
            era: 0,
            whip: 0,
          },
        },
      };
    }

    const seasonId = activeSeason.id;
    const inningsPerGame = activeSeason.inningsPerGame;

    // 3. 확정된 경기 목록 조회
    const confirmedGames = await this.prisma.game.findMany({
      where: { seasonId, status: 'CONFIRMED' },
      orderBy: { gameDate: 'asc' },
    });

    // 3-1. 팀 요약 집계
    let wins = 0;
    let losses = 0;
    let draws = 0;
    confirmedGames.forEach((g) => {
      if (g.result === 'WIN') wins++;
      else if (g.result === 'LOSS') losses++;
      else draws++;
    });

    const totalDecisions = wins + losses;
    const wpct = totalDecisions > 0 ? wins / totalDecisions : 0;

    // 최근 5경기 결과 포맷팅
    const recentGames = confirmedGames
      .slice(-5)
      .map((g) => ({
        id: g.id,
        opponent: g.opponentName,
        ourScore: g.ourScore,
        opponentScore: g.opponentScore,
        result: g.result,
        date: g.gameDate.toISOString().substring(5, 10),
      }));

    // 3-2. 팀 타율 및 평균자책점 연산
    const allBatting = await this.prisma.battingRecord.findMany({
      where: { game: { seasonId } },
    });
    const teamTotalAtBats = allBatting.reduce((sum, r) => sum + r.atBats, 0);
    const teamTotalHits = allBatting.reduce((sum, r) => sum + r.hits, 0);
    const teamAvg = teamTotalAtBats > 0 ? teamTotalHits / teamTotalAtBats : 0;

    const allPitching = await this.prisma.pitchingRecord.findMany({
      where: { game: { seasonId } },
    });
    const teamTotalEr = allPitching.reduce((sum, r) => sum + r.earnedRuns, 0);
    const teamTotalIpVal = allPitching.reduce((sum, r) => sum + convertIpToValue(r.inningsPitched), 0);
    const teamEra = teamTotalIpVal > 0 ? (teamTotalEr * inningsPerGame) / teamTotalIpVal : 0;

    // 4. TOP 3 랭킹 계산 (전체 회원 대상)
    const allUsers = await this.prisma.user.findMany({
      where: { clubId: user.clubId, status: 'ACTIVE' },
      select: { id: true, name: true, jerseyNumber: true },
    });

    const userBatMap = new Map<string, any>();
    const userPitchMap = new Map<string, any>();

    allUsers.forEach((u) => {
      userBatMap.set(u.id, { user: u, plateAppearances: 0, atBats: 0, hits: 0, homeRuns: 0, rbis: 0, walks: 0, hitByPitch: 0, sacrifice: 0 });
      userPitchMap.set(u.id, { user: u, ipVal: 0, earnedRuns: 0, strikeouts: 0, walksAllowed: 0, hitsAllowed: 0, inningsPitched: 0 });
    });

    allBatting.forEach((b) => {
      const uB = userBatMap.get(b.userId);
      if (uB) {
        uB.plateAppearances += b.plateAppearances;
        uB.atBats += b.atBats;
        uB.hits += b.hits;
        uB.homeRuns += b.homeRuns;
        uB.rbis += b.rbis;
        uB.walks += b.walks;
        uB.hitByPitch += b.hitByPitch;
        uB.sacrifice += b.sacrifice;
      }
    });

    allPitching.forEach((p) => {
      const uP = userPitchMap.get(p.userId);
      if (uP) {
        uP.ipVal += convertIpToValue(p.inningsPitched);
        uP.earnedRuns += p.earnedRuns;
        uP.strikeouts += p.strikeouts;
        uP.walksAllowed += p.walksAllowed;
        uP.hitsAllowed += p.hitsAllowed;
      }
    });

    // 4-1. 규정 타석 및 규정 이닝 수 필터 계산
    // 규정 타석 = 경기 수 * 2.0 (스포츠클럽 기준 완화 조건)
    const totalGamesCount = confirmedGames.length;
    const requiredPa = totalGamesCount * 2.0;
    // 규정 이닝 = 경기 수 * 1.0
    const requiredIpVal = totalGamesCount * 1.0;

    const batCandidates = Array.from(userBatMap.values()).map((c) => {
      const avg = calculateAvg(c.hits, c.atBats);
      const obp = calculateObp(c.hits, c.walks, c.hitByPitch, c.atBats, c.sacrifice);
      const slg = calculateSlg(c.hits, c.homeRuns, 0, c.homeRuns, c.atBats); // doubles/triples는 생략 연산
      const ops = calculateOps(obp, slg);
      return { ...c, avg, obp, slg, ops };
    });

    const pitchCandidates = Array.from(userPitchMap.values()).map((c) => {
      const era = c.ipVal > 0 ? (c.earnedRuns * inningsPerGame) / c.ipVal : 99.9;
      return { ...c, era };
    });

    // 랭킹 추출
    const topAvg = batCandidates
      .filter((c) => c.plateAppearances >= requiredPa && c.atBats > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3)
      .map((c) => ({ id: c.user.id, name: c.user.name, value: c.avg, jerseyNumber: c.user.jerseyNumber }));

    const topHomeRuns = batCandidates
      .filter((c) => c.homeRuns > 0)
      .sort((a, b) => b.homeRuns - a.homeRuns)
      .slice(0, 3)
      .map((c) => ({ id: c.user.id, name: c.user.name, value: c.homeRuns, jerseyNumber: c.user.jerseyNumber }));

    const topRbis = batCandidates
      .filter((c) => c.rbis > 0)
      .sort((a, b) => b.rbis - a.rbis)
      .slice(0, 3)
      .map((c) => ({ id: c.user.id, name: c.user.name, value: c.rbis, jerseyNumber: c.user.jerseyNumber }));

    const topEra = pitchCandidates
      .filter((c) => c.ipVal >= requiredIpVal)
      .sort((a, b) => a.era - b.era)
      .slice(0, 3)
      .map((c) => ({ id: c.user.id, name: c.user.name, value: c.era, jerseyNumber: c.user.jerseyNumber }));

    const topStrikeouts = pitchCandidates
      .filter((c) => c.strikeouts > 0)
      .sort((a, b) => b.strikeouts - a.strikeouts)
      .slice(0, 3)
      .map((c) => ({ id: c.user.id, name: c.user.name, value: c.strikeouts, jerseyNumber: c.user.jerseyNumber }));

    // 5. 대상 유저 개인 성적 집계
    const myBatRecords = await this.prisma.battingRecord.findMany({
      where: { userId: targetUserId, game: { seasonId, status: 'CONFIRMED' } },
      include: { game: { select: { gameDate: true } } },
      orderBy: { game: { gameDate: 'asc' } },
    });

    const myPitchRecords = await this.prisma.pitchingRecord.findMany({
      where: { userId: targetUserId, game: { seasonId, status: 'CONFIRMED' } },
    });

    // 개인 타격 종합
    const pBat = {
      plateAppearances: 0,
      atBats: 0,
      hits: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      runs: 0,
      rbis: 0,
      walks: 0,
      strikeouts: 0,
      stolenBases: 0,
      hitByPitch: 0,
      sacrifice: 0,
      avg: 0,
      obp: 0,
      slg: 0,
      ops: 0,
      trend: [] as any[],
    };

    let accumHits = 0;
    let accumAtBats = 0;

    myBatRecords.forEach((r) => {
      pBat.plateAppearances += r.plateAppearances;
      pBat.atBats += r.atBats;
      pBat.hits += r.hits;
      pBat.doubles += r.doubles;
      pBat.triples += r.triples;
      pBat.homeRuns += r.homeRuns;
      pBat.runs += r.runs;
      pBat.rbis += r.rbis;
      pBat.walks += r.walks;
      pBat.strikeouts += r.strikeouts;
      pBat.stolenBases += r.stolenBases;
      pBat.hitByPitch += r.hitByPitch;
      pBat.sacrifice += r.sacrifice;

      accumHits += r.hits;
      accumAtBats += r.atBats;
      const currentAvg = accumAtBats > 0 ? accumHits / accumAtBats : 0;

      pBat.trend.push({
        gameDate: r.game.gameDate.toISOString().substring(5, 10),
        currentAvg,
      });
    });

    pBat.avg = calculateAvg(pBat.hits, pBat.atBats);
    pBat.obp = calculateObp(pBat.hits, pBat.walks, pBat.hitByPitch, pBat.atBats, pBat.sacrifice);
    pBat.slg = calculateSlg(pBat.hits, pBat.doubles, pBat.triples, pBat.homeRuns, pBat.atBats);
    pBat.ops = calculateOps(pBat.obp, pBat.slg);

    // 개인 투구 종합
    const pPitch = {
      inningsPitched: 0,
      hitsAllowed: 0,
      runsAllowed: 0,
      earnedRuns: 0,
      walksAllowed: 0,
      strikeouts: 0,
      homeRunsAllowed: 0,
      pitchCount: 0,
      wins: 0,
      losses: 0,
      saves: 0,
      holds: 0,
      era: 0,
      whip: 0,
    };

    let totalIpVal = 0;
    myPitchRecords.forEach((r) => {
      totalIpVal += convertIpToValue(r.inningsPitched);
      pPitch.hitsAllowed += r.hitsAllowed;
      pPitch.runsAllowed += r.runsAllowed;
      pPitch.earnedRuns += r.earnedRuns;
      pPitch.walksAllowed += r.walksAllowed;
      pPitch.strikeouts += r.strikeouts;
      pPitch.homeRunsAllowed += r.homeRunsAllowed;
      pPitch.pitchCount += r.pitchCount;

      if (r.decision === 'WIN') pPitch.wins++;
      else if (r.decision === 'LOSS') pPitch.losses++;
      else if (r.decision === 'SAVE') pPitch.saves++;
      else if (r.decision === 'HOLD') pPitch.holds++;
    });

    pPitch.inningsPitched = totalIpVal; // 깞 합산
    pPitch.era = totalIpVal > 0 ? (pPitch.earnedRuns * inningsPerGame) / totalIpVal : 0;
    pPitch.whip = totalIpVal > 0 ? (pPitch.walksAllowed + pPitch.hitsAllowed) / totalIpVal : 0;

    return {
      user: targetUser,
      teamSummary: { wins, losses, draws, wpct, teamAvg, teamEra },
      recentGames,
      topRankers: { avg: topAvg, homeRuns: topHomeRuns, rbis: topRbis, era: topEra, strikeouts: topStrikeouts },
      personalStats: {
        batting: pBat,
        pitching: pPitch,
      },
    };
  }
}
