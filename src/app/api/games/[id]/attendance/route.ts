import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isStaff, errorResponse } from "@/lib/api-middleware";

/**
 * 1. 학생 본인 사전 출결 응답 제출 API (MEMBER 포함 공통)
 * POST /api/games/[id]/attendance
 */
export async function POST(
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
    });

    if (!game) {
      return errorResponse("경기를 찾을 수 없습니다.", 404);
    }

    // 출결 마감 시간 체크
    const now = new Date();
    if (now > new Date(game.attendanceDeadline)) {
      return errorResponse("출결 마감 기한이 초과하여 응답을 변경할 수 없습니다.", 400);
    }

    const body = await req.json();
    const { response, absentReason } = body; // response: "ATTEND" | "ABSENT" | "UNDECIDED"

    if (!response || !["ATTEND", "ABSENT", "UNDECIDED"].includes(response)) {
      return errorResponse("올바른 응답 값을 선택해주세요.");
    }

    // 출결 데이터 업데이트 또는 삽입 (Upsert)
    const attendance = await prisma.attendance.upsert({
      where: {
        gameId_userId: {
          gameId: game.id,
          userId: user.id,
        },
      },
      update: {
        response,
        absentReason: response === "ABSENT" ? absentReason || "" : null,
        respondedAt: new Date(),
      },
      create: {
        gameId: game.id,
        userId: user.id,
        response,
        absentReason: response === "ABSENT" ? absentReason || "" : null,
        actualAttended: false, // 기본값
      },
    });

    return NextResponse.json({
      message: "출결 응답이 정상적으로 제출되었습니다.",
      attendance,
    });
  } catch (error: any) {
    console.error("출결 응답 제출 에러:", error);
    return errorResponse("출결 응답 제출 중 오류가 발생했습니다.", 500);
  }
}

/**
 * 2. 교사/매니저의 당일 실제 출석 체크 일괄 업데이트 API
 * PUT /api/games/[id]/attendance
 */
export async function PUT(
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
      return errorResponse("이미 최종 확정된 경기의 출석 상태는 변경할 수 없습니다.");
    }

    const body = await req.json();
    const { attendances } = body; // 배열 형태: [{ userId: string, actualAttended: boolean, actualStatus: string }, ...]

    if (!attendances || !Array.isArray(attendances)) {
      return errorResponse("올바른 형식의 출결 목록 데이터를 제공해주세요.");
    }

    // 트랜잭션으로 실제 출석 여부 일괄 업데이트
    await prisma.$transaction(
      attendances.map((item) =>
        prisma.attendance.update({
          where: {
            gameId_userId: {
              gameId: game.id,
              userId: item.userId,
            },
          },
          data: {
            actualAttended: !!item.actualAttended,
            actualStatus: item.actualStatus || "UNKNOWN",
          },
        })
      )
    );

    // 실제 출석 체크가 저장되면 경기 상태를 IN_PROGRESS로 업데이트 해 둔다 (기록 입력 단계 진입 준비)
    if (game.status === "SCHEDULED") {
      await prisma.game.update({
        where: { id: game.id },
        data: { status: "IN_PROGRESS" },
      });
    }

    return NextResponse.json({
      message: "당일 실제 출석 체크가 정상적으로 저장되었습니다.",
    });
  } catch (error: any) {
    console.error("실제 출석 체크 저장 에러:", error);
    return errorResponse("출석 체크 중 오류가 발생했습니다.", 500);
  }
}
