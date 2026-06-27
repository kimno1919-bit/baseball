import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdmin, errorResponse } from "@/lib/api-middleware";

/**
 * 모든 시즌 목록 조회 (로그인 사용자 공통)
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("로그인이 필요합니다.", 401);
    }

    const seasons = await prisma.season.findMany({
      where: {
        clubId: user.clubId,
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json(seasons);
  } catch (error: any) {
    console.error("시즌 목록 조회 에러:", error);
    return errorResponse("서버 오류가 발생했습니다.", 500);
  }
}

/**
 * 새 시즌 생성 및 활성화 처리 (교사 전용)
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !isAdmin(user)) {
      return errorResponse("권한이 없습니다. 교사 계정으로 로그인해주세요.", 403);
    }

    const body = await req.json();
    const { name, startDate, endDate, inningsPerGame, mercyRuleDiff, isActive } = body;

    if (!name || !startDate || !endDate || !inningsPerGame) {
      return errorResponse("필수 정보가 누락되었습니다.");
    }

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);

    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
      return errorResponse("날짜 포맷이 올바르지 않습니다.");
    }

    if (sDate >= eDate) {
      return errorResponse("시작일은 종료일보다 이전이어야 합니다.");
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. 만약 신규 시즌을 바로 활성화(isActive=true) 하려면, 기존 활성화된 시즌 비활성화
      if (isActive) {
        await tx.season.updateMany({
          where: {
            clubId: user.clubId,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      }

      // 2. 신규 시즌 생성
      const newSeason = await tx.season.create({
        data: {
          clubId: user.clubId,
          name,
          startDate: sDate,
          endDate: eDate,
          inningsPerGame: parseInt(inningsPerGame),
          mercyRuleDiff: mercyRuleDiff ? parseInt(mercyRuleDiff) : null,
          isActive: !!isActive,
        },
      });

      return newSeason;
    });

    return NextResponse.json({
      message: "새 시즌이 성공적으로 등록되었습니다.",
      season: result,
    });
  } catch (error: any) {
    console.error("시즌 생성 에러:", error);
    return errorResponse("시즌 생성 중 오류가 발생했습니다.", 500);
  }
}
