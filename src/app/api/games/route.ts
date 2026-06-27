import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isStaff, errorResponse } from "@/lib/api-middleware";

/**
 * 경기 목록 조회 API
 */
export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("로그인이 필요합니다.", 401);
    }

    const { searchParams } = new URL(req.url);
    let seasonId = searchParams.get("seasonId");
    const status = searchParams.get("status"); // SCHEDULED, IN_PROGRESS, RECORD_PENDING, CONFIRMED

    // 1. 만약 seasonId가 전달되지 않았다면 현재 활성(isActive=true) 시즌 사용
    if (!seasonId) {
      const activeSeason = await prisma.season.findFirst({
        where: {
          clubId: user.clubId,
          isActive: true,
        },
      });
      if (!activeSeason) {
        // 활성 시즌이 없다면 그냥 빈 리스트 반환
        return NextResponse.json([]);
      }
      seasonId = activeSeason.id;
    }

    const whereClause: any = {
      seasonId,
    };
    if (status) {
      whereClause.status = status;
    }

    const games = await prisma.game.findMany({
      where: whereClause,
      include: {
        attendances: {
          where: {
            userId: user.id,
          },
          select: {
            response: true,
            absentReason: true,
          },
        },
      },
      orderBy: {
        gameDate: "desc", // 최신 경기가 위에 오도록 정렬
      },
    });

    return NextResponse.json(games);
  } catch (error: any) {
    console.error("경기 목록 조회 에러:", error);
    return errorResponse("서버 오류가 발생했습니다.", 500);
  }
}

/**
 * 경기 등록 API (교사/매니저 전용)
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !isStaff(user)) {
      return errorResponse("권한이 없습니다. 교사 또는 매니저 계정으로 로그인해주세요.", 403);
    }

    const body = await req.json();
    const { seasonId, gameDate, location, opponentName, gameType, attendanceDeadline } = body;

    if (!seasonId || !gameDate || !location || !opponentName || !gameType || !attendanceDeadline) {
      return errorResponse("필수 정보가 누락되었습니다.");
    }

    const gDate = new Date(gameDate);
    const aDeadline = new Date(attendanceDeadline);

    if (isNaN(gDate.getTime()) || isNaN(aDeadline.getTime())) {
      return errorResponse("날짜 포맷이 올바르지 않습니다.");
    }

    if (aDeadline > gDate) {
      return errorResponse("출결 마감 시간은 경기 일시보다 이전이어야 합니다.");
    }

    // 대상 시즌이 해당 클럽의 시즌인지 검증 및 활성 상태 체크
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season || season.clubId !== user.clubId) {
      return errorResponse("유효하지 않은 시즌입니다.");
    }

    if (!season.isActive) {
      return errorResponse("마감된 시즌에는 경기를 등록할 수 없습니다.");
    }

    // 경기 생성 트랜잭션: Game 생성 + 대상자 Attendance 생성 + 부원 전체 알림
    const result = await prisma.$transaction(async (tx) => {
      // 1. 경기 레코드 생성 (기본값 SCHEDULED)
      const game = await tx.game.create({
        data: {
          seasonId,
          gameDate: gDate,
          location,
          opponentName,
          gameType,
          attendanceDeadline: aDeadline,
          status: "SCHEDULED",
          createdBy: user.id,
        },
      });

      // 2. 해당 클럽의 ACTIVE 상태인 모든 유저 목록 조회
      const activeMembers = await tx.user.findMany({
        where: {
          clubId: user.clubId,
          status: "ACTIVE",
        },
      });

      // 3. 각 부원별 출결 기본 상태(UNDECIDED) 레코드 일괄 생성
      const attendanceData = activeMembers.map((member) => ({
        gameId: game.id,
        userId: member.id,
        response: "UNDECIDED",
        actualAttended: false,
      }));

      if (attendanceData.length > 0) {
        await tx.attendance.createMany({
          data: attendanceData,
        });
      }

      // 4. 각 부원별 경기 등록 알림 생성
      const notificationsData = activeMembers.map((member) => ({
        userId: member.id,
        type: "GAME_CREATED",
        title: "새로운 경기 일정 등록",
        body: `${opponentName}과의 경기 일정이 등록되었습니다. 출결을 체크해주세요. (${location}, ${gameDate.substring(0, 10)})`,
        linkUrl: `/games/${game.id}`,
        isRead: false,
      }));

      if (notificationsData.length > 0) {
        await tx.notification.createMany({
          data: notificationsData,
        });
      }

      return game;
    });

    return NextResponse.json({
      message: "경기가 정상적으로 등록되었으며, 부원들에게 알림을 발송했습니다.",
      game: result,
    });
  } catch (error: any) {
    console.error("경기 등록 에러:", error);
    return errorResponse("경기 등록 중 오류가 발생했습니다.", 500);
  }
}
