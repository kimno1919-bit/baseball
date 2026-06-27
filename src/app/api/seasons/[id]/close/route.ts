import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdmin, errorResponse } from "@/lib/api-middleware";
import fs from "fs";
import path from "path";

/**
 * 시즌 수동 마감 및 비활성 부원 데이터 폐기 + 스냅샷 백업 API (교사 전용)
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user || !isAdmin(user)) {
      return errorResponse("권한이 없습니다. 교사 계정으로 로그인해주세요.", 403);
    }

    const seasonId = params.id;

    // 1. 대상 시즌이 존재하는지 및 이미 마감되었는지 확인
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season || season.clubId !== user.clubId) {
      return errorResponse("해당 시즌을 찾을 수 없습니다.", 404);
    }

    if (!season.isActive) {
      return errorResponse("이미 마감된 시즌입니다.");
    }

    // 2. 스냅샷 데이터 작성 (해당 시즌의 모든 경기, 라인업, 기록, 유저 스탯 수집)
    const games = await prisma.game.findMany({
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

    const activeUsers = await prisma.user.findMany({
      where: { clubId: user.clubId, status: "ACTIVE" },
      select: { id: true, name: true, loginId: true, jerseyNumber: true },
    });

    const inactiveUsers = await prisma.user.findMany({
      where: { clubId: user.clubId, status: "INACTIVE" },
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

    // 3. 로컬 파일 시스템에 스냅샷 JSON 파일 저장
    const snapshotDir = path.join(process.cwd(), "prisma", "snapshots");
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }
    const snapshotPath = path.join(snapshotDir, `season-${seasonId}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2), "utf8");

    // 4. 트랜잭션 수행: 시즌 비활성화 + 비활성 부원 기록 삭제
    await prisma.$transaction(async (tx) => {
      // 시즌 비활성화
      await tx.season.update({
        where: { id: seasonId },
        data: { isActive: false },
      });

      // 비활성(INACTIVE) 상태의 부원 ID 목록 가져오기
      const inactiveUserIds = (
        await tx.user.findMany({
          where: { clubId: user.clubId, status: "INACTIVE" },
          select: { id: true },
        })
      ).map((u) => u.id);

      if (inactiveUserIds.length > 0) {
        // 비활성 부원의 해당 시즌 경기별 데이터 폐기 (Prisma Cascading 또는 수동 삭제)
        // 1. 타격 기록 삭제
        await tx.battingRecord.deleteMany({
          where: {
            userId: { in: inactiveUserIds },
            game: { seasonId },
          },
        });

        // 2. 투구 기록 삭제
        await tx.pitchingRecord.deleteMany({
          where: {
            userId: { in: inactiveUserIds },
            game: { seasonId },
          },
        });

        // 3. 라인업 삭제
        await tx.lineup.deleteMany({
          where: {
            userId: { in: inactiveUserIds },
            game: { seasonId },
          },
        });

        // 4. 출결 삭제
        await tx.attendance.deleteMany({
          where: {
            userId: { in: inactiveUserIds },
            game: { seasonId },
          },
        });
      }
    });

    return NextResponse.json({
      message: "시즌이 정상 마감되었습니다. 비활성 부원 기록이 폐기되었고 스냅샷이 저장되었습니다.",
      snapshotPath: `/prisma/snapshots/season-${seasonId}.json`,
    });
  } catch (error: any) {
    console.error("시즌 마감 에러:", error);
    return errorResponse("시즌 마감 처리 중 오류가 발생했습니다.", 500);
  }
}
