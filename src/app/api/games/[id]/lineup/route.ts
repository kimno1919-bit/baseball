import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isStaff, errorResponse } from "@/lib/api-middleware";

/**
 * 라인업 조회 API
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("로그인이 필요합니다.", 401);
    }

    const lineups = await prisma.lineup.findMany({
      where: { gameId: params.id },
      include: {
        user: {
          select: { id: true, name: true, jerseyNumber: true, primaryPosition: true },
        },
      },
      orderBy: {
        battingOrder: "asc",
      },
    });

    return NextResponse.json(lineups);
  } catch (error: any) {
    console.error("라인업 조회 에러:", error);
    return errorResponse("서버 오류가 발생했습니다.", 500);
  }
}

/**
 * 라인업 저장 API (교사/매니저 전용)
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
    });

    if (!game) {
      return errorResponse("경기를 찾을 수 없습니다.", 404);
    }

    if (game.status === "CONFIRMED") {
      return errorResponse("이미 최종 확정된 경기의 라인업은 수정할 수 없습니다.");
    }

    const body = await req.json();
    const { lineups } = body; // [{ userId: string, battingOrder: number | null, position: string, isStarter: boolean, isStartingPitcher: boolean }]

    if (!lineups || !Array.isArray(lineups)) {
      return errorResponse("올바른 라인업 데이터를 전송해주세요.");
    }

    // 1. 실제 당일 출석 여부(actualAttended = true) 확인
    const attendances = await prisma.attendance.findMany({
      where: { gameId: game.id, actualAttended: true },
      select: { userId: true },
    });
    const attendedUserIds = new Set(attendances.map((a) => a.userId));

    for (const item of lineups) {
      if (!attendedUserIds.has(item.userId)) {
        return errorResponse("당일 실제 출석한 부원만 라인업에 등록할 수 있습니다.");
      }
    }

    // 2. 선발 라인업 검증
    const starters = lineups.filter((l) => l.isStarter);
    if (starters.length !== 9) {
      return errorResponse("선발 라인업은 정확히 9명이어야 합니다. 현재: " + starters.length + "명");
    }

    // 3. 중복 선수 검증
    const userIds = lineups.map((l) => l.userId);
    if (new Set(userIds).size !== userIds.length) {
      return errorResponse("중복 등록된 선수가 있습니다.");
    }

    // 4. 선발 타순 (1~9) 검증
    const battingOrders = starters.map((s) => s.battingOrder);
    const sortedOrders = [...battingOrders].sort((a, b) => (a || 0) - (b || 0));
    for (let i = 1; i <= 9; i++) {
      if (sortedOrders[i - 1] !== i) {
        return errorResponse(`선발 타순은 1번부터 9번까지 빈틈없이 지정되어야 합니다. (오류: ${i}번 타순 누락/중복)`);
      }
    }

    // 5. 선발투수 지정 검증 (정확히 1명)
    const startingPitchers = lineups.filter((l) => l.isStartingPitcher);
    if (startingPitchers.length !== 1) {
      return errorResponse("선발투수는 정확히 1명 지정해야 합니다.");
    }

    const pitcherInLineup = startingPitchers[0];
    const isPitcherStarter = lineups.find((l) => l.userId === pitcherInLineup.userId);
    if (!isPitcherStarter) {
      return errorResponse("선발투수는 라인업 명단에 포함된 인원이어야 합니다.");
    }

    // 6. 포지션 중복 검증 (P, C, 1B, 2B, 3B, SS, LF, CF, RF, DH)
    // 선발 9명의 수비 포지션이 서로 달라야 함
    const starterPositions = starters.map((s) => s.position);
    const uniquePositions = new Set(starterPositions);
    if (uniquePositions.size !== 9) {
      return errorResponse("선발 선수들의 수비 포지션이 중복될 수 없습니다.");
    }

    // 트랜잭션: 기존 라인업 삭제 후 일괄 재생성
    await prisma.$transaction([
      prisma.lineup.deleteMany({
        where: { gameId: game.id },
      }),
      prisma.lineup.createMany({
        data: lineups.map((item) => ({
          gameId: game.id,
          userId: item.userId,
          battingOrder: item.battingOrder,
          position: item.position,
          isStarter: !!item.isStarter,
          isStartingPitcher: !!item.isStartingPitcher,
        })),
      }),
      // 경기 상태를 RECORD_PENDING (기록 입력 대기)으로 업데이트
      prisma.game.update({
        where: { id: game.id },
        data: { status: "RECORD_PENDING" },
      }),
    ]);

    return NextResponse.json({
      message: "라인업이 정상적으로 저장되었으며, 경기 상태가 기록 대기중으로 전환되었습니다.",
    });
  } catch (error: any) {
    console.error("라인업 저장 에러:", error);
    return errorResponse("라인업 저장 중 오류가 발생했습니다.", 500);
  }
}
