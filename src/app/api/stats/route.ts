export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, errorResponse } from "@/lib/api-middleware";
import {
  calculateAvg,
  calculateObp,
  calculateSlg,
  calculateOps,
  calculateEra,
  calculateWhip,
  calculateWpct,
  convertIpToValue,
  convertValueToIp,
} from "@/lib/stats";
import { calculateTeamSummary } from "@/lib/stats-team";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("로그인이 필요합니다.", 401);
    }

    const { searchParams } = new URL(req.url);
    let seasonId = searchParams.get("seasonId");
    const targetUserId = searchParams.get("userId"); // 특정 사용자 성적 조회용

    // 1. 시즌 아이디 확인 (없으면 활성 시즌 기본 사용)
    if (!seasonId) {
      const activeSeason = await prisma.season.findFirst({
        where: { clubId: user.clubId, isActive: true },
      });
      if (!activeSeason) {
        return NextResponse.json({ error: "등록된 활성 시즌이 없습니다." }, { status: 404 });
      }
      seasonId = activeSeason.id;
    }

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season || season.clubId !== user.clubId) {
      return errorResponse("유효하지 않은 시즌입니다.");
    }

    const inningsPerGame = season.inningsPerGame;

    // ============================================
    // CASE A: 특정 개인의 시즌 성적 & 경기별 추이 조회
    // ============================================
    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, jerseyNumber: true, primaryPosition: true, status: true },
      });

      if (!targetUser) {
        return errorResponse("조회 대상 유저를 찾을 수 없습니다.", 404);
      }

      // 1. 타격 기록 목록 조회 (확정된 경기만)
      const battingRecords = await prisma.battingRecord.findMany({
        where: {
          userId: targetUserId,
          game: { seasonId, status: "CONFIRMED" },
        },
        include: {
          game: {
            select: { gameDate: true, opponentName: true },
          },
        },
        orderBy: {
          game: { gameDate: "asc" }, // 날짜 오름차순 (누적 추이 계산용)
        },
      });

      // 2. 투구 기록 목록 조회
      const pitchingRecords = await prisma.pitchingRecord.findMany({
        where: {
          userId: targetUserId,
          game: { seasonId, status: "CONFIRMED" },
        },
        include: {
          game: {
            select: { gameDate: true, opponentName: true },
          },
        },
        orderBy: {
          game: { gameDate: "asc" },
        },
      });

      // 3. 타격 성적 실시간 집계
      let batSum = {
        games: battingRecords.length,
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
      };

      // 누적 타율 변화 추이 데이터 생성
      let cumulativeAtBats = 0;
      let cumulativeHits = 0;
      const battingTrend = battingRecords.map((r) => {
        batSum.plateAppearances += r.plateAppearances;
        batSum.atBats += r.atBats;
        batSum.hits += r.hits;
        batSum.doubles += r.doubles;
        batSum.triples += r.triples;
        batSum.homeRuns += r.homeRuns;
        batSum.runs += r.runs;
        batSum.rbis += r.rbis;
        batSum.walks += r.walks;
        batSum.strikeouts += r.strikeouts;
        batSum.stolenBases += r.stolenBases;
        batSum.hitByPitch += r.hitByPitch;
        batSum.sacrifice += r.sacrifice;

        cumulativeAtBats += r.atBats;
        cumulativeHits += r.hits;

        return {
          gameDate: r.game.gameDate.toISOString().substring(5, 10), // MM-DD 포맷
          opponent: r.game.opponentName,
          hits: r.hits,
          atBats: r.atBats,
          currentAvg: calculateAvg(cumulativeHits, cumulativeAtBats),
        };
      });

      const avg = calculateAvg(batSum.hits, batSum.atBats);
      const obp = calculateObp(batSum.hits, batSum.walks, batSum.hitByPitch, batSum.atBats, batSum.sacrifice);
      const slg = calculateSlg(batSum.hits, batSum.doubles, batSum.triples, batSum.homeRuns, batSum.atBats);
      const ops = calculateOps(obp, slg);

      const battingSummary = {
        ...batSum,
        avg,
        obp,
        slg,
        ops,
        trend: battingTrend,
      };

      // 4. 투구 성적 실시간 집계
      let pitchSum = {
        games: pitchingRecords.length,
        inningsPitchedValue: 0.0, // 수학적 수치 합산용
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
      };

      pitchingRecords.forEach((r) => {
        pitchSum.inningsPitchedValue += convertIpToValue(r.inningsPitched);
        pitchSum.hitsAllowed += r.hitsAllowed;
        pitchSum.runsAllowed += r.runsAllowed;
        pitchSum.earnedRuns += r.earnedRuns;
        pitchSum.walksAllowed += r.walksAllowed;
        pitchSum.strikeouts += r.strikeouts;
        pitchSum.homeRunsAllowed += r.homeRunsAllowed;
        pitchSum.pitchCount += r.pitchCount;

        if (r.decision === "WIN") pitchSum.wins++;
        if (r.decision === "LOSS") pitchSum.losses++;
        if (r.decision === "SAVE") pitchSum.saves++;
        if (r.decision === "HOLD") pitchSum.holds++;
      });

      const totalIp = convertValueToIp(pitchSum.inningsPitchedValue);
      const era = calculateEra(pitchSum.earnedRuns, totalIp, inningsPerGame);
      const whip = calculateWhip(pitchSum.walksAllowed, pitchSum.hitsAllowed, totalIp);
      const wpct = calculateWpct(pitchSum.wins, pitchSum.losses);

      const pitchingSummary = {
        ...pitchSum,
        inningsPitched: totalIp,
        era,
        whip,
        wpct,
      };

      return NextResponse.json({
        user: targetUser,
        batting: battingSummary,
        pitching: pitchingSummary,
      });
    }

    // ============================================
    // CASE B: 팀 통계 대시보드 (전체 요약 & 랭킹)
    // ============================================
    // 1. 연습/친선 경기 요약
    const practiceSummary = await calculateTeamSummary(prisma, seasonId, ["PRACTICE", "FRIENDLY"], inningsPerGame);
    // 2. 대회/리그 경기 요약
    const officialSummary = await calculateTeamSummary(prisma, seasonId, ["LEAGUE", "TOURNAMENT"], inningsPerGame);
    // 3. 전체 종합 요약
    const summary = await calculateTeamSummary(prisma, seasonId, ["PRACTICE", "FRIENDLY", "LEAGUE", "TOURNAMENT"], inningsPerGame);

    // 최근 5경기 트렌드 데이터
    const recentGames = await prisma.game.findMany({
      where: { seasonId, status: "CONFIRMED" },
      orderBy: { gameDate: "desc" },
      take: 5,
    }).then(games => games.reverse().map(g => ({
      gameId: g.id,
      opponent: g.opponentName,
      ourScore: g.ourScore,
      opponentScore: g.opponentScore,
      result: g.result,
      date: g.gameDate.toISOString().substring(5, 10),
    })));

    // 4. 랭킹 TOP 3 데이터 추출
    // (여기서는 DB에서 그룹핑하여 선수별 성적 집계한 뒤 정렬하여 추출)
    const userSummaryList = await prisma.user.findMany({
      where: { clubId: user.clubId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        battingRecords: {
          where: { game: { seasonId, status: "CONFIRMED" } },
        },
        pitchingRecords: {
          where: { game: { seasonId, status: "CONFIRMED" } },
        },
      },
    });

    const playerStats = userSummaryList.map((player) => {
      // 타격 집계
      let ab = 0, h = 0, hr = 0, rbi = 0, bb = 0, hbp = 0, sac = 0, d = 0, t = 0;
      player.battingRecords.forEach((b) => {
        ab += b.atBats; h += b.hits; hr += b.homeRuns; rbi += b.rbis;
        bb += b.walks; hbp += b.hitByPitch; sac += b.sacrifice;
        d += b.doubles; t += b.triples;
      });
      const avg = calculateAvg(h, ab);
      const obp = calculateObp(h, bb, hbp, ab, sac);
      const slg = calculateSlg(h, d, t, hr, ab);
      const ops = calculateOps(obp, slg);

      // 투구 집계
      let ipVal = 0, er = 0, k = 0, w = 0, l = 0;
      player.pitchingRecords.forEach((p) => {
        ipVal += convertIpToValue(p.inningsPitched);
        er += p.earnedRuns;
        k += p.strikeouts;
        if (p.decision === "WIN") w++;
        if (p.decision === "LOSS") l++;
      });
      const ip = convertValueToIp(ipVal);
      const era = calculateEra(er, ip, inningsPerGame);

      return {
        id: player.id,
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        ab, h, avg, hr, rbi, ops,
        ip, era, k, wins: w,
      };
    });

    // 랭킹 카테고리별 정렬 (타자 최소 5타수, 투수 최소 2이닝 이상 등의 가벼운 규정 필터 적용)
    // 1) 타율 랭킹
    const topAvg = [...playerStats]
      .filter((p) => p.ab >= 3) // MVP 수준의 규정 타석 약식 필터 (최소 3타수)
      .sort((a, b) => b.avg - a.avg || b.h - a.h)
      .slice(0, 3);

    // 2) 홈런 랭킹
    const topHr = [...playerStats]
      .filter((p) => p.hr > 0)
      .sort((a, b) => b.hr - a.hr || b.ab - a.ab)
      .slice(0, 3);

    // 3) 평균자책점 랭킹 (ERA는 낮을수록 좋음)
    const topEra = [...playerStats]
      .filter((p) => convertIpToValue(p.ip) >= 2) // 최소 2이닝 등판 필터
      .sort((a, b) => a.era - b.era || b.ip - a.ip)
      .slice(0, 3);

    // 4) 탈삼진 랭킹
    const topK = [...playerStats]
      .filter((p) => p.k > 0)
      .sort((a, b) => b.k - a.k || a.era - b.era)
      .slice(0, 3);

    return NextResponse.json({
      summary,
      practiceSummary,
      officialSummary,
      recentGames,
      rankings: {
        avg: topAvg,
        homeRuns: topHr,
        era: topEra,
        strikeouts: topK,
      },
      playerStats, // 전체 테이블 뷰 지원을 위해 전체 목록도 제공
    });
  } catch (error: any) {
    console.error("통계 산출 에러:", error);
    return errorResponse("통계 산출 중 오류가 발생했습니다.", 500);
  }
}
