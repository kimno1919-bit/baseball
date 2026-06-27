import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isStaff, errorResponse } from "@/lib/api-middleware";

/**
 * 경기 상세 조회 API (로그인 사용자 공통)
 * 경기 정보 + 출결 정보 + 라인업 정보 + 타격/투구 기록을 한꺼번에 가져옴.
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

    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        season: true,
        attendances: {
          include: {
            user: {
              select: { id: true, name: true, jerseyNumber: true, primaryPosition: true },
            },
          },
        },
        lineups: {
          include: {
            user: {
              select: { id: true, name: true, jerseyNumber: true },
            },
          },
          orderBy: {
            battingOrder: "asc", // 타순 정렬
          },
        },
        battingRecords: {
          include: {
            user: {
              select: { id: true, name: true, jerseyNumber: true },
            },
          },
        },
        pitchingRecords: {
          include: {
            user: {
              select: { id: true, name: true, jerseyNumber: true },
            },
          },
        },
      },
    });

    if (!game || game.season.clubId !== user.clubId) {
      // 묵시적 접근 권한 체크를 위해 season.clubId 확인이 필요
      const season = await prisma.season.findUnique({
        where: { id: game?.seasonId },
      });
      if (!season || season.clubId !== user.clubId) {
        return errorResponse("경기를 찾을 수 없거나 권한이 없습니다.", 404);
      }
    }

    return NextResponse.json(game);
  } catch (error: any) {
    console.error("경기 상세 조회 에러:", error);
    return errorResponse("서버 오류가 발생했습니다.", 500);
  }
}

/**
 * 경기 수정 API (교사/매니저 전용)
 */
export async function PATCH(
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

    if (!game || game.season.clubId !== user.clubId) {
      return errorResponse("경기를 찾을 수 없습니다.", 404);
    }

    const body = await req.json();
    const { gameDate, location, opponentName, gameType, attendanceDeadline } = body;

    const updatedData: any = {};

    // 1. CONFIRMED 상태인 경기는 일정(gameDate)과 장소(location)만 수정 가능
    if (game.status === "CONFIRMED") {
      if (opponentName || gameType || attendanceDeadline) {
        return errorResponse("확정된 경기는 상대팀명, 경기유형, 출결 마감을 수정할 수 없습니다.");
      }
      if (gameDate) updatedData.gameDate = new Date(gameDate);
      if (location) updatedData.location = location;
    } else {
      // 그 외 상태에서는 자유롭게 수정 가능
      if (gameDate) updatedData.gameDate = new Date(gameDate);
      if (location) updatedData.location = location;
      if (opponentName) updatedData.opponentName = opponentName;
      if (gameType) updatedData.gameType = gameType;
      if (attendanceDeadline) updatedData.attendanceDeadline = new Date(attendanceDeadline);
    }

    const updatedGame = await prisma.$transaction(async (tx) => {
      const result = await tx.game.update({
        where: { id: params.id },
        data: updatedData,
      });

      // 관련 부원들에게 경기 수정 알림 발송
      const activeMembers = await tx.user.findMany({
        where: {
          clubId: user.clubId,
          status: "ACTIVE",
        },
      });

      const notificationsData = activeMembers.map((member) => ({
        userId: member.id,
        type: "GAME_UPDATED",
        title: "경기 일정 수정 알림",
        body: `${game.opponentName}과의 경기 정보(장소/일시 등)가 변경되었습니다. 확인해주세요.`,
        linkUrl: `/games/${game.id}`,
        isRead: false,
      }));

      if (notificationsData.length > 0) {
        await tx.notification.createMany({
          data: notificationsData,
        });
      }

      return result;
    });

    return NextResponse.json({
      message: "경기 정보가 수정되었습니다.",
      game: updatedGame,
    });
  } catch (error: any) {
    console.error("경기 수정 에러:", error);
    return errorResponse("경기 수정 중 오류가 발생했습니다.", 500);
  }
}

/**
 * 경기 삭제 API (교사/매니저 전용)
 */
export async function DELETE(
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

    if (!game || game.season.clubId !== user.clubId) {
      return errorResponse("경기를 찾을 수 없습니다.", 404);
    }

    // CONFIRMED(최종확정) 상태인 경기는 삭제 불가
    if (game.status === "CONFIRMED") {
      return errorResponse("이미 기록이 최종 확정된 경기는 삭제할 수 없습니다.");
    }

    // 트랜잭션으로 경기와 연관된 알림(Cascade 관계가 아닌 경우를 위해 또는 일괄 처리) 삭제 후 경기 삭제
    await prisma.game.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "경기가 정상적으로 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("경기 삭제 에러:", error);
    return errorResponse("경기 삭제 중 오류가 발생했습니다.", 500);
  }
}
