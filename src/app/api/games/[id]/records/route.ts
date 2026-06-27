import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isStaff, errorResponse } from "@/lib/api-middleware";

/**
 * 경기 기록 저장 및 최종 확정 API (교사/매니저 전용)
 * POST /api/games/[id]/records
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user || !isStaff(user)) {
      return errorResponse("권한이 없습니다.", 403);
    }

    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: { season: true },
    });

    if (!game) {
      return errorResponse("경기를 찾을 수 없습니다.", 404);
    }

    // 이미 최종 확정된 경기인 경우 수정 권한 체크
    // 교사(ADMIN)만 수정 가능, 매니저는 수정 불가
    if (game.status === "CONFIRMED" && user.role !== "ADMIN") {
      return errorResponse("최종 확정된 기록은 교사(최고 관리자)만 수정할 수 있습니다.", 403);
    }

    const body = await req.json();
    const { action, score, battingRecords, pitchingRecords } = body; 
    // action: "SAVE" (임시저장) | "CONFIRM" (최종확정)

    if (!action || !["SAVE", "CONFIRM"].includes(action)) {
      return errorResponse("올바른 action 값을 전송해주세요 (SAVE 또는 CONFIRM).");
    }

    // 1. 스코어 계산 및 승패 자동 판정
    let ourScore = 0;
    let opponentScore = 0;
    let inningScoresJsonString = "[]";
    let gameResult: string | null = null;

    if (score && score.inningScores && Array.isArray(score.inningScores)) {
      inningScoresJsonString = JSON.stringify(score.inningScores);
      score.inningScores.forEach((item: any) => {
        ourScore += parseInt(item.our || 0);
        opponentScore += parseInt(item.opp || 0);
      });

      if (ourScore > opponentScore) gameResult = "WIN";
      else if (ourScore < opponentScore) gameResult = "LOSS";
      else gameResult = "DRAW";
    }

    // 2. 검증 로직 (최종 확정 CONFIRM 시에만 엄격하게 적용)
    if (action === "CONFIRM") {
      if (!score || !battingRecords || !pitchingRecords) {
        return errorResponse("최종 확정 시에는 모든 기록 항목(스코어, 타격, 투구)을 제공해야 합니다.");
      }

      // 2-1. 타격 데이터 유효성 검사
      for (const bat of battingRecords) {
        const h = parseInt(bat.hits || 0);
        const d = parseInt(bat.doubles || 0);
        const t = parseInt(bat.triples || 0);
        const hr = parseInt(bat.homeRuns || 0);
        const ab = parseInt(bat.atBats || 0);
        const pa = parseInt(bat.plateAppearances || 0);

        if (h < (d + t + hr)) {
          return errorResponse("타격 유효성 오류: 안타 수는 2루타+3루타+홈런 합산보다 많아야 합니다.");
        }
        if (pa < ab) {
          return errorResponse("타격 유효성 오류: 타수(AB)는 타석(PA)보다 클 수 없습니다.");
        }
      }

      // 2-2. 투구 데이터 유효성 검사
      let winCount = 0;
      let lossCount = 0;
      let saveCount = 0;

      for (const pitch of pitchingRecords) {
        const ip = parseFloat(pitch.inningsPitched || 0);
        const dec = pitch.decision; // WIN, LOSS, SAVE, HOLD, NONE

        // 이닝 표기법 검사: 소수점 첫째자리가 0, 1, 2 중 하나여야 함
        const decPart = Math.round((ip - Math.floor(ip)) * 10);
        if (decPart < 0 || decPart > 2) {
          return errorResponse("투구 유효성 오류: 이닝의 소수점 첫째자리는 아웃카운트(.0, .1, .2)만 가능합니다.");
        }

        if (dec === "WIN") winCount++;
        if (dec === "LOSS") lossCount++;
        if (dec === "SAVE") saveCount++;
      }

      // 야구 경기 결정(Decision) 제약조건 검증
      if (gameResult === "WIN") {
        if (winCount !== 1) return errorResponse("승리한 경기는 반드시 1명의 승리투수(WIN)를 지정해야 합니다.");
        if (lossCount !== 0) return errorResponse("승리한 경기에는 패전투수(LOSS)를 둘 수 없습니다.");
      } else if (gameResult === "LOSS") {
        if (lossCount !== 1) return errorResponse("패배한 경기는 반드시 1명의 패전투수(LOSS)를 지정해야 합니다.");
        if (winCount !== 0) return errorResponse("패배한 경기에는 승리투수(WIN)를 둘 수 없습니다.");
      } else {
        // DRAW
        if (winCount !== 0 || lossCount !== 0) {
          return errorResponse("무승부 경기에는 승리/패전 투수를 지정할 수 없습니다.");
        }
      }
      if (saveCount > 1) {
        return errorResponse("한 경기에 세이브 투수(SAVE)는 최대 1명만 지정 가능합니다.");
      }
    }

    // 3. 데이터베이스 저장 트랜잭션
    const finalStatus = action === "CONFIRM" ? "CONFIRMED" : "RECORD_PENDING";
    
    await prisma.$transaction(async (tx) => {
      // 3-1. 경기 기본 정보 & 스코어 수정
      await tx.game.update({
        where: { id: params.id },
        data: {
          ourScore,
          opponentScore,
          result: gameResult,
          inningScores: inningScoresJsonString,
          status: finalStatus,
          confirmedBy: action === "CONFIRM" ? user.id : null,
        },
      });

      // 3-2. 타격 기록 일괄 삭제 후 재생성
      if (battingRecords && Array.isArray(battingRecords)) {
        await tx.battingRecord.deleteMany({ where: { gameId: params.id } });
        if (battingRecords.length > 0) {
          await tx.battingRecord.createMany({
            data: battingRecords.map((b) => ({
              gameId: params.id,
              userId: b.userId,
              plateAppearances: parseInt(b.plateAppearances || 0),
              atBats: parseInt(b.atBats || 0),
              hits: parseInt(b.hits || 0),
              doubles: parseInt(b.doubles || 0),
              triples: parseInt(b.triples || 0),
              homeRuns: parseInt(b.homeRuns || 0),
              runs: parseInt(b.runs || 0),
              rbis: parseInt(b.rbis || 0),
              walks: parseInt(b.walks || 0),
              strikeouts: parseInt(b.strikeouts || 0),
              stolenBases: parseInt(b.stolenBases || 0),
              hitByPitch: parseInt(b.hitByPitch || 0),
              sacrifice: parseInt(b.sacrifice || 0),
            })),
          });
        }
      }

      // 3-3. 투구 기록 일괄 삭제 후 재생성
      if (pitchingRecords && Array.isArray(pitchingRecords)) {
        await tx.pitchingRecord.deleteMany({ where: { gameId: params.id } });
        if (pitchingRecords.length > 0) {
          await tx.pitchingRecord.createMany({
            data: pitchingRecords.map((p) => ({
              gameId: params.id,
              userId: p.userId,
              inningsPitched: parseFloat(p.inningsPitched || 0),
              hitsAllowed: parseInt(p.hitsAllowed || 0),
              runsAllowed: parseInt(p.runsAllowed || 0),
              earnedRuns: parseInt(p.earnedRuns || 0),
              walksAllowed: parseInt(p.walksAllowed || 0),
              strikeouts: parseInt(p.strikeouts || 0),
              homeRunsAllowed: parseInt(p.homeRunsAllowed || 0),
              pitchCount: parseInt(p.pitchCount || 0),
              decision: p.decision || "NONE",
            })),
          });
        }
      }

      // 3-4. 최종 확정 시 알림 발송
      if (action === "CONFIRM") {
        // 출전 유저 목록 취합 (타자 혹은 투수 기록에 포함된 사람)
        const playerIds = new Set([
          ...(battingRecords || []).map((b: any) => b.userId),
          ...(pitchingRecords || []).map((p: any) => p.userId),
        ]);

        const playerNotifications = Array.from(playerIds).map((pId) => ({
          userId: pId,
          type: "RECORD_CONFIRMED",
          title: "경기 기록 확정 완료",
          body: `${game.opponentName}과의 경기 기록이 최종 확정되어 개인 스탯에 반영되었습니다.`,
          linkUrl: `/games/${game.id}`,
          isRead: false,
        }));

        if (playerNotifications.length > 0) {
          await tx.notification.createMany({
            data: playerNotifications,
          });
        }

        // 매니저가 확정했을 때 교사(ADMIN)에게 알림
        if (user.role === "MANAGER") {
          const admins = await tx.user.findMany({
            where: { clubId: user.clubId, role: "ADMIN" },
          });

          const adminNotifications = admins.map((admin) => ({
            userId: admin.id,
            type: "RECORD_CONFIRMED_BY_MANAGER",
            title: "매니저 기록 확정 알림",
            body: `이매니저가 ${game.opponentName}과의 경기 기록을 최종 확정하였습니다.`,
            linkUrl: `/games/${game.id}`,
            isRead: false,
          }));

          if (adminNotifications.length > 0) {
            await tx.notification.createMany({
              data: adminNotifications,
            });
          }
        }
      }
    });

    return NextResponse.json({
      message: action === "CONFIRM" ? "경기 기록이 최종 확정되었습니다." : "임시저장이 완료되었습니다.",
      status: finalStatus,
    });
  } catch (error: any) {
    console.error("경기 기록 처리 에러:", error);
    return errorResponse("기록 저장 중 오류가 발생했습니다.", 500);
  }
}
