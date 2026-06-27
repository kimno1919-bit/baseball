export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, errorResponse } from "@/lib/api-middleware";

/**
 * 로그인한 사용자의 인앱 알림 조회 API
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("로그인이 필요합니다.", 401);
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // 최근 50개 제한
    });

    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error("알림 목록 조회 에러:", error);
    return errorResponse("서버 오류가 발생했습니다.", 500);
  }
}

/**
 * 알림 읽음 처리 API
 */
export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return errorResponse("로그인이 필요합니다.", 401);
    }

    const body = await req.json();
    const { notificationId, readAll } = body;

    if (readAll) {
      // 전체 읽음 처리
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
      return NextResponse.json({ message: "모든 알림을 읽음 처리했습니다." });
    }

    if (!notificationId) {
      return errorResponse("알림 ID가 누락되었습니다.");
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== user.id) {
      return errorResponse("해당 알림을 찾을 수 없습니다.", 404);
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json({
      message: "알림이 정상적으로 읽음 처리되었습니다.",
      notification: updated,
    });
  } catch (error: any) {
    console.error("알림 상태 변경 에러:", error);
    return errorResponse("알림 수정 중 오류가 발생했습니다.", 500);
  }
}
